import { Database } from "neutron-db";
import { Schema } from "neutron-db/lib/types";

type TablesList = {
    events: string;
    characters: string;
    factions: string;
    dbnames: string;
    locales: string;
    chapters: string;
};

export const tableNames: TablesList = {
    events: "events",
    characters: "characters",
    factions: "factions",
    dbnames: "dbnames",
    locales: "locales",
    chapters: "chapters",
};

export function dbContext(loadingSource: string): Database {
    const dbSchema: Schema = {
        dbname: "ChroniclesDB",
        tables: [
            tableNames.events,
            tableNames.characters,
            tableNames.factions,
            tableNames.dbnames,
            tableNames.locales,
            tableNames.chapters,
        ],
        location: loadingSource,
        oneIndexed: true,
    };

    return new Database(dbSchema);
}
