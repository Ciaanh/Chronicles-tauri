import { Dto } from "./_dto";
import { DbName } from "./DbName";
import { Locale } from "./Locale";

export interface Faction extends Dto {
    name: string;
    label: Locale;
    description: Locale;
    timeline: number;
    dbname: DbName;
}