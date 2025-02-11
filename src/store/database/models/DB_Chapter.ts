import { DbObject } from "neutron-db/lib/types";

export interface DB_Chapter extends DbObject {
    headerId: number | null;
    pageIds: number[];
}