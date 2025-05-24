import { Dto } from "./_dto";
import { Chapter } from "./Chapter";
import { Collection } from "./Collection";
import { Locale } from "./Locale";

export interface Faction extends Dto {
    name: string;
    label: Locale;
    chapters: Chapter[];
    timeline: number;
    collection: Collection;
}
