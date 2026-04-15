// DbObject and Schema are kept as local definitions because neutron-db does not
// export them from its public API. They are structurally identical to the ones
// used internally by neutron-db, so TypeScript's structural typing ensures
// full compatibility when calling AsyncDatabase methods.
export interface DbObject {
    id: number;
}

export interface Tables {
    [key: string]: DbObject[];
}

export interface Schema {
    tables: string[];
    dbname: string;
    oneIndexed?: boolean;
    compressedJson?: boolean;
    writeDebounceMs?: number;
    autoSaveIntervalMs?: number;
    location: string;
}
