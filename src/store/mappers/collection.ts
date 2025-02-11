import { DB_Collection } from "../database/models/DB_Collection";
import { Collection } from "../slices/models/Collection";


export function MapCollection(collection: Collection): DB_Collection {
    return {
        id: collection._id,
        name: collection.name,
    };
}

export function MapCollectionFromDB(collection: DB_Collection): Collection {
    return {
        _id: collection.id,
        name: collection.name,
    };
}

export function MapCollectionsFromDB(collections: DB_Collection[]): Collection[] {
    return collections.map((collection) => MapCollectionFromDB(collection));
}
