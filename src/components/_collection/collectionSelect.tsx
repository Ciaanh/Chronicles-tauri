import { useContext, useEffect, useState } from "react";
import { dbcontext, tableNames } from "../../database/dbcontext";
import { Collection, DB_Collection } from "../../database/models";
import { Select, SelectProps } from "antd";

type Option = { value: number; label: string };

interface CollectionSelectProps {
    onCollectionSelect: (collection: Collection) => void;
    onCollectionReset: () => void;
}

const CollectionSelect: React.FC<CollectionSelectProps> = (props) => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const contextValue = useContext(dbcontext);

    useEffect(() => {
        async function fetchCollections() {
            const collections = await contextValue.getAll(
                tableNames.collections
            );
            const mappedCollections =
                await contextValue.mappers.collections.mapFromDbArray(
                    collections as DB_Collection[]
                );
            setCollections(mappedCollections);
        }
        fetchCollections();
    }, [contextValue]);

    const filterOption = (input: string, option: Option | undefined) => {
        return (option?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase());
    };

    const onChange = (value: number) => {
        const selectedValue = collections.filter((c) => c._id === value);
        if (selectedValue.length === 0) {
            return;
        }
        props.onCollectionSelect(selectedValue[0]);
    };

    const onClear = () => {
        props.onCollectionReset();
    };

    return (
        <Select
            style={{ width: 120 }}
            options={collections.map((c) => ({ label: c.name, value: c._id }))}
            filterOption={filterOption}
            placeholder="Select a collection"
            onChange={onChange}
            onClear={onClear}
            allowClear
        ></Select>
    );
};

export default CollectionSelect;
