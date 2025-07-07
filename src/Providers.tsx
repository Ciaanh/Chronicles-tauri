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
  ],
  location: undefined,
};

export default function Providers({ children }: PropsWithChildren) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
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
