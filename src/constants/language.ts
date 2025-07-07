import { Language } from "../constants";
import { EnumDictionary } from "../database/models/EnumDictionary";

export const defaultTranslations: EnumDictionary<Language, string> = {
  enUS: "",
  deDE: "",
  esES: "",
  esMX: "",
  frFR: "",
  itIT: "",
  ptBR: "",
  ruRU: "",
  koKR: "",
  zhCN: "",
  zhTW: "",
};

export const languageNames: Record<Language, string> = {
  enUS: "English",
  deDE: "German",
  esES: "Spanish (EU)",
  esMX: "Spanish (MX)",
  frFR: "French",
  itIT: "Italian",
  ptBR: "Portuguese (BR)",
  ruRU: "Russian",
  koKR: "Korean",
  zhCN: "Chinese (CN)",
  zhTW: "Chinese (TW)",
};

export const languageCountryCodes: Record<Language, string> = {
  enUS: "US",
  deDE: "DE",
  esES: "ES",
  esMX: "MX",
  frFR: "FR",
  itIT: "IT",
  ptBR: "BR",
  ruRU: "RU",
  koKR: "KR",
  zhCN: "CN",
  zhTW: "TW",
};
