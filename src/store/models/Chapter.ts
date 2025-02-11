import { Dto } from "./_dto";
import { Locale } from "./Locale";

export interface Chapter extends Dto {
    header: Locale | null;
    pages: Locale[];
}
