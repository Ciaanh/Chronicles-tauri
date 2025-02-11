import { DbObject } from "neutron-db/lib/types";

export interface DB_Collection extends DbObject {
    name: string;
}