import { describe, it, expect } from "vitest";
import { Tables } from "./types";

/**
 * Extracted validation logic mirrored from Database.validateLoadedDatabase()
 * for unit testing without Tauri FS dependencies.
 */
function validateLoadedDatabase(tables: string[], database: Tables): void {
    tables.forEach((tableName) => {
        if (!Object.prototype.hasOwnProperty.call(database, tableName)) {
            throw new Error(`Database file missing required table: ${tableName}`);
        }
        if (!Array.isArray(database[tableName])) {
            throw new Error(`Database table ${tableName} is not an array`);
        }
        database[tableName].forEach((row, index) => {
            if (typeof row.id !== "number") {
                throw new Error(
                    `Row ${index} in table "${tableName}" has missing or non-numeric 'id' (got ${JSON.stringify(row.id)})`
                );
            }
        });
    });
}

describe("validateLoadedDatabase", () => {
    const tables = ["events", "characters"];

    it("passes a valid database", () => {
        const db: Tables = {
            events: [{ id: 1 }, { id: 2 }],
            characters: [{ id: 10 }],
        };
        expect(() => validateLoadedDatabase(tables, db)).not.toThrow();
    });

    it("throws when a required table is missing", () => {
        const db: Tables = { events: [] };
        expect(() => validateLoadedDatabase(tables, db)).toThrow(
            "missing required table: characters"
        );
    });

    it("throws when a table is not an array", () => {
        const db = { events: [] as unknown, characters: "oops" as unknown } as Tables;
        expect(() => validateLoadedDatabase(tables, db)).toThrow(
            "is not an array"
        );
    });

    it("throws when a row has no id", () => {
        const db = {
            events: [{ id: 1 }, { name: "broken" } as unknown as { id: number }],
            characters: [],
        } as Tables;
        expect(() => validateLoadedDatabase(tables, db)).toThrow(
            'Row 1 in table "events" has missing or non-numeric \'id\''
        );
    });

    it("throws when a row has a string id", () => {
        const db = {
            events: [{ id: "abc" as unknown as number }],
            characters: [],
        } as Tables;
        expect(() => validateLoadedDatabase(tables, db)).toThrow(
            'non-numeric \'id\' (got "abc")'
        );
    });

    it("passes an empty database (all tables empty arrays)", () => {
        const db: Tables = { events: [], characters: [] };
        expect(() => validateLoadedDatabase(tables, db)).not.toThrow();
    });
});
