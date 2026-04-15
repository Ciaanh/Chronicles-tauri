/**
 * Mapper factory module.
 *
 * All mappers are created via `createMappers()` which receives the live
 * `Database` instance and a cache-ensure function as dependencies.
 * This keeps the mappers testable and separated from the React provider
 * while preserving the closure-based cross-mapper references that they need.
 */
import {
    Chapter,
    Character,
    Collection,
    DB_Chapter,
    DB_Character,
    DB_Collection,
    DB_Event,
    DB_Faction,
    DB_Locale,
    Event,
    Faction,
    Locale,
} from "../models";
import { AsyncDatabase } from "../jsondb/database";
import { Mapper, LocalMapper } from "../dbcontext";

export interface MapperCache {
    localesById: Map<number, DB_Locale>;
    factionsById: Map<number, DB_Faction>;
    charactersById: Map<number, DB_Character>;
    collectionsById: Map<number, DB_Collection>;
}

export interface AllMappers {
    events: Mapper<DB_Event, Event>;
    characters: Mapper<DB_Character, Character>;
    factions: Mapper<DB_Faction, Faction>;
    collections: Mapper<DB_Collection, Collection>;
    locales: Mapper<DB_Locale, Locale>;
    chapters: LocalMapper<DB_Chapter, Chapter>;
}

