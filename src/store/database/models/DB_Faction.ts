import { DbObject } from "neutron-db/lib/types";

export interface DB_Faction extends DbObject {
    name: string;
    labelId: number;
    descriptionId: number;
    timeline: number;
    dbnameId: number;
}