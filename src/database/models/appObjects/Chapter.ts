import { Locale } from "./Locale";

export interface Chapter {
    header: Locale | null;
    pages: Locale[];
}
