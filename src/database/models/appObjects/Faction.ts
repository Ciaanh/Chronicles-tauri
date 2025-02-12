import { Dto } from "./_dto";
import { Collection } from "./Collection";
import { Locale } from "./Locale";

export interface Faction extends Dto {
    name: string;
    label: Locale;
    description: Locale;
    timeline: number;
    collection: Collection;
}