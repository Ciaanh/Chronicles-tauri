/**
 * Import / merge utility for Chronicles DB JSON files.
 *
 * Strategy:
 *  1. Parse the JSON file (same format as ChroniclesDB.json).
 *  2. Find the maximum existing ID for each table.
 *  3. Re-number every imported record so IDs don't collide.
 *  4. Patch all foreign-key references with the new IDs.
 *  5. Return the re-numbered records ready to be inserted.
 */

import {
    DB_Character,
    DB_Chapter,
    DB_Collection,
    DB_Event,
    DB_Faction,
    DB_Locale,
} from "../database/models";
import { tableNames, DbWriteContext } from "../database/dbcontext";
import { DbObject } from "../database/jsondb/types";

/** Raw shape of a Chronicles DB JSON export */
export interface ChroniclesDbJson {
    events?: DB_Event[];
    characters?: DB_Character[];
    factions?: DB_Faction[];
    chapters?: DB_Chapter[];
    collections?: DB_Collection[];
    locales?: DB_Locale[];
}

export interface ImportSummary {
    collections: number;
    events: number;
    factions: number;
    characters: number;
    locales: number;
}

export interface PreparedImport {
    summary: ImportSummary;
    apply: (tx: DbWriteContext) => Promise<void>;
}

function nextId(offset: number): (oldId: number) => number {
    return (oldId: number) => oldId + offset;
}

/**
 * Parse and validate a raw JSON string as a Chronicles DB export.
 * Throws if the format is not recognised.
 */
export function parseChroniclesDb(json: string): ChroniclesDbJson {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch {
        throw new Error("Invalid JSON file.");
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("JSON file does not contain a Chronicles database object.");
    }
    const obj = parsed as Record<string, unknown>;
    const hasAnyTable =
        Array.isArray(obj["events"]) ||
        Array.isArray(obj["characters"]) ||
        Array.isArray(obj["factions"]) ||
        Array.isArray(obj["collections"]) ||
        Array.isArray(obj["locales"]);
    if (!hasAnyTable) {
        throw new Error("JSON file does not appear to be a Chronicles database export.");
    }
    return parsed as ChroniclesDbJson;
}

/**
 * Given the current database state and the import data, prepare re-numbered
 * records and return an `apply` function that inserts them inside a transaction.
 */
export async function prepareImport(
    incoming: ChroniclesDbJson,
    ctx: Pick<DbWriteContext, "getAll">
): Promise<PreparedImport> {
    // Fetch max IDs from current DB
    const [
        existingLocales,
        existingCollections,
        existingEvents,
        existingFactions,
        existingCharacters,
    ] = await Promise.all([
        ctx.getAll<DB_Locale>(tableNames.locales),
        ctx.getAll<DB_Collection>(tableNames.collections),
        ctx.getAll<DB_Event>(tableNames.events),
        ctx.getAll<DB_Faction>(tableNames.factions),
        ctx.getAll<DB_Character>(tableNames.characters),
    ]);

    const maxId = (arr: DbObject[]) => arr.reduce((m, r) => Math.max(m, r.id ?? 0), 0);

    const localeOffset = maxId(existingLocales);
    const collOffset = maxId(existingCollections);
    const eventOffset = maxId(existingEvents);
    const factionOffset = maxId(existingFactions);
    const characterOffset = maxId(existingCharacters);

    const remapLocale = nextId(localeOffset);
    const remapCollection = nextId(collOffset);
    const remapEvent = nextId(eventOffset);
    const remapFaction = nextId(factionOffset);
    const remapCharacter = nextId(characterOffset);

    const incomingLocales = incoming.locales ?? [];
    const incomingCollections = incoming.collections ?? [];
    const incomingEvents = incoming.events ?? [];
    const incomingFactions = incoming.factions ?? [];
    const incomingCharacters = incoming.characters ?? [];
    const preserveCollectionIds = incomingCollections.length === 0;

    // Re-numbered records
    const newLocales: DB_Locale[] = incomingLocales.map((l) => ({
        ...l,
        id: remapLocale(l.id),
    }));

    const newCollections: DB_Collection[] = incomingCollections.map((c) => ({
        ...c,
        id: remapCollection(c.id),
    }));

    const newEvents: DB_Event[] = incomingEvents.map((e) => ({
        ...e,
        id: remapEvent(e.id),
        labelId: remapLocale(e.labelId),
        collectionId: preserveCollectionIds ? e.collectionId : remapCollection(e.collectionId),
        factionIds: (e.factionIds ?? []).map(remapFaction),
        characterIds: (e.characterIds ?? []).map(remapCharacter),
        // chapters are inline value objects — no ID remapping needed
        chapters: e.chapters ?? [],
    }));

    const newFactions: DB_Faction[] = incomingFactions.map((f) => ({
        ...f,
        id: remapFaction(f.id),
        labelId: remapLocale(f.labelId),
        collectionId: preserveCollectionIds ? f.collectionId : remapCollection(f.collectionId),
        chapters: f.chapters ?? [],
    }));

    const newCharacters: DB_Character[] = incomingCharacters.map((c) => ({
        ...c,
        id: remapCharacter(c.id),
        labelId: remapLocale(c.labelId),
        collectionId: preserveCollectionIds ? c.collectionId : remapCollection(c.collectionId),
        factionIds: (c.factionIds ?? []).map(remapFaction),
        chapters: c.chapters ?? [],
    }));

    const summary: ImportSummary = {
        collections: newCollections.length,
        events: newEvents.length,
        factions: newFactions.length,
        characters: newCharacters.length,
        locales: newLocales.length,
    };

    const apply = async (tx: DbWriteContext): Promise<void> => {
        for (const rec of newLocales) await tx.add(rec, tableNames.locales);
        for (const rec of newCollections) await tx.add(rec, tableNames.collections);
        for (const rec of newFactions) await tx.add(rec, tableNames.factions);
        for (const rec of newCharacters) await tx.add(rec, tableNames.characters);
        for (const rec of newEvents) await tx.add(rec, tableNames.events);
    };

    return { summary, apply };
}
