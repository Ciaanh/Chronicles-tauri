import { useState, useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Character, Character } from "../../database/models";
import { Button, Card, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import CharacterModal from "./CharacterModal";
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
    const dbContext = useContext(dbRepository);
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
                    // Optionally, you could attempt to fix the character here
                    // For example, by creating missing labels/descriptions
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
                        icon={<DeleteOutlined />}
                        onClick={() => deleteCharacter(record.id)}
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

    async function deleteCharacter(characterId: number) {
        setLoading(true);
        try {
            await dbContext.remove(characterId, tableNames.characters);
            fetchCharacters();
        } finally {
            setLoading(false);
        }
    }

    async function addCharacter() {
        setEditingCharacter(null);
        setIsModalVisible(true);
    }

    function handleEditCharacter(character: Character) {
        setEditingCharacter(character);
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

            if (editingCharacter) {
                // Update existing character
                const updatedCharacter = {
                    ...editingCharacter,
                    id: editingCharacter.id,
                    name: values.name,
                    // biography: biography, // Replaced with chapters
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
                    // biography: biography, // Replaced with chapters
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
                <Button className="bp5-minimal" onClick={cleanCharacters}>
                    Clean characters
                </Button>

                <Button
                    className="bp5-minimal"
                    onClick={reloadCharacters}
                    loading={loading}
                >
                    Load characters from DB
                </Button>

                <Button icon={<PlusCircleOutlined />} onClick={addCharacter} />
            </Space>

            <Table<Character>
                rowKey="id"
                columns={columns}
                dataSource={characters}
                pagination={false}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
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
