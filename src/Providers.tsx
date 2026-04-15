import { PropsWithChildren } from "react";
import { BrowserRouter } from "react-router-dom";

import { tableNames } from "./database/dbcontext";
import { dbSchema, DbProvider } from "./database/dbprovider";
import { ConfigProvider, theme, App } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./useTheme";

const schema: dbSchema = {
    dbname: "ChroniclesDB",
    tables: [
        tableNames.events,
        tableNames.characters,
        tableNames.factions,
        tableNames.collections,
        tableNames.locales,
    ],
    writeDebounceMs: 150,
    autoSaveIntervalMs: 5000,
    location: undefined,
};

export default function Providers({ children }: PropsWithChildren) {
    return (
        <ThemeProvider>
            <ThemedApp>{children}</ThemedApp>
        </ThemeProvider>
    );
}

function ThemedApp({ children }: PropsWithChildren) {
    const { darkMode } = useTheme();
    return (
        <ConfigProvider
            theme={{
                algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                hashed: false,
            }}
            compatible
        >
            <StyleProvider hashPriority="high">
                <App>
                    <DbProvider dbschema={schema}>
                        <BrowserRouter>{children}</BrowserRouter>
                    </DbProvider>
                </App>
            </StyleProvider>
        </ConfigProvider>
    );
}
