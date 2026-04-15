/**
 * Browser-compatible AsyncDatabase that replaces neutron-db.
 * Uses @tauri-apps/plugin-fs for all file I/O so it works inside the
 * Tauri WebView (Node's `path` / `fs` modules are not available there).
 *
 * API surface is intentionally identical to neutron-db's AsyncDatabase so
 * dbprovider.tsx needs no structural changes.
 */
import { exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { DbObject, Schema, Tables } from "./types";

type TableData = Map<number, DbObject>;

export class AsyncDatabase {
    private schema: Schema;
    private dbpath: string;
    private tables: Map<string, TableData>;
    private nextIds: Map<string, number>;
    private dirty = false;
    private pendingWriteTimer: ReturnType<typeof setTimeout> | null = null;
    private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

    private constructor(
        schema: Schema,
        dbpath: string,
        tables: Map<string, TableData>,
        nextIds: Map<string, number>
    ) {
        this.schema = schema;
        this.dbpath = dbpath;
        this.tables = tables;
        this.nextIds = nextIds;
    }

    /**
     * Create (or open) a database.
     * `schema.location` must already be the resolved `.json` file path —
     * callers should use `resolveDbPath()` in dbprovider.tsx before calling
     * this method.
     */
    static async create(schema: Schema): Promise<AsyncDatabase> {
        const dbpath = schema.location;

        const tables = new Map<string, TableData>();
        const nextIds = new Map<string, number>();
        for (const table of schema.tables) {
            tables.set(table, new Map());
            nextIds.set(table, schema.oneIndexed ? 1 : 0);
        }

        if (await exists(dbpath)) {
            const json = await readTextFile(dbpath);
            const data = JSON.parse(json) as Tables;

            // Validate structure
            for (const table of schema.tables) {
                if (!Object.prototype.hasOwnProperty.call(data, table)) {
                    throw new Error(`Database file missing required table: ${table}`);
                }
                if (!Array.isArray(data[table])) {
                    throw new Error(`Database table ${table} is not an array`);
                }
            }

            for (const table of schema.tables) {
                const tableMap = new Map<number, DbObject>();
                let maxId = schema.oneIndexed ? 0 : -1;
                for (const [index, row] of data[table].entries()) {
                    if (typeof row.id !== "number") {
                        throw new Error(
                            `Row ${index} in table "${table}" has missing or non-numeric 'id' (got ${JSON.stringify((row as unknown as Record<string, unknown>).id)})`
                        );
                    }
                    tableMap.set(row.id, row);
                    if (row.id > maxId) maxId = row.id;
                }
                tables.set(table, tableMap);
                nextIds.set(table, maxId + 1);
            }
        }

        const db = new AsyncDatabase(schema, dbpath, tables, nextIds);
        db.startAutoSaveTimer();
        return db;
    }

    async getAll<T extends DbObject>(tableName: string): Promise<T[]> {
        return Array.from(this.tables.get(tableName)?.values() ?? []) as T[];
    }

    async get<T extends DbObject>(id: number, tableName: string): Promise<T | null> {
        return (this.tables.get(tableName)?.get(id) as T) ?? null;
    }

    async insert<T extends DbObject>(row: T, tableName: string): Promise<T | null> {
        const table = this.tables.get(tableName);
        if (!table) return null;
        const id = this.nextIds.get(tableName) ?? 1;
        const newRow = { ...row, id } as T;
        table.set(id, newRow);
        this.nextIds.set(tableName, id + 1);
        this.dirty = true;
        this.scheduleWrite();
        return newRow;
    }

    async update<T extends DbObject>(row: T, tableName: string): Promise<T | null> {
        const table = this.tables.get(tableName);
        if (!table || !table.has(row.id)) return null;
        table.set(row.id, row);
        this.dirty = true;
        this.scheduleWrite();
        return row;
    }

    async delete(id: number, tableName: string): Promise<void> {
        this.tables.get(tableName)?.delete(id);
        this.dirty = true;
        this.scheduleWrite();
    }

    /** Force an immediate write of dirty data to disk. */
    async flush(): Promise<void> {
        if (!this.dirty) return;
        const data: Record<string, DbObject[]> = {};
        for (const [table, rows] of this.tables) {
            data[table] = Array.from(rows.values());
        }
        const json = this.schema.compressedJson
            ? JSON.stringify(data)
            : JSON.stringify(data, null, 4);
        await writeTextFile(this.dbpath, json);
        this.dirty = false;
    }

    /** Cancel timers and flush any pending writes synchronously. */
    async dispose(): Promise<void> {
        if (this.pendingWriteTimer !== null) {
            clearTimeout(this.pendingWriteTimer);
            this.pendingWriteTimer = null;
        }
        if (this.autoSaveTimer !== null) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        await this.flush();
    }

    private scheduleWrite(): void {
        if (this.pendingWriteTimer !== null) {
            clearTimeout(this.pendingWriteTimer);
        }
        const delay = this.schema.writeDebounceMs ?? 0;
        this.pendingWriteTimer = setTimeout(() => {
            this.pendingWriteTimer = null;
            this.flush().catch(console.error);
        }, delay);
    }

    private startAutoSaveTimer(): void {
        if (!this.schema.autoSaveIntervalMs) return;
        this.autoSaveTimer = setInterval(() => {
            if (this.dirty) {
                this.flush().catch(console.error);
            }
        }, this.schema.autoSaveIntervalMs);
    }
}
