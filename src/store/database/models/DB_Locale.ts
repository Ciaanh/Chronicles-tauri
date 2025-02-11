import { DbObject } from "neutron-db/lib/types";

export interface DB_Locale extends DbObject {
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
