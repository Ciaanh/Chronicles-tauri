import { DbObject } from "neutron-db/lib/types";

export interface DB_DbName extends DbObject {
    name: string;
}