import { DbObject } from "../../jsondb/types";

export interface DB_Character extends DbObject {
    name: string;
    labelId: number;
    biographyId: number;
    timeline: number;
    factionIds: number[];
    collectionId: number;
}
