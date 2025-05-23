import { DbObject } from "../../jsondb/types";
import { DB_Chapter } from "./DB_Chapter";

export interface DB_Character extends DbObject {
    name: string;
    labelId: number;
    // biographyId: number; // phased out and converted to chapters
    chapters: DB_Chapter[];
    timeline: number;
    factionIds: number[];
    collectionId: number;
}
