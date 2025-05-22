import { useState, useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Collection, Collection } from "../../database/models";
import { Button, Card, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";

import { DeleteOutlined, PlusCircleOutlined, EditOutlined } from "@ant-design/icons";

interface CollectionListProps {
    filters: Filters;
}

const CollectionList: React.FC<CollectionListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState<string>("");
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
            title: "",
            dataIndex: "id",
            width: 20,
            render: (id: number) => (
                <Typography.Text ellipsis style={{ maxWidth: 60, display: "block", color: '#888' }}>{id}</Typography.Text>
            ),
        },
        {
            title: "Name",
            dataIndex: "name",
            width: 180,
            render: (name: string, record: Collection) => (
                editingId === record.id ? (
                    <input
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        style={{ width: '100%' }}
                        autoFocus
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                                await dbContext.update({ ...record, name: editingName }, tableNames.collections);
                                setEditingId(null);
                                setEditingName("");
                                fetchCollections();
                            }
                        }}
                    />
                ) : (
                    <Typography.Text ellipsis style={{ maxWidth: 160, display: "block" }}>{name}</Typography.Text>
                )
            ),
        },
        {
            title: "",
            key: "action",
            fixed: "right",
            width: 20,
            render: (_, record) => (
                <Space size="middle">
                    {editingId === record.id ? (
                        <Button
                            type="primary"
                            size="small"
                            onClick={async () => {
                                await dbContext.update({ ...record, name: editingName }, tableNames.collections);
                                setEditingId(null);
                                setEditingName("");
                                fetchCollections();
                            }}
                        >
                            Save
                        </Button>
                    ) : (
                        <Button
                            type="dashed"
                            shape="circle"
                            icon={<EditOutlined />}
                            onClick={() => {
                                setEditingId(record.id);
                                setEditingName(record.name);
                            }}
                        />
                    )}
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteCollection(record.id)}
                    />
                </Space>
            ),
        },
    ];

    function sortedCollections(collectionList: Collection[]) {
        return collectionList
            .sort((a, b) => a.id - b.id);
    }

    async function deleteCollection(collectionId: number) {
        await dbContext
            .remove(collectionId, tableNames.collections)
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
                rowKey="id"
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
