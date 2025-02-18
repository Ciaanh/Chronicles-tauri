import { useState, Fragment } from "react";
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
import { data } from "react-router-dom";

export interface dbSchema {
    tables: string[];
    dbname: string;
    location: string | undefined;
}

export interface dbProviderProps {
    children: JSX.Element[] | JSX.Element;
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

    const load = async () => {
        if (loading) return;
        setLoading(true);

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
                console.error("No location provided to dbContextProvider");
                return;
            }
        }

        const schema: Schema = {
            dbname: currentSchema.dbname,
            tables: currentSchema.tables,
            oneIndexed: true,
            compressedJson: true,
            location: currentSchema.location,
        };

        const database = await Database.create(schema);
        console.log(database);

        setDatabase(database);
        setLoaded(true);
        setLoading(false);
    };

    // const validate = async () => {
    //     const currentSchema: dbSchema = {
    //         dbname: dbschema.dbname,
    //         tables: dbschema.tables,
    //         location: dbschema.location,
    //     };

    //     if (currentSchema.location === undefined) {
    //         const chosenLocation = await open({
    //             multiple: false,
    //             directory: false,
    //         });
    //         if (chosenLocation !== null) {
    //             currentSchema.location = chosenLocation;
    //         } else {
    //             console.error("No location provided to dbContextProvider");
    //             return;
    //         }
    //     }

    //     const schema: Schema = {
    //         dbname: currentSchema.dbname,
    //         tables: currentSchema.tables,
    //         oneIndexed: true,
    //         compressedJson: true,
    //         location: currentSchema.location,
    //     };

    //     const database = await Database.create(schema);

    //     const events = await database.getAll<DB_Event>(tableNames.events);

    //     for (const event of events) {
    //         console.log(event);
    //         if (event.descriptionIds.length > 0) {
    //             if (event.chapters === undefined) event.chapters = [];

    //             if (event.chapters?.length === 0) {
    //                 const newChapter: DB_Chapter = {
    //                     headerId: undefined,
    //                     pageIds: event.descriptionIds,
    //                 };
    //                 event.descriptionIds = [];
    //                 event.chapters = [newChapter];
    //             }
    //             var updated = await database.update(event, tableNames.events);
    //         }
    //     }

    //     const locales = await database.getAll<DB_Locale>(tableNames.locales);

    //     for (const locale of locales) {
    //         await database.update(locale, tableNames.locales);
    //     }
    // };

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
        return await database.insert<T>(row, dbName);
    };

    const update = async <T extends DbObject>(
        row: T,
        dbName: string
    ): Promise<T | null> => {
        if (database === null) return null;
        return await database.update<T>(row, dbName);
    };

    const remove = async (id: number, dbName: string): Promise<void> => {
        if (database === null) return;
        await database.delete(id, dbName);
    };

    const EventMapper: Mapper<DB_Event, Event> = {
        map: (dto: Event): DB_Event => {
            return {
                id: dto._id,
                name: dto.name,
                yearStart: dto.period?.yearStart ?? 0,
                yearEnd: dto.period?.yearEnd ?? 0,
                eventType: dto.eventType,
                timeline: dto.timeline,
                link: dto.link,
                factionIds: dto.factions.map((faction) => faction._id),
                characterIds: dto.characters.map((character) => character._id),
                labelId: dto.label._id,
                //descriptionIds: dto.description.map((locale) => locale._id),
                chapters: dto.chapters.map(
                    (chapter) =>
                        ({
                            headerId: chapter.header?._id,
                            pageIds: chapter.pages.map((page) => page._id),
                        } as DB_Chapter)
                ),
                collectionId: dto.collection._id,
                order: dto.order,
            };
        },
        mapFromDb: async (dbo: DB_Event): Promise<Event> => {
            if (dbo === null) {
                console.log(dbo);
                debugger;
            }
            if (database === null) throw new Error("Database not loaded");

            const factions = await database.getAll(
                tableNames.factions,
                (faction) => dbo.factionIds.includes(faction.id)
            );
            const characters = await database.getAll(
                tableNames.characters,
                (character) => dbo.characterIds.includes(character.id)
            );
            const label = await database.get(dbo.labelId, tableNames.locales);
            // const description = await database.getAll(
            //     tableNames.locales,
            //     (locale) => dbo.descriptionIds.includes(locale.id)
            // );
            const collection = await database.get(
                dbo.collectionId,
                tableNames.locales
            );

            return {
                _id: dbo.id,
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
                // description: await Promise.all(
                //     description.map(
                //         async (locale) =>
                //             await LocaleMapper.mapFromDb(locale as DB_Locale)
                //     )
                // ),
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
            return await Promise.all(
                dbo.map(async (event) => await EventMapper.mapFromDb(event))
            );
        },
    };

    const CharacterMapper: Mapper<DB_Character, Character> = {
        map: (dto: Character): DB_Character => {
            return {
                id: dto._id,
                name: dto.name,
                labelId: dto.label._id,
                biographyId: dto.biography._id,
                timeline: dto.timeline,
                factionIds: dto.factions.map((faction) => faction._id),
                collectionId: dto.collection._id,
            };
        },
        mapFromDb: async (dbo: DB_Character): Promise<Character> => {
            if (database === null) throw new Error("Database not loaded");

            const label = await database.get(dbo.labelId, tableNames.locales);
            if (!label) {
                throw new Error(`Label not found for character ${dbo.name}`);
            }

            const biography = await database.get(
                dbo.biographyId,
                tableNames.locales
            );
            if (!biography) {
                throw new Error(
                    `Biography not found for character ${dbo.name}`
                );
            }

            const factions = await database.getAll(
                tableNames.factions,
                (faction) => dbo.factionIds.includes(faction.id)
            );
            const collection = await database.get(
                dbo.collectionId,
                tableNames.collections
            );

            return {
                _id: dbo.id,
                name: dbo.name,
                label: await LocaleMapper.mapFromDb(label as DB_Locale),
                biography: await LocaleMapper.mapFromDb(biography as DB_Locale),
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
                id: dto._id,
                name: dto.name,
                labelId: dto.label._id,
                descriptionId: dto.description._id,
                timeline: dto.timeline,
                collectionId: dto.collection._id,
            };
        },
        mapFromDb: async (dbo: DB_Faction): Promise<Faction> => {
            if (database === null) throw new Error("Database not loaded");

            const label = await database.get(dbo.labelId, tableNames.locales);
            if (!label) {
                throw new Error(`Label not found for faction ${dbo.name}`);
            }

            const description = await database.get(
                dbo.descriptionId,
                tableNames.locales
            );
            if (!description) {
                throw new Error(
                    `Description not found for faction ${dbo.name}`
                );
            }

            const collection = await database.get(
                dbo.collectionId,
                tableNames.collections
            );
            if (!collection) {
                throw new Error(`DBName not found for faction ${dbo.name}`);
            }

            return {
                _id: dbo.id,
                name: dbo.name,
                label: await LocaleMapper.mapFromDb(label as DB_Locale),
                description: await LocaleMapper.mapFromDb(
                    description as DB_Locale
                ),
                timeline: dbo.timeline,
                collection: await CollectionMapper.mapFromDb(
                    collection as DB_Collection
                ),
            };
        },
        mapFromDbArray: async (dbo: DB_Faction[]): Promise<Faction[]> => {
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
                id: dto._id,
                name: dto.name,
            };
        },
        mapFromDb: async (dbo: DB_Collection): Promise<Collection> => {
            if (database === null) throw new Error("Database not loaded");

            return {
                _id: dbo.id,
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
                id: dto._id,
                ishtml: dto.ishtml,

                enUS: dto.enUS,

                translations: dto.translations,
            };
        },
        mapFromDb: async (dbo: DB_Locale): Promise<Locale> => {
            return {
                _id: dbo.id,
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
                headerId: dto.header?._id,
                pageIds: dto.pages.map((locale) => locale._id),
            };
        },
        mapFromDb: async (dbo: DB_Chapter): Promise<Chapter> => {
            if (database === null) throw new Error("Database not loaded");

            const pages = await database.getAll(tableNames.locales, (locale) =>
                dbo.pageIds.includes(locale.id)
            );

            return {
                header: dbo.headerId
                    ? await LocaleMapper.mapFromDb(
                          (await database.get(
                              dbo.headerId,
                              tableNames.locales
                          )) as DB_Locale
                      )
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
        //validate,
    };

    return (
        <dbRepository.Provider value={context}>
            {loaded ? children : <Loader />}
        </dbRepository.Provider>
    );
}
