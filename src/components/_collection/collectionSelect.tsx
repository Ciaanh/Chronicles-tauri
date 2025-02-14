import { ItemPredicate, ItemRenderer, Select } from "@blueprintjs/select";
import { Collection } from "../../database/models";
import { Button, MenuItem } from "@blueprintjs/core";

interface CollectionSelectProps {
    selectedValue: Collection | null;
    collections: Collection[];
    onCollectionSelect: (collection: Collection) => void;
    onCollectionReset: () => void;
}

const CollectionSelect: React.FC<CollectionSelectProps> = (props) => {
    // demo select with predicate : https://blueprintjs.com/docs/#select/select-component.usage
    const filterCollection: ItemPredicate<Collection> = (query, collection, _index, exactMatch) => {
        const normalizedName = collection.name.toLowerCase();
        const normalizedQuery = query.toLowerCase();
    
        if (exactMatch) {
            return normalizedName === normalizedQuery;
        } else {
            return `${normalizedName}`.indexOf(normalizedQuery) >= 0;
        }
    };
    
    
    const renderCollectionItem: ItemRenderer<Collection> = (
        collection,
        { handleClick, handleFocus, modifiers, query }
    ) => {
        if (!modifiers.matchesPredicate) {
            return null;
        }
        return (
            <MenuItem
                key={collection._id}
                active={modifiers.active}
                onClick={handleClick}
                onFocus={handleFocus}
                roleStructure="listoption"
                text={`${collection.name}`}
            />
        );
    };

    return (
        <>
            <Select<Collection>
                items={props.collections}
                itemPredicate={filterCollection}
                itemRenderer={renderCollectionItem}
                noResults={
                    <MenuItem
                        disabled={true}
                        text="No results."
                        roleStructure="listoption"
                    />
                }
                onItemSelect={props.onCollectionSelect}
                resetOnSelect={true}
                resetOnQuery={false}
            >
                <Button
                    text={props.selectedValue?.name ?? "Select a collection"}
                    rightIcon="caret-down"
                />
            </Select>
            <Button
                className="bp5-minimal"
                icon="delete"
                onClick={() => props.onCollectionReset()}
            />
        </>
    );
};

export default CollectionSelect;
