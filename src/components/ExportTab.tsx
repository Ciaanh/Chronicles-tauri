import { useState, useContext } from "react";
import { Button, Divider, Space, Typography } from "antd";
import useMessage from "antd/es/message/useMessage";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { AddonGenerator, GenerationRequest } from "../app/addon/generator";
import { dbRepository, tableNames } from "../database/dbcontext";
import { fileApi } from "../_utils/files/fileApi";
import {
    DB_Character,
    DB_Collection,
    DB_Event,
    DB_Faction,
    DB_Locale,
} from "../database/models";
import { Language } from "../constants";

function toCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) =>
        `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [
        headers.join(","),
        ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
    ].join("\n");
}

const ExportTab: React.FC = () => {
    const [exporting, setExporting] = useState(false);
    const [csvExporting, setCsvExporting] = useState<string | null>(null);
    const dbContext = useContext(dbRepository);
    const [messageApi, contextHolder] = useMessage();

    const handleExport = async () => {
        setExporting(true);
        try {
            const collections = await dbContext.mappers.collections.mapFromDbArray(await dbContext.getAll(tableNames.collections));
            const events = await dbContext.mappers.events.mapFromDbArray(await dbContext.getAll(tableNames.events));
            const factions = await dbContext.mappers.factions.mapFromDbArray(await dbContext.getAll(tableNames.factions));
            const characters = await dbContext.mappers.characters.mapFromDbArray(await dbContext.getAll(tableNames.characters));

            const request: GenerationRequest = {
                collections,
                events,
                factions,
                characters,
            };
            await new AddonGenerator().Create(request, fileApi);
            messageApi.success("Export completed! ZIP file will be saved.");
        } catch (e) {
            console.error("Export failed:", e);
            messageApi.error("Export failed: " + (e as Error).message);
        } finally {
            setExporting(false);
        }
    };

    const handleCsvExport = async (table: string) => {
        setCsvExporting(table);
        try {
            let rows: Record<string, unknown>[] = [];

            if (table === tableNames.events) {
                const data = (await dbContext.getAll(tableNames.events)) as DB_Event[];
                rows = data.map((e) => ({
                    id: e.id,
                    name: e.name,
                    yearStart: e.yearStart,
                    yearEnd: e.yearEnd,
                    eventType: e.eventType,
                    timeline: e.timeline,
                    collectionId: e.collectionId,
                    link: e.link,
                }));
            } else if (table === tableNames.characters) {
                const data = (await dbContext.getAll(tableNames.characters)) as DB_Character[];
                rows = data.map((c) => ({
                    id: c.id,
                    name: c.name,
                    author: c.author,
                    timeline: c.timeline,
                    collectionId: c.collectionId,
                }));
            } else if (table === tableNames.factions) {
                const data = (await dbContext.getAll(tableNames.factions)) as DB_Faction[];
                rows = data.map((f) => ({
                    id: f.id,
                    name: f.name,
                    author: f.author,
                    timeline: f.timeline,
                    collectionId: f.collectionId,
                }));
            } else if (table === tableNames.collections) {
                const data = (await dbContext.getAll(tableNames.collections)) as DB_Collection[];
                rows = data.map((c) => ({
                    id: c.id,
                    name: c.name,
                }));
            } else if (table === tableNames.locales) {
                const data = (await dbContext.getAll(tableNames.locales)) as DB_Locale[];
                rows = data.map((l) => ({
                    id: l.id,
                    enUS: l.enUS,
                    ishtml: l.ishtml,
                    ...Object.fromEntries(
                        Object.values(Language).map((lang) => [
                            lang,
                            l.translations?.[lang] ?? "",
                        ])
                    ),
                }));
            }

            const destPath = await save({
                defaultPath: `${table}.csv`,
                filters: [{ name: "CSV", extensions: ["csv"] }],
            });
            if (!destPath) return;
            await writeTextFile(destPath, toCsv(rows));
            messageApi.success(`${table}.csv saved.`);
        } catch (e) {
            console.error("CSV export failed:", e);
            messageApi.error("CSV export failed: " + (e as Error).message);
        } finally {
            setCsvExporting(null);
        }
    };

    return (
        <div style={{ padding: 24 }}>
            {contextHolder}
            <Typography.Title level={3}>Export Addon Data</Typography.Title>
            <Typography.Paragraph>
                Generate and download the WoW Chronicles addon files (Lua/XML) for your collections.
            </Typography.Paragraph>
            <Button type="primary" loading={exporting} onClick={handleExport}>
                Export Addon Files
            </Button>

            <Divider />

            <Typography.Title level={4}>Export CSV</Typography.Title>
            <Typography.Paragraph>
                Export individual tables as CSV files for spreadsheet use.
            </Typography.Paragraph>
            <Space wrap>
                {[
                    tableNames.events,
                    tableNames.characters,
                    tableNames.factions,
                    tableNames.collections,
                    tableNames.locales,
                ].map((table) => (
                    <Button
                        key={table}
                        loading={csvExporting === table}
                        disabled={csvExporting !== null && csvExporting !== table}
                        onClick={() => handleCsvExport(table)}
                    >
                        Export {table} CSV
                    </Button>
                ))}
            </Space>
        </div>
    );
};

export default ExportTab;
