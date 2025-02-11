import { DbObject } from "neutron-db/lib/types";

export interface DB_Character extends DbObject {
    name: string;
    labelId: number;
    biographyId: number;
    timeline: number;
    factionIds: number[];
    dbnameId: number;
}
