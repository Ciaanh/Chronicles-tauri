import { DbObject } from "../../jsondb/types";
import { DB_Chapter } from "./DB_Chapter";

export interface DB_Faction extends DbObject {
    name: string;
    author: string;
    labelId: number;
    chapters: DB_Chapter[];
    timeline: number;
    collectionId: number;
    description?: string; // Cover page description
    image?: string; // Cover page image path
}
