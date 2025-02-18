import { Language } from "../../../constants";
import { DbObject } from "../../jsondb/types";
import { EnumDictionary } from "../EnumDictionary";

export interface DB_Locale extends DbObject {
    ishtml: boolean;

    enUS: string;

    translations: EnumDictionary<Language, string>;
}
