import { Dto } from "./_dto";
import { Chapter } from "./Chapter";
import { Collection } from "./Collection";
import { Locale } from "./Locale";

export interface Faction extends Dto {
    name: string;
    label: Locale;
    // description: Locale; // phased out and converted to chapters
    chapters: Chapter[];
    timeline: number;
    collection: Collection;
}
