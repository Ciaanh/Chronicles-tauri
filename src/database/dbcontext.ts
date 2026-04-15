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

/** Minimal write-capable context passed to transaction callbacks and utilities. */
export interface DbWriteContext {
    getAll: <T extends DbObject>(dbName: string) => Promise<T[]>;
    get: <T extends DbObject>(id: number, dbName: string) => Promise<T | null>;
    add: <T extends DbObject>(row: T, dbName: string) => Promise<T | null>;
    update: <T extends DbObject>(row: T, dbName: string) => Promise<T | null>;
    remove: (id: number, dbName: string) => Promise<void>;
}

export type HistoryAction = "add" | "update" | "remove";

export interface HistoryEntry {
    action: HistoryAction;
    table: string;
    id: number;
    timestamp: Date;
}

type TablesList = {
    events: string;
    characters: string;
    factions: string;
    collections: string;
    locales: string;
};

export const tableNames: TablesList = {
    events: "events",
    characters: "characters",
    factions: "factions",
    collections: "collections",
    locales: "locales",
};

export interface Mapper<T extends DbObject, U extends Dto> {
    map: (dto: U) => T;
    mapFromDb: (dbo: T) => Promise<U>;
    mapFromDbArray: (dbo: T[]) => Promise<U[]>;
}

export interface LocalMapper<T, U> {
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
    transaction: (fn: (tx: DbWriteContext) => Promise<void>) => Promise<void>;
    mappers: {
        events: Mapper<DB_Event, Event>;
        characters: Mapper<DB_Character, Character>;
        factions: Mapper<DB_Faction, Faction>;
        collections: Mapper<DB_Collection, Collection>;
        locales: Mapper<DB_Locale, Locale>;
        chapters: LocalMapper<DB_Chapter, Chapter>;
    };
    load: () => void;
    loadFromPath: (path: string) => Promise<void>;
    saveAs: () => Promise<void>;
    createNew: () => Promise<void>;
    lastLoadedPath: string | null;
    history: HistoryEntry[];
    loading: boolean;
    loadError: string | null;
    //validate: () => void;
}

export const dbRepository = createContext({} as ContextValue);
