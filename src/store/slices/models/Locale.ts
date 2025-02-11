import { Dto } from "./_dto";

export interface Locale extends Dto {
    ishtml: boolean;

    enUS: string;
    deDE: string | null;
    esES: string | null;
    esMX: string | null;
    frFR: string | null;
    itIT: string | null;
    ptBR: string | null;
    ruRU: string | null;
    koKR: string | null;
    zhCN: string | null;
    zhTW: string | null;
}

function cleanString(value: string): string {
    const cleaned = value
        .replace(/(?:\r\n|\r|\n)/g, " ")
        .replace(/\s\s+/g, " ")
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
        .trim()
        .replace(/\s/g, "_")
        .substring(0, 50)
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");

    return cleaned;
}

export function getLocaleKey(locale: Locale): string {
    if (!locale || locale.enUS === null) {
        return "<not set>";
    }
    return `${locale._id}_${cleanString(locale.enUS)}`;
}

export function getEmptyLocale(): Locale {
    return {
        _id: null,
        ishtml: false,

        enUS: null,

        deDE: null,
        esES: null,
        esMX: null,
        frFR: null,
        itIT: null,
        ptBR: null,
        ruRU: null,
        koKR: null,
        zhCN: null,
        zhTW: null,
    };
}
