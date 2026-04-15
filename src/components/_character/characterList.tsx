import { useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Character, DB_Event, Character } from "../../database/models";
import { App, Button, Space, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import CharacterModal, { CharacterModalFormValues } from "./CharacterModal";
import { LocaleUtils } from "../../_utils/localeUtils";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useEntityCrud } from "../_shared/useEntityCrud";
import { GenericEntityList } from "../_shared/GenericEntityList";

interface CharacterListProps {
    filters: Filters;
}

const CharacterList: React.FC<CharacterListProps> = ({ filters }) => {
    const dbContext = useContext(dbRepository);
    const { message, modal } = App.useApp();

    function sortedCharacters(list: Character[]): Character[] {
        return [...list].sort((a, b) => a.name?.localeCompare(b.name) ?? 0);
    }

    const {
        loading,
        setLoading,
        items: characters,
        setItems: setCharacters,
        isModalVisible,
        modalLoading,
        setModalLoading,
        editingItem: editingCharacter,
        search,
        setSearch,
        openAdd,
        openEdit,
        closeModal,
        optimisticDelete,
    } = useEntityCrud<Character>({
        tableName: tableNames.characters,
        entityLabel: "Character",
        sortItems: sortedCharacters,
    });

    async function fetchCharacters() {
        setLoading(true);
        try {
            const characterList = await dbContext.getAll(tableNames.characters);
            const filteredCharacters = characterList.filter((e) => {
                if (filters?.collection === null) return true;
                return filters?.collection?.id === (e as DB_Character).collectionId;
            });
            const successfullyMappedCharacters: Character[] = [];
            for (const characterDb of filteredCharacters as DB_Character[]) {
                try {
                    const mapped = await dbContext.mappers.characters.mapFromDb(characterDb);
                    successfullyMappedCharacters.push(mapped);
                } catch (error) {
                    console.error(
                        `Error mapping character ${characterDb.name || characterDb.id}:`,
                        error
                    );
                }
            }
            setCharacters(sortedCharacters(successfullyMappedCharacters));
        } catch (error) {
            console.error("Error fetching characters:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCharacters();
    }, [filters.collection]); // eslint-disable-line react-hooks/exhaustive-deps
    async function handleDeleteCharacter(character: Character) {
        const allEvents = await dbContext.getAll(tableNames.events);
        const referencingEvents = (allEvents as DB_Event[]).filter(
            (e) => Array.isArray(e.characterIds) && e.characterIds.includes(character.id)
        );
        const doDelete = () => optimisticDelete(character);
        if (referencingEvents.length > 0) {
            modal.confirm({
                title: "Delete character and clean references?",
                content: `"${character.name}" is referenced by ${referencingEvents.length} event(s). Remove all references and delete?`,
                okText: "Delete and clean",
                okButtonProps: { danger: true },
                onOk: async () => {
                    for (const ev of referencingEvents) {
                        await dbContext.update(
                            {
                                ...ev,
                                characterIds: ev.characterIds.filter((id) => id !== character.id),
                            },
                            tableNames.events
                        );
                    }
                    doDelete();
                },
            });
            return;
        }
        modal.confirm({
            title: "Delete character",
            content: `Are you sure you want to delete "${character.name}"?`,
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: doDelete,
        });
    }

    const columns: TableProps<Character>["columns"] = [
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
                        aria-label="Edit character"
                        title="Edit character"
                        onClick={() => openEdit(record)}
                    />
                    <Button
                        type="dashed"
                        shape="circle"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label="Delete character"
                        title="Delete character"
                        onClick={() => handleDeleteCharacter(record)}
                    />
                </Space>
            ),
        },
    ];
    const handleModalOk = async (values: CharacterModalFormValues) => {
        setModalLoading(true);
        try {
            await dbContext.transaction(async (tx) => {
                const label = await LocaleUtils.createOrUpdateLocale(values.label, tx);
                const chapters = Array.isArray(values.chapters) ? values.chapters : [];
                for (let i = 0; i < chapters.length; i++) {
                    chapters[i] = await LocaleUtils.processChapterLocales(chapters[i], tx);
                }
                if (editingCharacter) {
                    await tx.update(
                        dbContext.mappers.characters.map({
                            ...editingCharacter,
                            name: values.name,
                            author: values.author,
                            chapters,
                            label,
                            timeline: values.timeline,
                            collection: values.collection,
                            factions: values.factions || [],
                        }),
                        tableNames.characters
                    );
                } else {
                    await tx.add(
                        dbContext.mappers.characters.map({
                            id: -1,
                            name: values.name,
                            author: values.author,
                            chapters,
                            label,
                            timeline: values.timeline,
                            collection: values.collection,
                            factions: values.factions || [],
                        }),
                        tableNames.characters
                    );
                }
            });
            closeModal();
            fetchCharacters();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            message.error(`Failed to save character: ${msg}`);
        } finally {
            setModalLoading(false);
        }
    };

    return (
        <GenericEntityList<Character>
            items={characters}
            loading={loading}
            search={search}
            filters={filters}
            columns={columns}
            entityLabel="Character"
            onSearch={setSearch}
            onAdd={openAdd}
            onReload={fetchCharacters}
            onClean={() => setCharacters([])}
            modal={
                <CharacterModal
                    visible={isModalVisible}
                    onOk={handleModalOk}
                    onCancel={closeModal}
                    confirmLoading={modalLoading}
                    characterToEdit={editingCharacter ?? undefined}
                    defaultCollectionId={filters.collection?.id}
                />
            }
        />
    );
};

export default CharacterList;
