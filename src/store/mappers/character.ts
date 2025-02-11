import { Database } from "neutron-db";
import { DB_Character } from "../database/models/DB_Character";
import { Character } from "../slices/models/Character";
import { tableNames } from "../database/dbcontext";
import { MapLocaleFromDB } from "./locale";
import { DB_Locale } from "../database/models/DB_Locale";
import { DB_Faction } from "../database/models/DB_Faction";
import { MapFactionFromDB } from "./faction";

export function CharacterMapper(character: Character): DB_Character {
    return {
        id: character._id,
        name: character.name,
        labelId: character.label._id,
        biographyId: character.biography._id,
        timeline: character.timeline,
        factionIds: character.factions.map((faction) => faction._id),
        collectionId: character.collection._id,
    };
}

export function CharacterMapperFromDB(
    character: DB_Character,
    db: Database
): Character {
    const label = db.get(character.labelId, tableNames.locales);
    if (!label) {
        throw new Error(`Label not found for character ${character.name}`);
    }

    const biography = db.get(character.biographyId, tableNames.locales);
    if (!biography) {
        throw new Error(`Biography not found for character ${character.name}`);
    }

    const factions = db
        .getAll(tableNames.factions)
        .filter((faction) => character.factionIds.includes(faction.id))
        .map((faction) => MapFactionFromDB(faction as DB_Faction, db));

    return {
        _id: character.id,
        name: character.name,
        label: MapLocaleFromDB(label as DB_Locale),
        biography: MapLocaleFromDB(biography as DB_Locale),
        timeline: character.timeline,
        factions: factions,
        collection: db.get(character.collectionId, tableNames.collections),
    };
}

export function CharacterMapperFromDBs(
    characters: DB_Character[],
    db: Database
): Character[] {
    return characters.map((character) => {
        return CharacterMapperFromDB(character, db);
    });
}
