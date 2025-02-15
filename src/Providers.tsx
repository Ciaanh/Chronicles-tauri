import { PropsWithChildren } from "react";
import { BrowserRouter } from "react-router-dom";

import { tableNames } from "./database/dbcontext";
import { dbSchema, DbProvider } from "./database/dbprovider";
import { ConfigProvider, theme } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";

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
        <ConfigProvider
            theme={{
                // token: {
                //     colorLink: "#1f82ec",
                //     colorPrimary: "#7793cad9",
                //     colorInfo: "#7793cad9",
                //     colorSuccess: "#9fe27ed9",
                //     colorWarning: "#f9b836d9",
                //     colorError: "#fd5a5dd9",
                //     colorBgBase: "#0e0f10",
                //     borderRadius: 0,
                //     wireframe: true,
                //     colorTextBase: "#c4f4ff"
                //   },
                algorithm: theme.defaultAlgorithm,
                //   algorithm: theme.darkAlgorithm,
                hashed: false,
            }}
        >
            <StyleProvider hashPriority="high">
                <DbProvider dbschema={schema}>
                    <BrowserRouter>{children}</BrowserRouter>
                </DbProvider>
            </StyleProvider>
        </ConfigProvider>
    );
}
