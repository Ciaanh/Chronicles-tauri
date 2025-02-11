import { Dto } from "./_dto";
import { Collection } from "./Collection";
import { Faction } from "./Faction";
import { Locale } from "./Locale";

export interface Character extends Dto {
    name: string;
    label: Locale;
    biography: Locale;
    timeline: number;
    factions: Faction[];
    collection: Collection;
}
