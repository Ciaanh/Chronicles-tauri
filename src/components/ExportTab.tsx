import { useState, useContext } from "react";
import { Button, Typography } from "antd";
import useMessage from "antd/es/message/useMessage";
import { AddonGenerator, GenerationRequest } from "../app/addon/generator";
import { dbRepository, tableNames } from "../database/dbcontext";
import { fileApi } from "../_utils/files/fileApi";

const ExportTab: React.FC = () => {
    const [exporting, setExporting] = useState(false);
    const dbContext = useContext(dbRepository);
    const [messageApi, contextHolder] = useMessage();

    const handleExport = async () => {
        setExporting(true);
        try {
            // Gather all collections, events, factions, characters from the DB (async)
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
            new AddonGenerator().Create(request, fileApi);
            messageApi.success("Export completed! ZIP file will be saved.");
        } catch (e) {
            messageApi.error("Export failed: " + (e as Error).message);
        } finally {
            setExporting(false);
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
        </div>
    );
};

export default ExportTab;
