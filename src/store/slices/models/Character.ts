import { Dto } from "./_dto";
import { DbName } from "./DbName";
import { Faction } from "./Faction";
import { Locale } from "./Locale";

export interface Character extends Dto {
    name: string;
    label: Locale;
    biography: Locale;
    timeline: number;
    factions: Faction[];
    dbname: DbName;
}
