import { DbObject } from "../../jsondb/types";
import { DB_Chapter } from "./DB_Chapter";

export interface DB_Event extends DbObject {
    name: string;
    yearStart: number;
    yearEnd: number;
    eventType: number;
    timeline: number;
    collectionId: number;

    link: string;

    factionIds: number[];
    characterIds: number[];

    labelId: number;
    chapters: DB_Chapter[];

    order: number;
}
