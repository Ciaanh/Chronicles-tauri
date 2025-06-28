import { DbObject } from "../../jsondb/types";
import { DB_Chapter } from "./DB_Chapter";

export interface DB_Character extends DbObject {
    name: string;
    author: string;
    labelId: number;
    chapters: DB_Chapter[];
    timeline: number;
    factionIds: number[];
    collectionId: number;
    description?: string; // Cover page description
    image?: string; // Cover page image path
}
