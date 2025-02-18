import { useState, useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Character, Character } from "../../database/models";
import { Button, Card, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";

import { DeleteOutlined, PlusCircleOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

interface CharacterListProps {
    filters: Filters;
}

const CharacterList: React.FC<CharacterListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [characters, setCharacters] = useState<Character[]>([]);
    const dbContext = useContext(dbRepository);

    async function fetchCharacters() {
        setLoading(true);
        const characterList = await dbContext.getAll(tableNames.characters);

        const filteredCharacters = characterList.filter((e) => {
            if (filters?.collection === null) return true;
            const character = e as DB_Character;
            return filters?.collection?._id === character.collectionId;
        });

        const mappedCharacters =
            await dbContext.mappers.characters.mapFromDbArray(
                filteredCharacters as DB_Character[]
            );

        setCharacters(sortedCharacters(mappedCharacters));
        setLoading(false);
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
            render: (name) => `${name}`,
        },
        {
            title: "",
            key: "action",
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteCharacter(record._id)}
                    />
                </Space>
            ),
        },
    ];

    const selectedCollection = filters?.collection?.name
        ? `Displaying characters for the collection : ${filters?.collection?.name}`
        : "";

    function sortedCharacters(characterList: Character[]) {
        return characterList
            .sort((a, b) => {
                // sort returns -1 if a is before b, 1 if a is after b, 0 if they are equal

                return 0;
            })
            .reverse();
    }

    async function deleteCharacter(eventid: number) {
        await dbContext
            .remove(eventid, tableNames.events)
            .then(() => fetchCharacters());
    }

    async function addCharacter() {
        //dbContext.remove(eventid, tableNames.events).then(() => fetchEvents());
    }

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
                rowKey="_id"
                columns={columns}
                dataSource={characters}
                pagination={false}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
                }}
            />
        </Space>
    );
};

export default CharacterList;
