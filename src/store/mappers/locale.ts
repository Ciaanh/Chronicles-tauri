import { DB_Locale } from "../database/models/DB_Locale";
import { Locale } from "../slices/models/Locale";

export function MapLocale(locale: Locale): DB_Locale {
    return {
        id: locale._id,
        ishtml: locale.ishtml,

        enUS: locale.enUS,

        deDE: locale.deDE,
        esES: locale.esES,
        esMX: locale.esMX,
        frFR: locale.frFR,
        itIT: locale.itIT,
        ptBR: locale.ptBR,
        ruRU: locale.ruRU,
        koKR: locale.koKR,
        zhCN: locale.zhCN,
        zhTW: locale.zhTW,
    };
}

export function MapLocaleFromDB(locale: DB_Locale): Locale {
    return {
        _id: locale.id,
        ishtml: locale.ishtml,

        enUS: locale.enUS,

        deDE: locale.deDE,
        esES: locale.esES,
        esMX: locale.esMX,
        frFR: locale.frFR,
        itIT: locale.itIT,
        ptBR: locale.ptBR,
        ruRU: locale.ruRU,
        koKR: locale.koKR,
        zhCN: locale.zhCN,
        zhTW: locale.zhTW,
    };
}

export function MapLocalesFromDB(locales: DB_Locale[]): Locale[] {
    if (!locales) return [];
    return locales.map((locale) => MapLocaleFromDB(locale));
}
