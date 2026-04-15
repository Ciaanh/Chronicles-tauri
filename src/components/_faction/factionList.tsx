import { useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Character, DB_Event, DB_Faction, Faction } from "../../database/models";
import { App, Button, Space, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import FactionModal, { FactionModalFormValues } from "./FactionModal";
import { LocaleUtils } from "../../_utils/localeUtils";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useEntityCrud } from "../_shared/useEntityCrud";
import { GenericEntityList } from "../_shared/GenericEntityList";

interface FactionListProps {
    filters: Filters;
}

const FactionList: React.FC<FactionListProps> = ({ filters }) => {
    const dbContext = useContext(dbRepository);
    const { message, modal } = App.useApp();

    function sortedFactions(list: Faction[]): Faction[] {
        return [...list].sort((a, b) => a.name?.localeCompare(b.name) ?? 0);
    }

    const {
        loading,
        setLoading,
        items: factions,
        setItems: setFactions,
        isModalVisible,
        modalLoading,
        setModalLoading,
        editingItem: editingFaction,
        search,
        setSearch,
        openAdd,
        openEdit,
        closeModal,
        optimisticDelete,
    } = useEntityCrud<Faction>({
        tableName: tableNames.factions,
        entityLabel: "Faction",
        sortItems: sortedFactions,
    });

    async function fetchFactions() {
        setLoading(true);
        try {
            const factionList = await dbContext.getAll(tableNames.factions);
            const filteredFactions = factionList.filter((e) => {
                if (filters?.collection === null) return true;
                return filters?.collection?.id === (e as DB_Faction).collectionId;
            });
            const successfullyMappedFactions: Faction[] = [];
            for (const factionDb of filteredFactions as DB_Faction[]) {
                try {
                    const mapped = await dbContext.mappers.factions.mapFromDb(factionDb);
                    successfullyMappedFactions.push(mapped);
                } catch (error) {
                    console.error(
                        `Error mapping faction ${factionDb.name || factionDb.id}:`,
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
    }, [filters.collection]); // eslint-disable-line react-hooks/exhaustive-deps

    async function handleDeleteFaction(faction: Faction) {
        const [allEvents, allCharacters] = await Promise.all([
            dbContext.getAll(tableNames.events),
            dbContext.getAll(tableNames.characters),
        ]);
        const referencingEvents = (allEvents as DB_Event[]).filter(
            (e) => Array.isArray(e.factionIds) && e.factionIds.includes(faction.id)
        );
        const referencingChars = (allCharacters as DB_Character[]).filter(
            (c) => Array.isArray(c.factionIds) && c.factionIds.includes(faction.id)
        );
        const totalRefs = referencingEvents.length + referencingChars.length;
        const doDelete = () => optimisticDelete(faction);
        if (totalRefs > 0) {
            const parts: string[] = [];
            if (referencingEvents.length > 0) parts.push(`${referencingEvents.length} event(s)`);
            if (referencingChars.length > 0) parts.push(`${referencingChars.length} character(s)`);
            modal.confirm({
                title: "Delete faction and clean references?",
                content: `"${faction.name}" is referenced by ${parts.join(" and ")}. Remove all references and delete?`,
                okText: "Delete and clean",
                okButtonProps: { danger: true },
                onOk: async () => {
                    for (const ev of referencingEvents) {
                        await dbContext.update(
                            { ...ev, factionIds: ev.factionIds.filter((id) => id !== faction.id) },
                            tableNames.events
                        );
                    }
                    for (const ch of referencingChars) {
                        await dbContext.update(
                            { ...ch, factionIds: ch.factionIds.filter((id) => id !== faction.id) },
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

    const columns: TableProps<Faction>["columns"] = [
        {
            title: "Name",
            dataIndex: "name",
            width: 180,
            render: (name: string) => (
                <Typography.Text ellipsis style={{ maxWidth: 220, display: "block" }}>
                    {name}
                </Typography.Text>
            ),
            sorter: (a, b) => a.name.localeCompare(b.name),
            defaultSortOrder: "ascend",
        },
        {
            title: "",
            key: "action",
            fixed: "right",
            width: 20,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<EditOutlined />}
                        aria-label="Edit faction"
                        title="Edit faction"
                        onClick={() => openEdit(record)}
                    />
                    <Button
                        type="dashed"
                        shape="circle"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label="Delete faction"
                        title="Delete faction"
                        onClick={() => handleDeleteFaction(record)}
                    />
                </Space>
            ),
        },
    ];
    const handleModalOk = async (values: FactionModalFormValues) => {
        setModalLoading(true);
        try {
            await dbContext.transaction(async (tx) => {
                const label = await LocaleUtils.createOrUpdateLocale(values.label, tx);
                const chapters = Array.isArray(values.chapters) ? values.chapters : [];
                for (let i = 0; i < chapters.length; i++) {
                    chapters[i] = await LocaleUtils.processChapterLocales(chapters[i], tx);
                }
                if (editingFaction) {
                    await tx.update(
                        dbContext.mappers.factions.map({
                            ...editingFaction,
                            name: values.name,
                            author: values.author,
                            chapters,
                            label,
                            timeline: values.timeline,
                            collection: values.collection,
                        }),
                        tableNames.factions
                    );
                } else {
                    await tx.add(
                        dbContext.mappers.factions.map({
                            id: -1,
                            name: values.name,
                            author: values.author,
                            chapters,
                            label,
                            timeline: values.timeline,
                            collection: values.collection,
                        }),
                        tableNames.factions
                    );
                }
            });
            closeModal();
            fetchFactions();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            message.error(`Failed to save faction: ${msg}`);
        } finally {
            setModalLoading(false);
        }
    };

    return (
        <GenericEntityList<Faction>
            items={factions}
            loading={loading}
            search={search}
            filters={filters}
            columns={columns}
            entityLabel="Faction"
            onSearch={setSearch}
            onAdd={openAdd}
            onReload={fetchFactions}
            onClean={() => setFactions([])}
            modal={
                <FactionModal
                    visible={isModalVisible}
                    onOk={handleModalOk}
                    onCancel={closeModal}
                    confirmLoading={modalLoading}
                    factionToEdit={editingFaction ?? undefined}
                    defaultCollectionId={filters.collection?.id}
                />
            }
        />
    );
};

export default FactionList;
