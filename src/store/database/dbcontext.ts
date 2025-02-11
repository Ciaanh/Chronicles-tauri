import { Database } from "neutron-db";
import { Schema } from "neutron-db/lib/types";

type TablesList = {
    events: string;
    characters: string;
    factions: string;
    collections: string;
    locales: string;
    chapters: string;
};

export const tableNames: TablesList = {
    events: "events",
    characters: "characters",
    factions: "factions",
    collections: "collections",
    locales: "locales",
    chapters: "chapters",
};

export function dbContext(loadingSource: string): Database {
    const dbSchema: Schema = {
        collection: "ChroniclesDB",
        tables: [
            tableNames.events,
            tableNames.characters,
            tableNames.factions,
            tableNames.collections,
            tableNames.locales,
            tableNames.chapters,
        ],
        location: loadingSource,
        oneIndexed: true,
    };

    return new Database(dbSchema);
}
