import { PropsWithChildren } from "react";
import { BrowserRouter } from "react-router-dom";

import { tableNames } from "./database/dbcontext";
import { dbSchema, DbProvider } from "./database/dbprovider";

const schema: dbSchema = {
    dbname: "ChroniclesDB",
    tables: [
        tableNames.events,
        tableNames.characters,
        tableNames.factions,
        tableNames.collections,
        tableNames.locales,
        tableNames.chapters,
    ],
    location: undefined,
};

export default function Providers({ children }: PropsWithChildren) {
    return (
        <DbProvider dbschema={schema}>
            <BrowserRouter>{children}</BrowserRouter>
        </DbProvider>
    );
}
