import { DbObject } from "../../jsondb/types";
import { DB_Chapter } from "./DB_Chapter";

export interface DB_Faction extends DbObject {
    name: string;
    labelId: number;
    // descriptionId: number; // phased out and converted to chapters
    chapters: DB_Chapter[];
    timeline: number;
    collectionId: number;
}
