import { dirname, join, normalize } from "@tauri-apps/api/path";
import { Tables, DbObject, Schema } from "./types";

import {
    exists,
    lstat,
    mkdir,
    readTextFile,
    writeTextFile,
} from "@tauri-apps/plugin-fs";

export class Database {
    private static readonly DEFAULT_WRITE_DEBOUNCE_MS = 150;
    private static readonly DEFAULT_AUTO_SAVE_INTERVAL_MS = 5000;

    public static async create(schema: Schema): Promise<Database> {
        if (!schema.location || schema.location === "") {
            throw new Error("Database location not provided!");
        }
        let dbdirectory = "";
        let dbpath = "";

        if (await exists(schema.location)) {
            const metadata = await lstat(schema.location);

            if (metadata.isDirectory) {
                dbdirectory = await normalize(schema.location);
                dbpath = await join(dbdirectory, schema.dbname + ".json");
            } else if (metadata.isFile) {
                dbpath = await normalize(schema.location);
                dbdirectory = await dirname(dbpath);
            } else {
                throw new Error("Database location not found!");
            }
        } else {
            const normalizedLocation = await normalize(schema.location);
            if (normalizedLocation.toLowerCase().endsWith(".json")) {
                dbpath = normalizedLocation;
                dbdirectory = await dirname(dbpath);
            } else {
                dbdirectory = normalizedLocation;
                dbpath = await join(dbdirectory, schema.dbname + ".json");
            }

            if (!(await exists(dbdirectory))) {
                await mkdir(dbdirectory, { recursive: true });
            }
        }

        const db = new Database(schema, dbpath);
        await db.initdb();
        db.startAutoSaveTimer();

        return db;
    }

    private readonly schema: Schema;
    private readonly dbpath: string;
    private memoryDb: Tables | null = null;
    private tableIndexes = new Map<string, Map<number, DbObject>>();
    private dirty = false;
    private pendingWriteTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingWritePromise: Promise<void> | null = null;
    private pendingWriteResolvers: Array<() => void> = [];
    private pendingWriteRejecters: Array<(reason?: unknown) => void> = [];
    private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

    private constructor(schema: Schema, dbpath: string) {
        this.schema = schema;
        this.dbpath = dbpath;
    }

    //////////////////////////////////////////
    //////////////////////////////////////////

    private async dbExists(): Promise<boolean> {
        return await exists(this.dbpath);
    }

    private tableExists(table: string, db: Tables): boolean {
        return this.schema.tables.includes(table) && db.hasOwnProperty(table);
    }

    private async ensureLoaded(): Promise<Tables> {
        if (this.memoryDb !== null) {
            return this.memoryDb;
        }

        this.memoryDb = await this.loadDatabaseFromDisk();
        this.rebuildIndexes();

        return this.memoryDb;
    }

    private rebuildIndexes(): void {
        if (!this.memoryDb) return;

        this.tableIndexes.clear();
        this.schema.tables.forEach((tableName) => {
            const rows = this.memoryDb?.[tableName] ?? [];
            const index = new Map<number, DbObject>();
            rows.forEach((row) => index.set(row.id, row));
            this.tableIndexes.set(tableName, index);
        });
    }

    private rebuildIndexForTable(tablename: string): void {
        if (!this.memoryDb || !this.memoryDb[tablename]) return;

        const index = new Map<number, DbObject>();
        this.memoryDb[tablename].forEach((row) => index.set(row.id, row));
        this.tableIndexes.set(tablename, index);
    }

    private async initdb(): Promise<void> {
        if (await this.dbExists()) {
            return;
        }

        try {
            const database: Tables = {};

            this.schema.tables.forEach((table) => {
                database[table] = [];
            });

            const jsondb = JSON.stringify(database, null, 2);
            await writeTextFile(this.dbpath, jsondb);
            this.memoryDb = database;
            this.rebuildIndexes();
        } catch (err: unknown) {
            throw new Error(
                `Error creating database. ${this.errorToString(err)}`
            );
        }
    }

    private async loadDatabaseFromDisk(): Promise<Tables> {
        try {
            const json = await readTextFile(this.dbpath);
            return JSON.parse(json) as Tables;
        } catch (err: unknown) {
            throw new Error(`Error reading database. ${this.errorToString(err)}`);
        }
    }

    private async saveDatabaseToDisk(database: Tables): Promise<void> {
        try {
            let jsondb = "";
            if (this.schema.compressedJson) {
                jsondb = JSON.stringify(database, null, 0);
            } else {
                jsondb = JSON.stringify(database, null, 2);
            }

            await writeTextFile(this.dbpath, jsondb);
        } catch (err: unknown) {
            throw new Error(`Error writing object. ${this.errorToString(err)}`);
        }
    }

    private getMaxId<T extends DbObject>(table: T[]): number | null {
        const maxId =
            table.length > 0 ? Math.max(...table.map((c) => c.id)) : null;
        return maxId;
    }

    private getWriteDebounceMs(): number {
        return this.schema.writeDebounceMs ?? Database.DEFAULT_WRITE_DEBOUNCE_MS;
    }

    private getAutoSaveIntervalMs(): number {
        return (
            this.schema.autoSaveIntervalMs ??
            Database.DEFAULT_AUTO_SAVE_INTERVAL_MS
        );
    }

