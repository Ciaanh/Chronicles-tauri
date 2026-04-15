import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Skeleton, Space, Table, TableProps, Typography } from "antd";
import { PlusCircleOutlined } from "@ant-design/icons";
import { Filters } from "../filters";

interface GenericEntityListProps<T extends { id: number; name: string }> {
    // Data
    items: T[];
    loading: boolean;
    search: string;
    filters: Filters;

    // Columns (without the actions column — pass it in columns if you need it)
    columns: TableProps<T>["columns"];

    // Labels
    entityLabel: string;

    // Pagination
    pageSize?: number;

    // Callbacks
    onSearch: (value: string) => void;
    onAdd: () => void;
    onReload: () => void;
    onClean: () => void;

    // Modal
    modal: React.ReactNode;
}

export function GenericEntityList<T extends { id: number; name: string }>({
    items,
    loading,
    search,
    filters,
    columns,
    entityLabel,
    pageSize = 20,
    onSearch,
    onAdd,
    onReload,
    onClean,
    modal,
}: GenericEntityListProps<T>) {
    const collectionLabel = filters?.collection?.name
        ? `Displaying ${entityLabel.toLowerCase()}s for collection: ${filters.collection.name}`
        : "";

    // Debounced search — internal deferral so callers still hold the source of truth
    const [inputValue, setInputValue] = useState(search);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onSearch(e.target.value), 300);
    };
    // Sync if parent resets search (e.g. on collection change)
    useEffect(() => {
        setInputValue(search);
    }, [search]);

    const filtered = useMemo(
        () => items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
        [items, search]
    );

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            {collectionLabel && (
                <Space>
                    <Typography.Text strong>{collectionLabel}</Typography.Text>
                </Space>
            )}

            <Space>
                <Button onClick={onClean}>Clean {entityLabel.toLowerCase()}s</Button>
                <Button onClick={onReload} loading={loading}>
                    Load {entityLabel.toLowerCase()}s from DB
                </Button>
                <Input.Search
                    placeholder={`Search ${entityLabel.toLowerCase()}s…`}
                    allowClear
                    value={inputValue}
                    style={{ width: 240 }}
                    onChange={handleInputChange}
                    onClear={() => {
                        setInputValue("");
                        onSearch("");
                    }}
                />
                <Button
                    icon={<PlusCircleOutlined />}
                    onClick={onAdd}
                    aria-label={`Add ${entityLabel}`}
                    title={`Add ${entityLabel}`}
                />
            </Space>

            {loading && items.length === 0 ? (
                <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
                <Table<T>
                    rowKey="id"
                    columns={columns}
                    dataSource={filtered}
                    pagination={{
                        pageSize,
                        showSizeChanger: true,
                        showTotal: (total) =>
                            `${total} ${entityLabel.toLowerCase()}${total !== 1 ? "s" : ""}`,
                    }}
                    scroll={{ scrollToFirstRowOnChange: false }}
                    loading={loading && items.length > 0}
                />
            )}

            {modal}
        </Space>
    );
}

export default GenericEntityList;
