import { useState, useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Faction, Faction } from "../../database/models";
import { Button, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import FactionModal from "./FactionModal";
import { LocaleUtils } from "../../_utils/localeUtils";

import {
    DeleteOutlined,
    EditOutlined,
    PlusCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface FactionListProps {
    filters: Filters;
}

const FactionList: React.FC<FactionListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [factions, setFactions] = useState<Faction[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingFaction, setEditingFaction] = useState<Faction | null>(null);
    const dbContext = useContext(dbRepository);
    async function fetchFactions() {
        setLoading(true);
        try {
            const factionList = await dbContext.getAll(tableNames.factions);

            const filteredFactions = factionList.filter((e) => {
                if (filters?.collection === null) return true;
                const faction = e as DB_Faction;
                return filters?.collection?.id === faction.collectionId;
            });

            // Create an array to hold successfully mapped factions
            let successfullyMappedFactions: Faction[] = [];

            // Process each faction individually to handle errors
            for (const factionDb of filteredFactions as DB_Faction[]) {
                try {
                    const mappedFaction =
                        await dbContext.mappers.factions.mapFromDb(factionDb);
                    successfullyMappedFactions.push(mappedFaction);
                } catch (error) {
                    console.error(
                        `Error mapping faction ${
                            factionDb.name || factionDb.id
                        }:`,
                        error
                    );
                }
            }

            setFactions(sortedFactions(successfullyMappedFactions));
        } catch (error) {
            console.error("Error fetching factions:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchFactions();
    }, [filters.collection]);

    const reloadFactions = async () => {
        fetchFactions();
    };

    const cleanFactions = async () => {
        setFactions([]);
    };
    const columns: TableProps<Faction>["columns"] = [
        {
            title: "Name",
            dataIndex: "name",
            width: 180,
            render: (name: string) => (
                <Typography.Text
                    ellipsis
                    style={{ maxWidth: 220, display: "block" }}
                >
                    {name}
                </Typography.Text>
            ),
        },
        {
            title: "",
            dataIndex: "",
            key: "action",
            fixed: "right",
            width: 20,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<EditOutlined />}
                        onClick={() => handleEditFaction(record)}
                    />
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteFaction(record.id)}
                    />
                </Space>
            ),
        },
    ];

    const selectedCollection = filters?.collection?.name
        ? `Displaying factions for the collection : ${filters?.collection?.name}`
        : "";

    function sortedFactions(factionList: Faction[]) {
        return factionList.sort((a, b) => {
            if (a.name && b.name) {
                return a.name.localeCompare(b.name);
            }
            return 0;
        });
    }

    async function deleteFaction(factionId: number) {
        setLoading(true);
        try {
            await dbContext.remove(factionId, tableNames.factions);
            fetchFactions();
        } finally {
            setLoading(false);
        }
    }

    async function addFaction() {
        setEditingFaction(null);
        setIsModalVisible(true);
    }

    function handleEditFaction(faction: Faction) {
        setEditingFaction(faction);
        setIsModalVisible(true);
    }
    const handleModalOk = async (values: any) => {
        setModalLoading(true);
        try {
            // Use the centralized LocaleUtils to create or update the label
            const label = await LocaleUtils.createOrUpdateLocale(
                values.label,
                dbContext
            );

            // Process chapters
            const processedChapters = await Promise.all(
                values.chapters?.map(async (chapter: any) => {
                    const header = chapter.header
                        ? await LocaleUtils.createOrUpdateLocale(
                              chapter.header,
                              dbContext
                          )
                        : null;

                    const pages = await Promise.all(
                        chapter.pages.map(
                            async (page: any) =>
                                await LocaleUtils.createOrUpdateLocale(
                                    page,
                                    dbContext
                                )
                        )
                    );

                    return {
                        header,
                        pages,
                    };
                }) || []
            );
            if (editingFaction) {
                // Update existing faction
                const updatedFaction = {
                    ...editingFaction,
                    id: editingFaction.id,
                    name: values.name,
                    author: values.author,
                    chapters: processedChapters,
                    label: label,
                    timeline: values.timeline,
                    collection: values.collection,
                };
                await dbContext.update(
                    dbContext.mappers.factions.map(updatedFaction),
                    tableNames.factions
                );
            } else {
                // Add new faction
                const newFaction: Faction = {
                    name: values.name,
                    author: values.author,
                    chapters: processedChapters,
                    label: label,
                    timeline: values.timeline,
                    collection: values.collection,
                    id: -1,
                };
                await dbContext.add(
                    dbContext.mappers.factions.map(newFaction),
                    tableNames.factions
                );
            }
            setIsModalVisible(false);
            setEditingFaction(null);
            fetchFactions();
        } finally {
            setModalLoading(false);
        }
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        setEditingFaction(null);
    };

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
                <Text strong>{selectedCollection}</Text>
            </Space>

            <Space>
                <Button className="bp5-minimal" onClick={cleanFactions}>
                    Clean factions
                </Button>

                <Button
                    className="bp5-minimal"
                    onClick={reloadFactions}
                    loading={loading}
                >
                    Load factions from DB
                </Button>

                <Button icon={<PlusCircleOutlined />} onClick={addFaction} />
            </Space>

            <Table<Faction>
                rowKey="id"
                columns={columns}
                dataSource={factions}
                pagination={false}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
                }}
            />
            <FactionModal
                visible={isModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                confirmLoading={modalLoading}
                factionToEdit={editingFaction ? editingFaction : undefined}
            />
        </Space>
    );
};

export default FactionList;
