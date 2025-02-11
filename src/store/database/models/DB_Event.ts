import { DbObject } from "neutron-db/lib/types";

export interface DB_Event extends DbObject {
    name: string;
    yearStart: number;
    yearEnd: number;
    eventType: number;
    timeline: number;
    link: string;
    factionIds: number[];
    characterIds: number[];
    labelId: number;
    descriptionIds: number[];
    chapterIds: number[];
    dbnameId: number;
    order: number;
}
