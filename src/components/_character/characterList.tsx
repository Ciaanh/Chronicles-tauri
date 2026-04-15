import { useState, useContext, useEffect, useRef } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Character, DB_Event, Character } from "../../database/models";
import { App, Button, Input, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import CharacterModal from "./CharacterModal";
import { CharacterModalFormValues } from "./CharacterModal";
import { LocaleUtils } from "../../_utils/localeUtils";

import {
    DeleteOutlined,
    EditOutlined,
    PlusCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface CharacterListProps {
    filters: Filters;
}

const CharacterList: React.FC<CharacterListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(
        null
    );
    const [search, setSearch] = useState("");
    const dbContext = useContext(dbRepository);
    const { message, modal } = App.useApp();
    const pendingDeletes = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    async function fetchCharacters() {
        setLoading(true);
        try {
            const characterList = await dbContext.getAll(tableNames.characters);

            const filteredCharacters = characterList.filter((e) => {
                if (filters?.collection === null) return true;
                const character = e as DB_Character;
                return filters?.collection?.id === character.collectionId;
            });

            // Create an array to hold successfully mapped characters
            let successfullyMappedCharacters: Character[] = [];

            // Process each character individually to handle errors
            for (const characterDb of filteredCharacters as DB_Character[]) {
                try {
                    const mappedCharacter =
                        await dbContext.mappers.characters.mapFromDb(
                            characterDb
                        );
                    successfullyMappedCharacters.push(mappedCharacter);
                } catch (error) {
                    console.error(
                        `Error mapping character ${
                            characterDb.name || characterDb.id
                        }:`,
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
    }, [filters.collection]);

    useEffect(() => {
        const pending = pendingDeletes.current;
        return () => {
            pending.forEach((timeout) => clearTimeout(timeout));
        };
    }, []);

    const reloadCharacters = async () => {
        fetchCharacters();
    };

    const cleanCharacters = async () => {
        setCharacters([]);
    };
    const columns: TableProps<Character>["columns"] = [
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
                        onClick={() => handleEditCharacter(record)}
                    />
                    <Button
                        type="dashed"
                        shape="circle"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteCharacter(record)}
                    />
                </Space>
            ),
        },
    ];

    const selectedCollection = filters?.collection?.name
        ? `Displaying characters for the collection : ${filters?.collection?.name}`
        : "";

    function sortedCharacters(characterList: Character[]) {
        return characterList.sort((a, b) => {
            if (a.name && b.name) {
                return a.name.localeCompare(b.name);
            }
            return 0;
        });
    }

    async function deleteCharacter(characterId: number, name: string, snapshot: Character) {
        setCharacters((prev) => prev.filter((c) => c.id !== characterId));
        const timeout = setTimeout(async () => {
            pendingDeletes.current.delete(characterId);
            setLoading(true);
            try {
                await dbContext.remove(characterId, tableNames.characters);
            } finally {
                setLoading(false);
            }
        }, 5000);
        pendingDeletes.current.set(characterId, timeout);
        message.open({
            key: `delete-char-${characterId}`,
            type: "success",
            duration: 5,
            content: (
                <span>
                    Character &ldquo;{name}&rdquo; deleted.{" "}
                    <Button
                        type="link"
                        size="small"
                        onClick={() => undoDeleteCharacter(characterId, snapshot)}
                    >
                        Undo
                    </Button>
                </span>
            ),
        });
    }

    function undoDeleteCharacter(characterId: number, character: Character) {
        const timeout = pendingDeletes.current.get(characterId);
        if (timeout) {
            clearTimeout(timeout);
            pendingDeletes.current.delete(characterId);
        }
        setCharacters((prev) => sortedCharacters([...prev, character]));
        message.destroy(`delete-char-${characterId}`);
    }

    async function handleDeleteCharacter(character: Character) {
        const allEvents = await dbContext.getAll(tableNames.events);
        const referencingEvents = (allEvents as DB_Event[]).filter(
            (e) =>
                Array.isArray(e.characterIds) &&
                e.characterIds.includes(character.id)
        );

        const doDelete = () =>
            deleteCharacter(character.id, character.name, character);

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
                                characterIds: ev.characterIds.filter(
                                    (id) => id !== character.id
                                ),
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

    async function addCharacter() {
        setEditingCharacter(null);
        setIsModalVisible(true);
    }

    function handleEditCharacter(character: Character) {
        setEditingCharacter(character);
        setIsModalVisible(true);
    }
    const handleModalOk = async (values: CharacterModalFormValues) => {
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
            if (editingCharacter) {
                // Update existing character
                const updatedCharacter = {
                    ...editingCharacter,
                    id: editingCharacter.id,
                    name: values.name,
                    author: values.author,
                    chapters: processedChapters,
                    label: label,
                    timeline: values.timeline,
                    collection: values.collection,
                    factions: values.factions || [],
                };
                await dbContext.update(
                    dbContext.mappers.characters.map(updatedCharacter),
                    tableNames.characters
                );
            } else {
                // Add new character
                const newCharacter: Character = {
                    name: values.name,
                    author: values.author,
                    chapters: processedChapters,
                    label: label,
                    timeline: values.timeline,
                    collection: values.collection,
                    factions: values.factions || [],
                    id: -1,
                };
                await dbContext.add(
                    dbContext.mappers.characters.map(newCharacter),
                    tableNames.characters
                );
            }
            setIsModalVisible(false);
            setEditingCharacter(null);
            fetchCharacters();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            message.error(`Failed to save character: ${msg}`);
        } finally {
            setModalLoading(false);
        }
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        setEditingCharacter(null);
    };

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
                <Text strong>{selectedCollection}</Text>
            </Space>

            <Space>
                <Button onClick={cleanCharacters}>
                    Clean characters
                </Button>

                <Button
                    onClick={reloadCharacters}
                    loading={loading}
                >
                    Load characters from DB
                </Button>

                <Input.Search
                    placeholder="Search characters…"
                    allowClear
                    style={{ width: 240 }}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <Button icon={<PlusCircleOutlined />} onClick={addCharacter} />
            </Space>

            <Table<Character>
                rowKey="id"
                columns={columns}
                dataSource={characters.filter((c) =>
                    c.name.toLowerCase().includes(search.toLowerCase())
                )}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} characters` }}
                scroll={{
                    scrollToFirstRowOnChange: false,
                }}
            />
            <CharacterModal
                visible={isModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                confirmLoading={modalLoading}
                characterToEdit={
                    editingCharacter ? editingCharacter : undefined
                }
            />
        </Space>
    );
};

export default CharacterList;
