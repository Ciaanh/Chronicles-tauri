import { Dto } from "./_dto";
import { Chapter } from "./Chapter";
import { Collection } from "./Collection";
import { Faction } from "./Faction";
import { Locale } from "./Locale";

export interface Character extends Dto {
    name: string;
    label: Locale;
    // biography: Locale; // phased out and converted to chapters
    chapters: Chapter[];
    timeline: number;
    factions: Faction[];
    collection: Collection;
}
