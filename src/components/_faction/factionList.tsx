import { useState, useContext, useEffect, useRef } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Character, DB_Event, DB_Faction, Faction } from "../../database/models";
import { App, Button, Input, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import FactionModal from "./FactionModal";
import { FactionModalFormValues } from "./FactionModal";
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
    const [search, setSearch] = useState("");
    const dbContext = useContext(dbRepository);
    const { message, modal } = App.useApp();
    const pendingDeletes = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

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

    useEffect(() => {
        const pending = pendingDeletes.current;
        return () => {
            pending.forEach((timeout) => clearTimeout(timeout));
        };
    }, []);

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
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteFaction(record)}
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

    async function deleteFaction(factionId: number, name: string, snapshot: Faction) {
        setFactions((prev) => prev.filter((f) => f.id !== factionId));
        const timeout = setTimeout(async () => {
            pendingDeletes.current.delete(factionId);
            setLoading(true);
            try {
                await dbContext.remove(factionId, tableNames.factions);
            } finally {
                setLoading(false);
            }
        }, 5000);
        pendingDeletes.current.set(factionId, timeout);
        message.open({
            key: `delete-faction-${factionId}`,
            type: "success",
            duration: 5,
            content: (
                <span>
                    Faction &ldquo;{name}&rdquo; deleted.{" "}
                    <Button
                        type="link"
                        size="small"
                        onClick={() => undoDeleteFaction(factionId, snapshot)}
                    >
                        Undo
                    </Button>
                </span>
            ),
        });
    }

    function undoDeleteFaction(factionId: number, faction: Faction) {
        const timeout = pendingDeletes.current.get(factionId);
        if (timeout) {
            clearTimeout(timeout);
            pendingDeletes.current.delete(factionId);
        }
        setFactions((prev) => sortedFactions([...prev, faction]));
        message.destroy(`delete-faction-${factionId}`);
    }

    async function handleDeleteFaction(faction: Faction) {
        const [allEvents, allCharacters] = await Promise.all([
            dbContext.getAll(tableNames.events),
            dbContext.getAll(tableNames.characters),
        ]);

        const referencingEvents = (allEvents as DB_Event[]).filter(
            (e) =>
                Array.isArray(e.factionIds) && e.factionIds.includes(faction.id)
        );
        const referencingChars = (allCharacters as DB_Character[]).filter(
            (c) =>
                Array.isArray(c.factionIds) && c.factionIds.includes(faction.id)
        );
        const totalRefs = referencingEvents.length + referencingChars.length;

        const doDelete = () => deleteFaction(faction.id, faction.name, faction);

        if (totalRefs > 0) {
            const parts: string[] = [];
            if (referencingEvents.length > 0)
                parts.push(`${referencingEvents.length} event(s)`);
            if (referencingChars.length > 0)
                parts.push(`${referencingChars.length} character(s)`);
            modal.confirm({
                title: "Delete faction and clean references?",
                content: `"${faction.name}" is referenced by ${parts.join(" and ")}. Remove all references and delete?`,
                okText: "Delete and clean",
                okButtonProps: { danger: true },
                onOk: async () => {
                    for (const ev of referencingEvents) {
                        await dbContext.update(
                            {
                                ...ev,
                                factionIds: ev.factionIds.filter(
                                    (id) => id !== faction.id
                                ),
                            },
                            tableNames.events
                        );
                    }
                    for (const ch of referencingChars) {
                        await dbContext.update(
                            {
                                ...ch,
                                factionIds: ch.factionIds.filter(
                                    (id) => id !== faction.id
                                ),
                            },
                            tableNames.characters
                        );
                    }
                    doDelete();
                },
            });
            return;
        }

        modal.confirm({
            title: "Delete faction",
            content: `Are you sure you want to delete "${faction.name}"?`,
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: doDelete,
        });
    }

    async function addFaction() {
        setEditingFaction(null);
        setIsModalVisible(true);
    }

    function handleEditFaction(faction: Faction) {
        setEditingFaction(faction);
        setIsModalVisible(true);
    }
    const handleModalOk = async (values: FactionModalFormValues) => {
        setModalLoading(true);
        try {
            // Use the centralized LocaleUtils to create or update the label
            const label = await LocaleUtils.createOrUpdateLocale(
                values.label,
                dbContext
            );
            let chapters = Array.isArray(values.chapters)
                ? values.chapters
                : [];

            for (let i = 0; i < chapters.length; i++) {
                chapters[i] = await LocaleUtils.processChapterLocales(
                    chapters[i],
                    dbContext
                );
            }

            const processedChapters = chapters;
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
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            message.error(`Failed to save faction: ${msg}`);
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
                <Button onClick={cleanFactions}>
                    Clean factions
                </Button>

                <Button
                    onClick={reloadFactions}
                    loading={loading}
                >
                    Load factions from DB
                </Button>

                <Input.Search
                    placeholder="Search factions…"
                    allowClear
                    style={{ width: 240 }}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <Button icon={<PlusCircleOutlined />} onClick={addFaction} />
            </Space>

            <Table<Faction>
                rowKey="id"
                columns={columns}
                dataSource={factions.filter((f) =>
                    f.name.toLowerCase().includes(search.toLowerCase())
                )}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} factions` }}
                scroll={{
                    scrollToFirstRowOnChange: false,
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