    private errorToString(err: unknown): string {
        return err instanceof Error ? err.message : String(err);
    }

    private startAutoSaveTimer(): void {
        const intervalMs = this.getAutoSaveIntervalMs();
        if (intervalMs <= 0 || this.autoSaveTimer) {
            return;
        }

        this.autoSaveTimer = setInterval(() => {
            void this.flushDirtyToDisk();
        }, intervalMs);
    }

    private scheduleSave(): Promise<void> {
        this.dirty = true;
        const debounceMs = this.getWriteDebounceMs();

        if (debounceMs <= 0) {
            return Promise.resolve();
        }

        if (!this.pendingWritePromise) {
            this.pendingWritePromise = new Promise<void>((resolve, reject) => {
                this.pendingWriteResolvers.push(resolve);
                this.pendingWriteRejecters.push(reject);
            });
        }

        if (this.pendingWriteTimer) {
            clearTimeout(this.pendingWriteTimer);
        }

        this.pendingWriteTimer = setTimeout(async () => {
            try {
                await this.flushDirtyToDisk();
                this.pendingWriteResolvers.forEach((resolve) => resolve());
            } catch (err) {
                this.pendingWriteRejecters.forEach((reject) => reject(err));
            } finally {
                this.pendingWriteTimer = null;
                this.pendingWritePromise = null;
                this.pendingWriteResolvers = [];
                this.pendingWriteRejecters = [];
            }
        }, debounceMs);

        return this.pendingWritePromise;
    }

    private async flushDirtyToDisk(): Promise<void> {
        if (!this.dirty || !this.memoryDb) {
            return;
        }

        await this.saveDatabaseToDisk(this.memoryDb);
        this.dirty = false;
    }

    //////////////////////////////////////////
    //////////////////////////////////////////

    public async insert<T extends DbObject>(
        row: T,
        tablename: string
    ): Promise<T> {
        const database = await this.ensureLoaded();

        if (this.tableExists(tablename, database)) {
            const table = database[tablename];

            if (row.id === -1) {
                const maxId = this.getMaxId(table);
                const nextId = maxId === null
                        ? this.schema.oneIndexed
                            ? 1
                            : 0
                        : maxId + 1;

                row.id = nextId;
            }
            table.push(row);

            database[tablename] = table;
            this.tableIndexes.get(tablename)?.set(row.id, row);
            await this.scheduleSave();
            return row;
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async getAll<T extends DbObject>(
        tablename: string,
        filter:
            | ((value: T, index?: number, Array?: T[]) => boolean)
            | null = null
    ): Promise<T[]> {
        const database = await this.ensureLoaded();

        if (this.tableExists(tablename, database)) {
            try {
                const table = database[tablename];
                if (filter) {
                    return (table as T[]).filter(filter);
                }
                return table as T[];
            } catch (err: unknown) {
                throw new Error(`Error reading table. ${this.errorToString(err)}`);
            }
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async get<T extends DbObject>(
        id: number,
        tablename: string
    ): Promise<T | null> {
        const database = await this.ensureLoaded();

        if (this.tableExists(tablename, database)) {
            const row = this.tableIndexes.get(tablename)?.get(id);
            return (row as T) ?? null;
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async delete(id: number, tablename: string): Promise<void> {
        const database = await this.ensureLoaded();

        if (this.tableExists(tablename, database)) {
            const table = database[tablename];

            const rows = table.filter((row) => row.id === id);
            if (rows.length > 1) {
                throw new Error(`More than one row with id ${id} found!`);
            } else if (rows.length === 1) {
                const index = table.indexOf(rows[0]);
                table.splice(index, 1);
                database[tablename] = table;

                this.rebuildIndexForTable(tablename);
                await this.scheduleSave();
            }
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async update<T extends DbObject>(
        row: T,
        tablename: string
    ): Promise<T | null> {
        const database = await this.ensureLoaded();

        if (this.tableExists(tablename, database)) {
            const table = database[tablename];

            const rows = table.filter(
                (existingrow) => existingrow.id === row.id
            );
            if (rows.length > 1) {
                throw new Error(`More than one row with id ${row.id} found!`);
            } else if (rows.length === 1) {
                const index = table.indexOf(rows[0]);
                table[index] = row;
                database[tablename] = table;

                this.tableIndexes.get(tablename)?.set(row.id, row);
                await this.scheduleSave();

                const getRows = table.filter(
                    (existingrow) => existingrow.id === row.id
                );
                if (getRows.length > 1) {
                    throw new Error(
                        `More than one row with id ${row.id} found!`
                    );
                } else if (getRows.length === 1) {
                    return getRows[0] as T;
                } else {
                    throw new Error(`Row with id ${row.id} not found!`);
                }
            } else {
                throw new Error(`Row with id ${row.id} not found!`);
            }
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async clear(tablename: string): Promise<void> {
        const database = await this.ensureLoaded();

        if (this.tableExists(tablename, database)) {
            database[tablename] = [];
            this.tableIndexes.set(tablename, new Map<number, DbObject>());
            await this.scheduleSave();
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async count(tablename: string): Promise<number> {
        const database = await this.ensureLoaded();

        if (this.tableExists(tablename, database)) {
            return database[tablename].length;
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }
}
