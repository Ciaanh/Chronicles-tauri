import { useState, Fragment, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";

import {
    ContextValue,
    Mapper,
    tableNames,
    dbRepository,
    LocalMapper,
} from "./dbcontext";

import { Database } from "./jsondb/database";
import { DbObject, Schema } from "./jsondb/types";
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
} from "./models";
import Loader from "./loader";

export interface dbSchema {
    tables: string[];
    dbname: string;
    location: string | undefined;
    writeDebounceMs?: number;
    autoSaveIntervalMs?: number;
}

export interface dbProviderProps {
    children: React.ReactNode;
    dbschema: dbSchema;
}

export function DbProvider({ children, dbschema }: dbProviderProps) {
    if (
        typeof dbschema !== "object" ||
        dbschema === null ||
        dbschema === undefined
    ) {
        console.error("No Schema provided to dbContextProvider");
        return <Fragment>{children}</Fragment>;
    }

    const [database, setDatabase] = useState<Database | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [loaded, setLoaded] = useState<boolean>(false);
    const mapperCacheRef = useRef<{
        localesById: Map<number, DB_Locale>;
        factionsById: Map<number, DB_Faction>;
        charactersById: Map<number, DB_Character>;
        collectionsById: Map<number, DB_Collection>;
    } | null>(null);

    const invalidateMapperCache = () => {
        mapperCacheRef.current = null;
    };

    const ensureMapperCache = async () => {
        if (database === null) throw new Error("Database not loaded");
        if (mapperCacheRef.current) return mapperCacheRef.current;

        const [locales, factions, characters, collections] = await Promise.all([
            database.getAll<DB_Locale>(tableNames.locales),
            database.getAll<DB_Faction>(tableNames.factions),
            database.getAll<DB_Character>(tableNames.characters),
            database.getAll<DB_Collection>(tableNames.collections),
        ]);

        mapperCacheRef.current = {
            localesById: new Map(locales.map((item) => [item.id, item])),
            factionsById: new Map(factions.map((item) => [item.id, item])),
            charactersById: new Map(characters.map((item) => [item.id, item])),
            collectionsById: new Map(collections.map((item) => [item.id, item])),
        };

        return mapperCacheRef.current;
    };

    const load = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const currentSchema: dbSchema = {
                dbname: dbschema.dbname,
                tables: dbschema.tables,
                location: dbschema.location,
            };

            if (currentSchema.location === undefined) {
                const chosenLocation = await open({
                    multiple: false,
                    directory: false,
                });
                if (chosenLocation !== null) {
                    currentSchema.location = chosenLocation;
                } else {
                    console.warn("DB load cancelled by user.");
                    return;
                }
            }

            const schema: Schema = {
                dbname: currentSchema.dbname,
                tables: currentSchema.tables,
                oneIndexed: true,
                compressedJson: true,
                writeDebounceMs: currentSchema.writeDebounceMs,
                autoSaveIntervalMs: currentSchema.autoSaveIntervalMs,
                location: currentSchema.location,
            };

            const database = await Database.create(schema);
            setDatabase(database);
            invalidateMapperCache();
            setLoaded(true);
        } catch (err) {
            console.error("Failed to load DB:", err);
        } finally {
            setLoading(false);
        }
    };

    const getAll = async <T extends DbObject>(dbName: string): Promise<T[]> => {
        if (database === null) return [];
        return await database.getAll<T>(dbName);
    };

    const get = async <T extends DbObject>(
        id: number,
        dbName: string
    ): Promise<T | null> => {
        if (database === null) return null;
        return await database.get<T>(id, dbName);
    };

    const add = async <T extends DbObject>(
        row: T,
        dbName: string
    ): Promise<T | null> => {
        if (database === null) return null;
        const inserted = await database.insert<T>(row, dbName);
        invalidateMapperCache();
        return inserted;
    };

    const update = async <T extends DbObject>(
        row: T,
        dbName: string
    ): Promise<T | null> => {
        if (database === null) return null;
        const updated = await database.update<T>(row, dbName);
        invalidateMapperCache();
        return updated;
    };

    const remove = async (id: number, dbName: string): Promise<void> => {
        if (database === null) return;
        await database.delete(id, dbName);
        invalidateMapperCache();
    };

    const EventMapper: Mapper<DB_Event, Event> = {
        map: (dto: Event): DB_Event => {
            const mappedEvent = {
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
                        } as DB_Chapter)
                ),
                collectionId: dto.collection.id,
                order: dto.order,
            };

            return mappedEvent;
        },
        mapFromDb: async (dbo: DB_Event): Promise<Event> => {
            if (dbo === null) {
                console.log(dbo);
            }
            if (database === null) throw new Error("Database not loaded");
            const cache = await ensureMapperCache();

            const factions = dbo.factionIds
                .map((id) => cache.factionsById.get(id))
                .filter((faction): faction is DB_Faction => faction !== undefined);
            const characters = dbo.characterIds
                .map((id) => cache.charactersById.get(id))
                .filter(
                    (character): character is DB_Character => character !== undefined
                );
            const label = cache.localesById.get(dbo.labelId);
            const collection = cache.collectionsById.get(dbo.collectionId);

            if (!label) {
                throw new Error(`Label not found for event ${dbo.name}`);
            }

            if (!collection) {
                throw new Error(`Collection not found for event ${dbo.name}`);
            }

            return {
                id: dbo.id,
                name: dbo.name,
                period: {
                    yearStart: dbo.yearStart,
                    yearEnd: dbo.yearEnd,
                },
                eventType: dbo.eventType,
                timeline: dbo.timeline,
                link: dbo.link,
                factions: await Promise.all(
                    factions.map(
                        async (faction) =>
                            await FactionMapper.mapFromDb(faction as DB_Faction)
                    )
                ),
                characters: await Promise.all(
                    characters.map(
                        async (character) =>
                            await CharacterMapper.mapFromDb(
                                character as DB_Character
                            )
                    )
                ),
                label: await LocaleMapper.mapFromDb(label as DB_Locale),
                chapters: await Promise.all(
                    dbo.chapters.map(
                        async (chapter) =>
                            await ChapterMapper.mapFromDb(chapter as DB_Chapter)
                    )
                ),
                collection: await CollectionMapper.mapFromDb(
                    collection as DB_Collection
                ),
                order: dbo.order,
            };
        },
        mapFromDbArray: async (dbo: DB_Event[]): Promise<Event[]> => {
            await ensureMapperCache();
            return await Promise.all(
                dbo.map(async (event) => await EventMapper.mapFromDb(event))
            );
        },
    };
    const CharacterMapper: Mapper<DB_Character, Character> = {
        map: (dto: Character): DB_Character => {
            return {
                id: dto.id,
                name: dto.name,
                author: dto.author,
                labelId: dto.label.id,
                chapters: dto.chapters.map(
                    (chapter) =>
                        ({
                            headerId: chapter.header?.id,
                            pageIds: chapter.pages.map((page) => page.id),
                        } as DB_Chapter)
                ),
                timeline: dto.timeline,
                factionIds: dto.factions.map((faction) => faction.id),
                collectionId: dto.collection.id,
            };
        },
        mapFromDb: async (dbo: DB_Character): Promise<Character> => {
            if (database === null) throw new Error("Database not loaded");
            const cache = await ensureMapperCache();
            const label = cache.localesById.get(dbo.labelId);
            if (!label) {
                throw new Error(`Label not found for character ${dbo.name}`);
            }

            const factions = dbo.factionIds
                .map((id) => cache.factionsById.get(id))
                .filter((faction): faction is DB_Faction => faction !== undefined);
            const collection = cache.collectionsById.get(dbo.collectionId);
            if (!collection) {
                throw new Error(`Collection not found for character ${dbo.name}`);
            }
            return {
                id: dbo.id,
                name: dbo.name,
                author: dbo.author,
                label: await LocaleMapper.mapFromDb(label as DB_Locale),
                chapters: dbo.chapters
                    ? await Promise.all(
                          dbo.chapters.map(
                              async (chapter) =>
                                  await ChapterMapper.mapFromDb(
                                      chapter as DB_Chapter
                                  )
                          )
                      )
                    : [],
                timeline: dbo.timeline,
                factions: await Promise.all(
                    factions.map(
                        async (faction) =>
                            await FactionMapper.mapFromDb(faction as DB_Faction)
                    )
                ),
                collection: await CollectionMapper.mapFromDb(
                    collection as DB_Collection
                ),
            };
        },
        mapFromDbArray: async (dbo: DB_Character[]): Promise<Character[]> => {
            await ensureMapperCache();
            return await Promise.all(
                dbo.map(
                    async (character) =>
                        await CharacterMapper.mapFromDb(character)
                )
            );
        },
    };
    const FactionMapper: Mapper<DB_Faction, Faction> = {
        map: (dto: Faction): DB_Faction => {
            return {
                id: dto.id,
                name: dto.name,
                author: dto.author,
                labelId: dto.label.id,
                chapters: dto.chapters.map(
                    (chapter) =>
                        ({
                            headerId: chapter.header?.id,
                            pageIds: chapter.pages.map((page) => page.id),
                        } as DB_Chapter)
                ),
                timeline: dto.timeline,
                collectionId: dto.collection.id,
            };
        },
        mapFromDb: async (dbo: DB_Faction): Promise<Faction> => {
            if (database === null) throw new Error("Database not loaded");
            const cache = await ensureMapperCache();
            const label = cache.localesById.get(dbo.labelId);
            if (!label) {
                throw new Error(`Label not found for faction ${dbo.name}`);
            }

            const collection = cache.collectionsById.get(dbo.collectionId);
            if (!collection) {
                throw new Error(`Collection not found for faction ${dbo.name}`);
            }
            return {
                id: dbo.id,
                name: dbo.name,
                author: dbo.author,
                label: await LocaleMapper.mapFromDb(label as DB_Locale),

                chapters: dbo.chapters
                    ? await Promise.all(
                          dbo.chapters.map(
                              async (chapter) =>
                                  await ChapterMapper.mapFromDb(
                                      chapter as DB_Chapter
                                  )
                          )
                      )
                    : [],
                timeline: dbo.timeline,
                collection: await CollectionMapper.mapFromDb(
                    collection as DB_Collection
                ),
            };
        },
        mapFromDbArray: async (dbo: DB_Faction[]): Promise<Faction[]> => {
            await ensureMapperCache();
            return await Promise.all(
                dbo.map(
                    async (faction) => await FactionMapper.mapFromDb(faction)
                )
            );
        },
    };

    const CollectionMapper: Mapper<DB_Collection, Collection> = {
        map: (dto: Collection): DB_Collection => {
            return {
                id: dto.id,
                name: dto.name,
            };
        },
        mapFromDb: async (dbo: DB_Collection): Promise<Collection> => {
            if (database === null) throw new Error("Database not loaded");

            return {
                id: dbo.id,
                name: dbo.name,
            };
        },
        mapFromDbArray: async (dbo: DB_Collection[]): Promise<Collection[]> => {
            return await Promise.all(
                dbo.map((collection) => CollectionMapper.mapFromDb(collection))
            );
        },
    };

    const LocaleMapper: Mapper<DB_Locale, Locale> = {
        map: (dto: Locale): DB_Locale => {
            return {
                id: dto.id,
                ishtml: dto.ishtml,

                enUS: dto.enUS,

                translations: dto.translations,
            };
        },
        mapFromDb: async (dbo: DB_Locale): Promise<Locale> => {
            return {
                id: dbo.id,
                ishtml: dbo.ishtml,

                enUS: dbo.enUS,

                translations: dbo.translations,
            };
        },
        mapFromDbArray: async (dbo: DB_Locale[]): Promise<Locale[]> => {
            return await Promise.all(
                dbo.map(async (locale) => await LocaleMapper.mapFromDb(locale))
            );
        },
    };

    const ChapterMapper: LocalMapper<DB_Chapter, Chapter> = {
        map: (dto: Chapter): DB_Chapter => {
            return {
                headerId: dto.header?.id,
                pageIds: dto.pages.map((locale) => locale.id),
            };
        },
        mapFromDb: async (dbo: DB_Chapter): Promise<Chapter> => {
            if (database === null) throw new Error("Database not loaded");
            const cache = await ensureMapperCache();
            const pages = dbo.pageIds
                .map((id) => cache.localesById.get(id))
                .filter((locale): locale is DB_Locale => locale !== undefined);
            const header = dbo.headerId
                ? cache.localesById.get(dbo.headerId)
                : undefined;

            return {
                header: dbo.headerId
                    ? header
                        ? await LocaleMapper.mapFromDb(header)
                        : null
                    : null,
                pages: await Promise.all(
                    pages.map(
                        async (locale) =>
                            await LocaleMapper.mapFromDb(locale as DB_Locale)
                    )
                ),
            };
        },
        mapFromDbArray: async (dbo: DB_Chapter[]): Promise<Chapter[]> => {
            await ensureMapperCache();
            return await Promise.all(
                dbo.map(
                    async (chapter) => await ChapterMapper.mapFromDb(chapter)
                )
            );
        },
    };

    const context: ContextValue = {
        getAll,
        get,
        add,
        update,
        remove,
        mappers: {
            events: EventMapper,
            characters: CharacterMapper,
            factions: FactionMapper,
            collections: CollectionMapper,
            locales: LocaleMapper,
            chapters: ChapterMapper,
        },
        load,
        loading,
        //validate,
    };

    return (
        <dbRepository.Provider value={context}>
            {loaded ? children : <Loader />}
        </dbRepository.Provider>
    );
}
