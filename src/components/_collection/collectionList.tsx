import { useState, useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Collection, Collection } from "../../database/models";
import { Button, Card, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";

import { DeleteOutlined, PlusCircleOutlined } from "@ant-design/icons";

interface CollectionListProps {
    filters: Filters;
}

const CollectionList: React.FC<CollectionListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [collections, setCollections] = useState<Collection[]>([]);
    const dbContext = useContext(dbRepository);

    async function fetchCollections() {
        setLoading(true);
        const collectionList = await dbContext.getAll(tableNames.collections);

        const mappedCollections =
            await dbContext.mappers.collections.mapFromDbArray(
                collectionList as DB_Collection[]
            );

        setCollections(sortedCollections(mappedCollections));
        setLoading(false);
    }

    useEffect(() => {
        fetchCollections();
    }, [filters.collection]);

    const reloadCollections = async () => {
        fetchCollections();
    };

    const cleanCollections = async () => {
        setCollections([]);
    };

    const columns: TableProps<Collection>["columns"] = [
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
                        onClick={() => deleteCollection(record._id)}
                    />
                </Space>
            ),
        },
    ];

    function sortedCollections(collectionList: Collection[]) {
        return collectionList
            .sort((a, b) => {
                // sort returns -1 if a is before b, 1 if a is after b, 0 if they are equal

                return 0;
            })
            .reverse();
    }

    async function deleteCollection(eventid: number) {
        await dbContext
            .remove(eventid, tableNames.events)
            .then(() => fetchCollections());
    }

    async function addCollection() {
        //dbContext.remove(eventid, tableNames.events).then(() => fetchEvents());
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
                <Button className="bp5-minimal" onClick={cleanCollections}>
                    Clean collections
                </Button>

                <Button
                    className="bp5-minimal"
                    onClick={reloadCollections}
                    loading={loading}
                >
                    Load collections from DB
                </Button>

                <Button icon={<PlusCircleOutlined />} onClick={addCollection} />
            </Space>

            <Table<Collection>
                rowKey="_id"
                columns={columns}
                dataSource={collections}
                pagination={false}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
                }}
            />
        </Space>
    );
};

export default CollectionList;
