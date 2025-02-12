import { dirname, join, normalize } from "@tauri-apps/api/path";
import { Tables, DbObject, Schema } from "./types";

// import * as path from "path";
// import * as fs from "fs";

import {
    exists,
    lstat,
    readTextFile,
    writeTextFile,
} from "@tauri-apps/plugin-fs";

export class Database {
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
            // if (!fs.existsSync(this.dbdirectory)) {
            //     fs.mkdirSync(this.dbdirectory, { recursive: true });
            // }
        }

        console.log(`Database path: ${dbpath}`);
        console.log(`Database directory: ${dbdirectory}`);
        console.log(`Database schema: ${schema}`);
        const db = new Database(schema, dbpath, dbdirectory);
        await db.initdb();

        return db;
    }

    private readonly schema: Schema;
    private readonly dbpath: string;
    private readonly dbdirectory: string;

    private constructor(schema: Schema, dbpath: string, dbdirectory: string) {
        this.schema = schema;
        this.dbpath = dbpath;
        this.dbdirectory = dbdirectory;
    }

    //////////////////////////////////////////
    //////////////////////////////////////////

    private async dbExists(): Promise<boolean> {
        return await exists(this.dbpath);
    }

    private tableExists(table: string, db: Tables): boolean {
        return this.schema.tables.includes(table) && db.hasOwnProperty(table);
    }

    private async initdb(): Promise<boolean> {
        if (await this.dbExists()) {
            return false;
        } else {
            try {
                const database: Tables = {};

                this.schema.tables.forEach((table) => {
                    database[table] = [];
                });

                const jsondb = JSON.stringify(database, null, 2);
                writeTextFile(this.dbpath, jsondb);
                return true;
            } catch (err: any) {
                throw new Error(`Error writing object. ${err.toString()}`);
            }
        }
    }

    private async loadDatabase(): Promise<Tables> {
        try {
            const json = await readTextFile(this.dbpath);
            return JSON.parse(json) as Tables;
        } catch (err: any) {
            throw new Error(`Error reading database. ${err.toString()}`);
        }
    }

    private async saveDatabase(database: Tables): Promise<void> {
        try {
            let jsondb = "";
            if (this.schema.compressedJson) {
                jsondb = JSON.stringify(database, null, 0);
            } else {
                jsondb = JSON.stringify(database, null, 2);
            }

            await writeTextFile(this.dbpath, jsondb);
        } catch (err: any) {
            throw new Error(`Error writing object. ${err.toString()}`);
        }
    }

    private getMaxId<T extends DbObject>(table: T[]): number | null {
        return table.length > 0 ? Math.max(...table.map((c) => c.id)) : null;
    }

    //////////////////////////////////////////
    //////////////////////////////////////////

    public async insert<T extends DbObject>(
        row: T,
        tablename: string
    ): Promise<T> {
        const database = await this.loadDatabase();

        if (this.tableExists(tablename, database)) {
            const table = database[tablename];

            if (row.id === undefined || row.id === null || row.id === -1) {
                const maxId = this.getMaxId(table);
                row.id =
                    maxId === null
                        ? this.schema.oneIndexed
                            ? 1
                            : 0
                        : maxId + 1;
            }

            table.push(row);

            database[tablename] = table;
            this.saveDatabase(database);
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
        const database = await this.loadDatabase();

        if (this.tableExists(tablename, database)) {
            try {
                const table = database[tablename];
                if (filter) {
                    return (table as T[]).filter(filter);
                }
                return table as T[];
            } catch (err: any) {
                throw new Error(`Error reading table. ${err.toString()}`);
            }
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async get<T extends DbObject>(
        id: number,
        tablename: string
    ): Promise<T | null> {
        const database = await this.loadDatabase();

        if (this.tableExists(tablename, database)) {
            const table = database[tablename];

            const rows = table.filter((row) => row.id === id);
            if (rows.length > 1) {
                throw new Error(`More than one row with id ${id} found!`);
            } else if (rows.length === 1) {
                return rows[0] as T;
            } else {
                return null;
            }
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async delete(id: number, tablename: string): Promise<void> {
        const database = await this.loadDatabase();

        if (this.tableExists(tablename, database)) {
            const table = database[tablename];

            const rows = table.filter((row) => row.id === id);
            if (rows.length > 1) {
                throw new Error(`More than one row with id ${id} found!`);
            } else if (rows.length === 1) {
                const index = table.indexOf(rows[0]);
                table.splice(index, 1);
                database[tablename] = table;

                this.saveDatabase(database);
            }
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async update<T extends DbObject>(
        row: T,
        tablename: string
    ): Promise<T | null> {
        const database = await this.loadDatabase();

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

                this.saveDatabase(database);

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
        const database = await this.loadDatabase();

        if (this.tableExists(tablename, database)) {
            database[tablename] = [];
            this.saveDatabase(database);
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }

    public async count(tablename: string): Promise<number> {
        const database = await this.loadDatabase();

        if (this.tableExists(tablename, database)) {
            return database[tablename].length;
        } else {
            throw new Error(`Table "${tablename}" doesn't exist!`);
        }
    }
}