export function createMappers(
    database: AsyncDatabase | null,
    ensureMapperCache: () => Promise<MapperCache>
): AllMappers {
    // ── LocaleMapper ─────────────────────────────────────────────────────────
    const LocaleMapper: Mapper<DB_Locale, Locale> = {
        map: (dto: Locale): DB_Locale => ({
            id: dto.id,
            ishtml: dto.ishtml,
            enUS: dto.enUS,
            translations: dto.translations,
        }),
        mapFromDb: async (dbo: DB_Locale): Promise<Locale> => ({
            id: dbo.id,
            ishtml: dbo.ishtml,
            enUS: dbo.enUS,
            translations: dbo.translations,
        }),
        mapFromDbArray: async (dbo: DB_Locale[]): Promise<Locale[]> =>
            Promise.all(dbo.map((l) => LocaleMapper.mapFromDb(l))),
    };

    // ── CollectionMapper ──────────────────────────────────────────────────────
    const CollectionMapper: Mapper<DB_Collection, Collection> = {
        map: (dto: Collection): DB_Collection => ({
            id: dto.id,
            name: dto.name,
        }),
        mapFromDb: async (dbo: DB_Collection): Promise<Collection> => {
            if (database === null) throw new Error("Database not loaded");
            return { id: dbo.id, name: dbo.name };
        },
        mapFromDbArray: async (dbo: DB_Collection[]): Promise<Collection[]> =>
            Promise.all(dbo.map((c) => CollectionMapper.mapFromDb(c))),
    };

    // ── ChapterMapper ─────────────────────────────────────────────────────────
    const ChapterMapper: LocalMapper<DB_Chapter, Chapter> = {
        map: (dto: Chapter): DB_Chapter => ({
            headerId: dto.header?.id,
            pageIds: dto.pages.map((locale) => locale.id),
        }),
        mapFromDb: async (dbo: DB_Chapter): Promise<Chapter> => {
            if (database === null) throw new Error("Database not loaded");
            const cache = await ensureMapperCache();
            const pages = dbo.pageIds
                .map((id) => cache.localesById.get(id))
                .filter((locale): locale is DB_Locale => locale !== undefined);
            const header = dbo.headerId ? cache.localesById.get(dbo.headerId) : undefined;
            return {
                header: dbo.headerId
                    ? header
                        ? await LocaleMapper.mapFromDb(header)
                        : null
                    : null,
                pages: await Promise.all(pages.map((locale) => LocaleMapper.mapFromDb(locale))),
            };
        },
        mapFromDbArray: async (dbo: DB_Chapter[]): Promise<Chapter[]> => {
            await ensureMapperCache();
            return Promise.all(dbo.map((c) => ChapterMapper.mapFromDb(c)));
        },
    };

    // ── FactionMapper ─────────────────────────────────────────────────────────
    const FactionMapper: Mapper<DB_Faction, Faction> = {
        map: (dto: Faction): DB_Faction => ({
            id: dto.id,
            name: dto.name,
            author: dto.author,
            labelId: dto.label.id,
            chapters: dto.chapters.map(
                (chapter) =>
                    ({
                        headerId: chapter.header?.id,
                        pageIds: chapter.pages.map((page) => page.id),
                    }) as DB_Chapter
            ),
            timeline: dto.timeline,
            collectionId: dto.collection.id,
        }),
        mapFromDb: async (dbo: DB_Faction): Promise<Faction> => {
            if (database === null) throw new Error("Database not loaded");
            const cache = await ensureMapperCache();
            const label = cache.localesById.get(dbo.labelId);
            if (!label) throw new Error(`Label not found for faction ${dbo.name}`);
            const collection = cache.collectionsById.get(dbo.collectionId);
            if (!collection) throw new Error(`Collection not found for faction ${dbo.name}`);
            return {
                id: dbo.id,
                name: dbo.name,
                author: dbo.author,
                label: await LocaleMapper.mapFromDb(label),
                chapters: dbo.chapters
                    ? await Promise.all(dbo.chapters.map((c) => ChapterMapper.mapFromDb(c)))
                    : [],
                timeline: dbo.timeline,
                collection: await CollectionMapper.mapFromDb(collection),
            };
        },
        mapFromDbArray: async (dbo: DB_Faction[]): Promise<Faction[]> => {
            await ensureMapperCache();
            return Promise.all(dbo.map((f) => FactionMapper.mapFromDb(f)));
        },
    };

    // ── CharacterMapper ───────────────────────────────────────────────────────
    const CharacterMapper: Mapper<DB_Character, Character> = {
        map: (dto: Character): DB_Character => ({
            id: dto.id,
            name: dto.name,
            author: dto.author,
            labelId: dto.label.id,
            chapters: dto.chapters.map(
                (chapter) =>
                    ({
                        headerId: chapter.header?.id,
                        pageIds: chapter.pages.map((page) => page.id),
                    }) as DB_Chapter
            ),
            timeline: dto.timeline,
            factionIds: dto.factions.map((faction) => faction.id),
            collectionId: dto.collection.id,
        }),
        mapFromDb: async (dbo: DB_Character): Promise<Character> => {
            if (database === null) throw new Error("Database not loaded");
            const cache = await ensureMapperCache();
            const label = cache.localesById.get(dbo.labelId);
            if (!label) throw new Error(`Label not found for character ${dbo.name}`);
            const factions = dbo.factionIds
                .map((id) => cache.factionsById.get(id))
                .filter((f): f is DB_Faction => f !== undefined);
            const collection = cache.collectionsById.get(dbo.collectionId);
            if (!collection) throw new Error(`Collection not found for character ${dbo.name}`);
            return {
                id: dbo.id,
                name: dbo.name,
                author: dbo.author,
                label: await LocaleMapper.mapFromDb(label),
                chapters: dbo.chapters
                    ? await Promise.all(dbo.chapters.map((c) => ChapterMapper.mapFromDb(c)))
                    : [],
                timeline: dbo.timeline,
                factions: await Promise.all(factions.map((f) => FactionMapper.mapFromDb(f))),
                collection: await CollectionMapper.mapFromDb(collection),
            };
        },
        mapFromDbArray: async (dbo: DB_Character[]): Promise<Character[]> => {
            await ensureMapperCache();
            return Promise.all(dbo.map((c) => CharacterMapper.mapFromDb(c)));
        },
    };

    // ── EventMapper ───────────────────────────────────────────────────────────
    const EventMapper: Mapper<DB_Event, Event> = {
        map: (dto: Event): DB_Event => ({
            id: dto.id,
            name: dto.name,
            yearStart: dto.period?.yearStart ?? 0,
            yearEnd: dto.period?.yearEnd ?? 0,
            eventType: dto.eventType,
            timeline: dto.timeline,
            link: dto.link,
            factionIds: dto.factions.map((faction) => faction.id),
            characterIds: dto.characters.map((character) => character.id),
            labelId: dto.label.id,
            chapters: dto.chapters.map(
                (chapter) =>
                    ({
                        headerId: chapter.header?.id,
                        pageIds: chapter.pages.map((page) => page.id),
                    }) as DB_Chapter
            ),
            collectionId: dto.collection.id,
            order: dto.order,
        }),
        mapFromDb: async (dbo: DB_Event): Promise<Event> => {
            if (dbo === null) {
                console.log(dbo);
            }
            if (database === null) throw new Error("Database not loaded");
            const cache = await ensureMapperCache();

            const factions = (dbo.factionIds ?? [])
                .map((id) => cache.factionsById.get(id))
                .filter((f): f is DB_Faction => f !== undefined);
            const characters = (dbo.characterIds ?? [])
                .map((id) => cache.charactersById.get(id))
                .filter((c): c is DB_Character => c !== undefined);
            const label = cache.localesById.get(dbo.labelId);
            const collection = cache.collectionsById.get(dbo.collectionId);

            if (!label) throw new Error(`Label not found for event ${dbo.name}`);
            if (!collection) throw new Error(`Collection not found for event ${dbo.name}`);

            return {
                id: dbo.id,
                name: dbo.name,
                period: { yearStart: dbo.yearStart, yearEnd: dbo.yearEnd },
                eventType: dbo.eventType,
                timeline: dbo.timeline,
                link: dbo.link,
                factions: await Promise.all(factions.map((f) => FactionMapper.mapFromDb(f))),
                characters: await Promise.all(characters.map((c) => CharacterMapper.mapFromDb(c))),
                label: await LocaleMapper.mapFromDb(label),
                chapters: await Promise.all(
                    (dbo.chapters ?? []).map((c) => ChapterMapper.mapFromDb(c))
                ),
                collection: await CollectionMapper.mapFromDb(collection),
                order: dbo.order,
            };
        },
        mapFromDbArray: async (dbo: DB_Event[]): Promise<Event[]> => {
            await ensureMapperCache();
            return Promise.all(dbo.map((e) => EventMapper.mapFromDb(e)));
        },
    };

    return {
        events: EventMapper,
        characters: CharacterMapper,
        factions: FactionMapper,
        collections: CollectionMapper,
        locales: LocaleMapper,
        chapters: ChapterMapper,
    };
}
