import { Database } from "neutron-db";
import { DB_Faction } from "../database/models/DB_Faction";
import { Faction } from "../slices/models/Faction";
import { tableNames } from "../database/dbcontext";
import { MapLocaleFromDB } from "./locale";
import { DB_Locale } from "../database/models/DB_Locale";
import { MapCollectionFromDB } from "./collection";
import { DB_Collection } from "../database/models/DB_Collection";

export function MapFaction(faction: Faction): DB_Faction {
    return {
        id: faction._id,
        name: faction.name,
        labelId: faction.label._id,
        descriptionId: faction.description._id,
        timeline: faction.timeline,
        collectionId: faction.collection._id,
    };
}

export function MapFactionFromDB(faction: DB_Faction, db: Database): Faction {
    const label = db.get(faction.labelId, tableNames.locales);
    if (!label) {
        throw new Error(`Label not found for faction ${faction.name}`);
    }

    const description = db.get(faction.descriptionId, tableNames.locales);
    if (!description) {
        throw new Error(`Description not found for faction ${faction.name}`);
    }

    const collection = db.get(faction.collectionId, tableNames.collections);
    if (!collection) {
        throw new Error(`DBName not found for faction ${faction.name}`);
    }

    return {
        _id: faction.id,
        name: faction.name,
        label: MapLocaleFromDB(label as DB_Locale),
        description: MapLocaleFromDB(description as DB_Locale),
        timeline: faction.timeline,
        collection: MapCollectionFromDB(collection as DB_Collection),
    };
}

export function MapFactionFromDBs(
    factions: DB_Faction[],
    db: Database
): Faction[] {
    return factions.map((faction) => MapFactionFromDB(faction, db));
}
