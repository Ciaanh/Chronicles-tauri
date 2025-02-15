import { Dto } from "./_dto";
import { Chapter } from "./Chapter";
import { Character } from "./Character";
import { Collection } from "./Collection";
import { Faction } from "./Faction";
import { Locale } from "./Locale";

export interface Event extends Dto {
    name: string;
    eventType: number;
    timeline: number;
    link: string;
    factions: Faction[];
    characters: Character[];
    label: Locale;
    description: Locale[];
    chapters: Chapter[];
    collection: Collection;
    order: number;

    period: { yearStart: number| null; yearEnd: number| null };
}
