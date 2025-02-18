import { useState, useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Faction, Faction } from "../../database/models";
import { Button, Card, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";

import { DeleteOutlined, PlusCircleOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

interface FactionListProps {
    filters: Filters;
}

const FactionList: React.FC<FactionListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [factions, setFactions] = useState<Faction[]>([]);
    const dbContext = useContext(dbRepository);

    async function fetchFactions() {
        setLoading(true);
        const factionList = await dbContext.getAll(tableNames.factions);

        const filteredFactions = factionList.filter((e) => {
            if (filters?.collection === null) return true;
            const faction = e as DB_Faction;
            return filters?.collection?._id === faction.collectionId;
        });

        const mappedFactions = await dbContext.mappers.factions.mapFromDbArray(
            filteredFactions as DB_Faction[]
        );

        setFactions(sortedFactions(mappedFactions));
        setLoading(false);
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
                        onClick={() => deleteFaction(record._id)}
                    />
                </Space>
            ),
        },
    ];

    const selectedCollection = filters?.collection?.name
        ? `Displaying factions for the collection : ${filters?.collection?.name}`
        : "";

    function sortedFactions(factionList: Faction[]) {
        return factionList
            .sort((a, b) => {
                // sort returns -1 if a is before b, 1 if a is after b, 0 if they are equal

                return 0;
            })
            .reverse();
    }

    async function deleteFaction(eventid: number) {
        await dbContext
            .remove(eventid, tableNames.events)
            .then(() => fetchFactions());
    }

    async function addFaction() {
        //dbContext.remove(eventid, tableNames.events).then(() => fetchEvents());
    }

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
                rowKey="_id"
                columns={columns}
                dataSource={factions}
                pagination={false}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
                }}
            />
        </Space>
    );
};

export default FactionList;
