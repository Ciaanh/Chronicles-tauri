import { Dto } from "./_dto";
import { Chapter } from "./Chapter";
import { Character } from "./Character";
import { DbName } from "./DbName";
import { Faction } from "./Faction";
import { Locale } from "./Locale";

export interface Event extends Dto {
    name: string;
    yearStart: number | null;
    yearEnd: number | null;
    eventType: number;
    timeline: number;
    link: string;
    factions: Faction[];
    characters: Character[];
    label: Locale;
    description: Locale[];
    chapters: Chapter[];
    dbname: DbName;
    order: number;
}
