import { DbObject } from "../../jsondb/types";

export interface DB_Faction extends DbObject {
    name: string;
    labelId: number;
    descriptionId: number;
    timeline: number;
    collectionId: number;
}
