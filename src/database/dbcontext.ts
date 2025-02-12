import { createContext } from "react";
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
    Dto,
    Event,
    Faction,
    Locale,
} from "./models";
import { DbObject } from "./jsondb/types";

type TablesList = {
    events: string;
    characters: string;
    factions: string;
    collections: string;
    locales: string;
    chapters: string;
};

export const tableNames: TablesList = {
    events: "events",
    characters: "characters",
    factions: "factions",
    collections: "collections",
    locales: "locales",
    chapters: "chapters",
};

export interface Mapper<T extends DbObject, U extends Dto> {
    map: (dto: U) => T;
    mapFromDb: (dbo: T) => Promise<U>;
    mapFromDbArray: (dbo: T[]) => Promise<U[]>;
}

export interface ContextValue {
    getAll: <T extends DbObject>(dbName: string) => Promise<T[]>;
    get: <T extends DbObject>(id: number, dbName: string) => Promise<T | null>;
    add: <T extends DbObject>(row: T, dbName: string) => Promise<T | null>;
    update: <T extends DbObject>(row: T, dbName: string) => Promise<T | null>;
    remove: (id: number, dbName: string) => Promise<void>;
    mappers: {
        events: Mapper<DB_Event, Event>;
        characters: Mapper<DB_Character, Character>;
        factions: Mapper<DB_Faction, Faction>;
        collections: Mapper<DB_Collection, Collection>;
        locales: Mapper<DB_Locale, Locale>;
        chapters: Mapper<DB_Chapter, Chapter>;
    };
}

export const dbcontext = createContext({} as ContextValue);
