import { useState, useContext, useEffect } from "react";
import { Button, Typography, Checkbox, Card, Row, Col, Space } from "antd";
import useMessage from "antd/es/message/useMessage";
import { AddonGenerator, GenerationRequest } from "../app/addon/generator";
import { dbRepository, tableNames } from "../database/dbcontext";
import { fileApi } from "../_utils/files/fileApi";
import { Collection } from "../database/models/appObjects/Collection";

const ExportTab: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<number[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const dbContext = useContext(dbRepository);
  const [messageApi, contextHolder] = useMessage();

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoadingCollections(true);
      const collections = await dbContext.mappers.collections.mapFromDbArray(
        await dbContext.getAll(tableNames.collections),
      );
      setAllCollections(collections);
      // Select all collections by default
      setSelectedCollections(collections.map((c) => c.id));
    } catch (error) {
      console.error("Failed to load collections:", error);
      messageApi.error("Failed to load collections");
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleCollectionChange = (collectionId: number, checked: boolean) => {
    setSelectedCollections((prev) => {
      if (checked) {
        return [...prev, collectionId];
      } else {
        return prev.filter((id) => id !== collectionId);
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedCollections(allCollections.map((c) => c.id));
  };

  const handleSelectNone = () => {
    setSelectedCollections([]);
  };

  const handleExport = async () => {
    if (selectedCollections.length === 0) {
      messageApi.warning("Please select at least one collection to export.");
      return;
    }

    setExporting(true);
    try {
      // Gather all collections, events, factions, characters from the DB (async)
      const allCollectionsData =
        await dbContext.mappers.collections.mapFromDbArray(
          await dbContext.getAll(tableNames.collections),
        );
      const allEvents = await dbContext.mappers.events.mapFromDbArray(
        await dbContext.getAll(tableNames.events),
      );
      const allFactions = await dbContext.mappers.factions.mapFromDbArray(
        await dbContext.getAll(tableNames.factions),
      );
      const allCharacters = await dbContext.mappers.characters.mapFromDbArray(
        await dbContext.getAll(tableNames.characters),
      );

      // Filter to only include selected collections and their related data
      const selectedCollectionsData = allCollectionsData.filter((c) =>
        selectedCollections.includes(c.id),
      );
      const selectedEvents = allEvents.filter(
        (e) => e.collection && selectedCollections.includes(e.collection.id),
      );
      const selectedFactions = allFactions.filter(
        (f) => f.collection && selectedCollections.includes(f.collection.id),
      );
      const selectedCharacters = allCharacters.filter(
        (c) => c.collection && selectedCollections.includes(c.collection.id),
      );

      const request: GenerationRequest = {
        collections: selectedCollectionsData,
        events: selectedEvents,
        factions: selectedFactions,
        characters: selectedCharacters,
      };

      new AddonGenerator().Create(request, fileApi);
      messageApi.success(
        `Export completed! Exported ${selectedCollectionsData.length} collection(s). ZIP file will be saved.`,
      );
    } catch (e) {
      console.error("Export failed:", e);
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
        Generate and download the WoW Chronicles addon files (Lua/XML) for your
        selected collections.
      </Typography.Paragraph>

      <Card title="Select Collections to Export" style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 16 }}>
          <Button size="small" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button size="small" onClick={handleSelectNone}>
            Select None
          </Button>
          <Typography.Text type="secondary">
            {selectedCollections.length} of {allCollections.length} collections
            selected
          </Typography.Text>
        </Space>

        <Row gutter={[16, 16]}>
          {allCollections.map((collection) => (
            <Col key={collection.id} span={8}>
              <Card
                size="small"
                style={{
                  border: selectedCollections.includes(collection.id)
                    ? "2px solid #1890ff"
                    : "1px solid #d9d9d9",
                  cursor: "pointer",
                }}
                onClick={() =>
                  handleCollectionChange(
                    collection.id,
                    !selectedCollections.includes(collection.id),
                  )
                }
              >
                <Checkbox
                  checked={selectedCollections.includes(collection.id)}
                  onChange={(e) =>
                    handleCollectionChange(collection.id, e.target.checked)
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  {collection.name}
                </Checkbox>
              </Card>
            </Col>
          ))}
        </Row>

        {allCollections.length === 0 && !loadingCollections && (
          <Typography.Text type="secondary">
            No collections found. Create some collections first.
          </Typography.Text>
        )}
      </Card>

      <Button
        type="primary"
        size="large"
        loading={exporting}
        onClick={handleExport}
        disabled={selectedCollections.length === 0}
      >
        Export Selected Collections ({selectedCollections.length})
      </Button>
    </div>
  );
};

export default ExportTab;
