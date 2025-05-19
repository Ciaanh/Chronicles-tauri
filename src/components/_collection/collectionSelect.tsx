import { useContext, useEffect, useState } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { Collection, DB_Collection } from "../../database/models";
import { Select, SelectProps } from "antd";

type Option = { value: number; label: string };

interface CollectionSelectProps {
    className?: string;
    onCollectionSelect: (collection: Collection) => void;
    onCollectionReset: () => void;
}

const CollectionSelect: React.FC<CollectionSelectProps> = (props) => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const dbContext = useContext(dbRepository);

    useEffect(() => {
        async function fetchCollections() {
            const collections = await dbContext.getAll(
                tableNames.collections
            );
            const mappedCollections =
                await dbContext.mappers.collections.mapFromDbArray(
                    collections as DB_Collection[]
                );
            setCollections(mappedCollections);
        }
        fetchCollections();
    }, [dbContext]);

    const filterOption = (input: string, option: Option | undefined) => {
        return (option?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase());
    };

    const onChange = (value: number) => {
        const selectedValue = collections.filter((c) => c.id === value);
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
            className={props.className}
            options={collections.map((c) => ({ label: c.name, value: c.id }))}
            filterOption={filterOption}
            placeholder="Select a collection"
            onChange={onChange}
            onClear={onClear}
            allowClear
        ></Select>
    );
};

export default CollectionSelect;
