import { useState, Fragment, useRef, useEffect } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { normalize, join, dirname } from "@tauri-apps/api/path";
import { exists, lstat, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { AsyncDatabase } from "neutron-db";

import {
    ContextValue,
    HistoryEntry,
    tableNames,
    dbRepository,
} from "./dbcontext";

import { DbObject, Schema } from "./jsondb/types";
import {
    DB_Character,
    DB_Collection,
    DB_Faction,
    DB_Locale,
} from "./models";
import Loader from "./loader";
import { createMappers, MapperCache } from "./mappers";

/**
 * Replicates the path resolution logic of AsyncDatabase.create() so we can
 * locate the JSON file before the database is opened (needed for the .bak backup).
 */
async function resolveDbPath(location: string, dbname: string): Promise<string> {
    const normalizedLocation = await normalize(location);
    if (await exists(normalizedLocation)) {
        const metadata = await lstat(normalizedLocation);
        if (metadata.isDirectory) {
            return await join(normalizedLocation, dbname + ".json");
        }
        return normalizedLocation; // it's already a file
    }
    // Location doesn't exist yet — determine the intended file path
    if (normalizedLocation.toLowerCase().endsWith(".json")) {
        return normalizedLocation;
    }
    return await join(await dirname(normalizedLocation), dbname + ".json");
}

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

    const [database, setDatabase] = useState<AsyncDatabase | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [loaded, setLoaded] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [lastLoadedPath, setLastLoadedPath] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const mapperCacheRef = useRef<MapperCache | null>(null);

    // Dispose the database when a new one is loaded or the component unmounts.
    useEffect(() => {
        return () => {
            database?.dispose();
        };
    }, [database]);

    const invalidateMapperCache = () => {
        mapperCacheRef.current = null;
    };

    const ensureMapperCache = async (): Promise<MapperCache> => {
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

    const loadCore = async (location: string): Promise<void> => {
        const schema: Schema = {
            dbname: dbschema.dbname,
            tables: dbschema.tables,
            oneIndexed: true,
            compressedJson: true,
            writeDebounceMs: dbschema.writeDebounceMs,
            autoSaveIntervalMs: dbschema.autoSaveIntervalMs,
            location,
        };

        const dbpath = await resolveDbPath(location, dbschema.dbname);
        if (await exists(dbpath)) {
            const json = await readTextFile(dbpath);
            await writeTextFile(dbpath + ".bak", json);
        }

        const database = await AsyncDatabase.create(schema);

        for (const table of schema.tables) {
            const rows = await database.getAll(table);
            for (const [index, row] of rows.entries()) {
                if (typeof row.id !== "number") {
                    await database.dispose();
                    throw new Error(
                        `Row ${index} in table "${table}" has missing or non-numeric 'id' (got ${JSON.stringify((row as unknown as Record<string, unknown>).id)})`
                    );
                }
            }
        }

        setDatabase(database);
        invalidateMapperCache();
        setLoaded(true);
        setLastLoadedPath(location);
        setHistory([]);
    };

    const load = async () => {
        if (loading) return;
        setLoading(true);
        setLoadError(null);

        try {
            let location = dbschema.location;

            if (location === undefined) {
                const chosenLocation = await open({
                    multiple: false,
                    directory: false,
                });
                if (chosenLocation !== null) {
                    location = chosenLocation;
                } else {
                    console.warn("DB load cancelled by user.");
                    return;
                }
            }

            await loadCore(location);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Failed to load DB:", err);
            setLoadError(message);
        } finally {
            setLoading(false);
        }
    };

    const loadFromPath = async (path: string): Promise<void> => {
        if (loading) return;
        setLoading(true);
        setLoadError(null);
        try {
            await loadCore(path);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Failed to load DB:", err);
            setLoadError(message);
        } finally {
            setLoading(false);
        }
    };

    const saveAs = async (): Promise<void> => {
        if (!lastLoadedPath) return;
        const destPath = await save({
            filters: [{ name: "JSON Database", extensions: ["json"] }],
        });
        if (!destPath) return;
        try {
            const srcPath = await resolveDbPath(lastLoadedPath, dbschema.dbname);
            const content = await readTextFile(srcPath);
            await writeTextFile(destPath, content);
            // Switch the active database to the saved location
            if (loading) return;
            setLoading(true);
            setLoadError(null);
            try {
                await loadCore(destPath);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setLoadError(message);
            } finally {
                setLoading(false);
            }
        } catch (err) {
            console.error("Save as failed:", err);
        }
    };

    const createNew = async (): Promise<void> => {
        const destPath = await save({
            defaultPath: "NewChroniclesDB.json",
            filters: [{ name: "JSON Database", extensions: ["json"] }],
        });
        if (!destPath) return;
        const emptyDb: Record<string, unknown[]> = {};
        for (const table of dbschema.tables) {
            emptyDb[table] = [];
        }
        await writeTextFile(destPath, JSON.stringify(emptyDb, null, 4));
        if (loading) return;
        setLoading(true);
        setLoadError(null);
        try {
            await loadCore(destPath);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setLoadError(message);
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
        if (inserted) {
            setHistory((prev) => [
                { action: "add", table: dbName, id: inserted.id, timestamp: new Date() },
                ...prev.slice(0, 99),
            ]);
        }
        return inserted;
    };

    const update = async <T extends DbObject>(
        row: T,
        dbName: string
    ): Promise<T | null> => {
        if (database === null) return null;
        const updated = await database.update<T>(row, dbName);
        invalidateMapperCache();
        if (updated) {
            setHistory((prev) => [
                { action: "update", table: dbName, id: updated.id, timestamp: new Date() },
                ...prev.slice(0, 99),
            ]);
        }
        return updated;
    };

    const remove = async (id: number, dbName: string): Promise<void> => {
        if (database === null) return;
        await database.delete(id, dbName);
        invalidateMapperCache();
        setHistory((prev) => [
            { action: "remove", table: dbName, id, timestamp: new Date() },
            ...prev.slice(0, 99),
        ]);
    };

    const mappers = createMappers(database, ensureMapperCache);

    const context: ContextValue = {
        getAll,
        get,
        add,
        update,
        remove,
        mappers,
        load,
        loadFromPath,
        saveAs,
        createNew,
        lastLoadedPath,
        history,
        loading,
        loadError,
    };

    return (
        <dbRepository.Provider value={context}>
            {loaded ? children : <Loader />}
        </dbRepository.Provider>
    );
}
