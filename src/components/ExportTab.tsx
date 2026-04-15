import { useState, useContext } from "react";
import { Alert, Button, Descriptions, Divider, List, Modal, Space, Typography } from "antd";
import useMessage from "antd/es/message/useMessage";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { AddonGenerator, GenerationRequest } from "../app/addon/generator";
import { dbRepository, tableNames } from "../database/dbcontext";
import { fileApi } from "../_utils/files/fileApi";
import { DB_Character, DB_Collection, DB_Event, DB_Faction, DB_Locale } from "../database/models";
import { Language } from "../constants";
import { Filters } from "./filters";
import { parseChroniclesDb, prepareImport, PreparedImport } from "../_utils/importDb";

function toCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [
        headers.join(","),
        ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
    ].join("\n");
}

const ExportTab: React.FC<{ filters: Filters }> = ({ filters }) => {
    const [exporting, setExporting] = useState(false);
    const [csvExporting, setCsvExporting] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const [pendingImport, setPendingImport] = useState<PreparedImport | null>(null);
    const dbContext = useContext(dbRepository);
    const [messageApi, contextHolder] = useMessage();

    const handleExport = async () => {
        setExporting(true);
        try {
            const allCollections = await dbContext.mappers.collections.mapFromDbArray(
                await dbContext.getAll(tableNames.collections)
            );
            const allEvents = await dbContext.mappers.events.mapFromDbArray(
                await dbContext.getAll(tableNames.events)
            );
            const allFactions = await dbContext.mappers.factions.mapFromDbArray(
                await dbContext.getAll(tableNames.factions)
            );
            const allCharacters = await dbContext.mappers.characters.mapFromDbArray(
                await dbContext.getAll(tableNames.characters)
            );

            const collectionId = filters.collection?.id;
            const collections = collectionId
                ? allCollections.filter((c) => c.id === collectionId)
                : allCollections;
            const events = collectionId
                ? allEvents.filter((e) => e.collection?.id === collectionId)
                : allEvents;
            const factions = collectionId
                ? allFactions.filter((f) => f.collection?.id === collectionId)
                : allFactions;
            const characters = collectionId
                ? allCharacters.filter((c) => c.collection?.id === collectionId)
                : allCharacters;

            const request: GenerationRequest = {
                collections,
                events,
                factions,
                characters,
            };
            const warnings = await new AddonGenerator().Create(request, fileApi);
            if (warnings.length > 0) {
                Modal.warning({
                    title: `Export completed with ${warnings.length} validation warning(s)`,
                    content: (
                        <List
                            size="small"
                            dataSource={warnings}
                            renderItem={(w) => <List.Item>{w}</List.Item>}
                        />
                    ),
                });
            } else {
                messageApi.success("Export completed! ZIP file will be saved.");
            }
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
                        Object.values(Language).map((lang) => [lang, l.translations?.[lang] ?? ""])
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

    const handleImport = async () => {
        setImporting(true);
        try {
            const filePath = await open({
                title: "Select Chronicles DB JSON file",
                filters: [{ name: "JSON", extensions: ["json"] }],
                multiple: false,
                directory: false,
            });
            if (!filePath) return;
            const text = await readTextFile(filePath as string);
            const parsed = parseChroniclesDb(text);
            const prepared = await prepareImport(parsed, dbContext);
            setPendingImport(prepared);
        } catch (e) {
            console.error("Import failed:", e);
            messageApi.error("Import failed: " + (e as Error).message);
        } finally {
            setImporting(false);
        }
    };

    const handleImportConfirm = async () => {
        if (!pendingImport) return;
        try {
            await dbContext.transaction(pendingImport.apply);
            dbContext.load();
            messageApi.success("Import completed successfully.");
        } catch (e) {
            console.error("Import apply failed:", e);
            messageApi.error("Import failed: " + (e as Error).message);
        } finally {
            setPendingImport(null);
        }
    };

    return (
        <div style={{ padding: 24 }}>
            {contextHolder}
            <Typography.Title level={3}>Export Addon Data</Typography.Title>
            <Typography.Paragraph>
                Generate and download the WoW Chronicles addon files (Lua/XML) for your collections.
            </Typography.Paragraph>
            {filters.collection && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`Exporting only collection: "${filters.collection.name}". Clear the collection filter to export all data.`}
                />
            )}
            <Button type="primary" loading={exporting} onClick={handleExport}>
                {filters.collection
                    ? `Export "${filters.collection.name}" Addon Files`
                    : "Export All Addon Files"}
            </Button>

            <Divider />

            <Typography.Title level={4}>Import Database</Typography.Title>
            <Typography.Paragraph>
                Import a Chronicles DB JSON file. All IDs will be re-numbered automatically to avoid
                collisions with existing data.
            </Typography.Paragraph>
            <Button loading={importing} onClick={handleImport}>
                Import Chronicles DB JSON
            </Button>

            <Modal
                open={pendingImport !== null}
                title="Confirm Import"
                okText="Import"
                onOk={handleImportConfirm}
                onCancel={() => setPendingImport(null)}
            >
                <Typography.Paragraph>
                    The following records will be added to your database:
                </Typography.Paragraph>
                <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Collections">
                        {pendingImport?.summary.collections}
                    </Descriptions.Item>
                    <Descriptions.Item label="Events">
                        {pendingImport?.summary.events}
                    </Descriptions.Item>
                    <Descriptions.Item label="Factions">
                        {pendingImport?.summary.factions}
                    </Descriptions.Item>
                    <Descriptions.Item label="Characters">
                        {pendingImport?.summary.characters}
                    </Descriptions.Item>
                    <Descriptions.Item label="Locales">
                        {pendingImport?.summary.locales}
                    </Descriptions.Item>
                </Descriptions>
            </Modal>

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
