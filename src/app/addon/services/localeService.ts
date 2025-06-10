import {
    getLocaleKey,
    Locale,
} from "../../../database/models/appObjects/Locale";
import { Language } from "../../../constants";
import { Character } from "../../../database/models/appObjects/Character";
import { Event } from "../../../database/models/appObjects/Event";
import { Faction } from "../../../database/models/appObjects/Faction";
import { FileContent } from "../../../_utils/files/fileContent";
import { FileGenerationRequest, FormatedCollection } from "../generator";

interface localeLine {
    key: string;
    value: string;
    ishtml: boolean;
}

interface localeGroup {
    fileName: string;
    indexLine: string;
    localeLines: localeLine[];
}

const LanguageArray = [
    Language.enUS,
    Language.frFR,
    Language.deDE,
    Language.esES,
    Language.esMX,
    Language.itIT,
    Language.ptBR,
    Language.ruRU,
    Language.koKR,
    Language.zhCN,
    Language.zhTW,
];

export class LocaleService {
    Generate(request: FileGenerationRequest) {
        return this.CreateLocaleFiles(request);
    }

    private FormatCollection(collection: string) {
        return collection.replace(/\w+/g, function (w) {
            return w[0].toUpperCase() + w.slice(1).toLowerCase();
        });
    }

    private FormatIndex(fileName: string) {
        return `    <Script file=\"${fileName}\" />`;
    }

    private FormatLocaleFileName(
        index: string,
        collection: string,
        language: string,
        typeName: string
    ) {
        const lowerName = collection.toLowerCase();
        const formatedName = this.FormatCollection(collection);
        const lowerTypeName = typeName.toLowerCase();
        return `${index}_${formatedName}\\${lowerName}_${lowerTypeName}s_${language}.lua`;
    }

    private CreateLocaleFiles(request: FileGenerationRequest) {
        const dbLocaleGroups = request.collections.map(
            (collection: FormatedCollection) => {
                const filteredEvents = request.events.filter(
                    (event: Event) =>
                        event.collection &&
                        String(event.collection.id) == String(collection.id)
                );
                const filteredFactions = request.factions.filter(
                    (faction: Faction) =>
                        faction.collection &&
                        String(faction.collection.id) == String(collection.id)
                );
                const filteredCharacters = request.characters.filter(
                    (character: Character) =>
                        character.collection &&
                        String(character.collection.id) == String(collection.id)
                );

                const localeGroups = LanguageArray.map((language) => {
                    const localeGroups: Array<localeGroup> = [];

                    if (filteredEvents.length > 0) {
                        const fileName = this.FormatLocaleFileName(
                            collection.index,
                            collection.name,
                            language,
                            "Event"
                        );

                        const localeGroup: localeGroup = {
                            fileName: fileName,
                            indexLine: this.FormatIndex(fileName),
                            localeLines: this.ExtractEventLocales(
                                filteredEvents,
                                language
                            ),
                        };
                        localeGroups.push(localeGroup);
                    }
                    if (filteredFactions.length > 0) {
                        const fileName = this.FormatLocaleFileName(
                            collection.index,
                            collection.name,
                            language,
                            "Faction"
                        );

                        const localeGroup: localeGroup = {
                            fileName: fileName,
                            indexLine: this.FormatIndex(fileName),
                            localeLines: this.ExtractFactionLocales(
                                filteredFactions,
                                language
                            ),
                        };
                        localeGroups.push(localeGroup);
                    }
                    if (filteredCharacters.length > 0) {
                        const fileName = this.FormatLocaleFileName(
                            collection.index,
                            collection.name,
                            language,
                            "Character"
                        );

                        const localeGroup: localeGroup = {
                            fileName: fileName,
                            indexLine: this.FormatIndex(fileName),
                            localeLines: this.ExtractCharacterLocales(
                                filteredCharacters,
                                language
                            ),
                        };
                        localeGroups.push(localeGroup);
                    }

                    return localeGroups;
                });

                const locales: localeGroup[] = [];
                localeGroups.forEach((dbLocaleGroup: localeGroup[]) => {
                    locales.push(...dbLocaleGroup);
                });
                return locales;
            }
        );

        const dbLocales: localeGroup[] = [];
        dbLocaleGroups.forEach((dbLocaleGroup: localeGroup[]) => {
            dbLocales.push(...dbLocaleGroup);
        });

        const indexFile = this.CreateIndexFile(dbLocales);
        const localeFileContents = this.CreateLocalesFile(dbLocales);

        localeFileContents.push(indexFile);
        return localeFileContents;
    }

    private CreateLocalesFile(dbLocales: localeGroup[]): FileContent[] {
        return dbLocales
            .map((localeGroup: localeGroup) => {
                const localeContent = localeGroup.localeLines
                    .filter((localline) => {
                        return (
                            localline.value.length > 0 &&
                            localline.value !== " " &&
                            localline.value !== "null" &&
                            localline.value !== null
                        );
                    })
                    .map((localline) => localline.value)
                    .join("\n");

                if (localeContent.length > 0) {
                    const localeFile: FileContent = {
                        content: `local AceLocale = LibStub:GetLibrary(\"AceLocale-3.0\")\nlocal L = AceLocale:NewLocale(\"Chronicles\", \"enUS\", true, true)\n                \n${localeContent}`,
                        name: `DB/Locales/${localeGroup.fileName}`,
                    };
                    return localeFile;
                }
                return null;
            })
            .filter((file) => file != null) as FileContent[];
    }

    private CreateIndexFile(dbLocales: localeGroup[]) {
        const indexContent = dbLocales
            .filter((localeGroup) => {
                return (
                    localeGroup.indexLine.length > 0 &&
                    localeGroup.localeLines.filter((localline) => {
                        return (
                            localline.value.length > 0 &&
                            localline.value !== " " &&
                            localline.value !== "null" &&
                            localline.value !== null
                        );
                    }).length > 0
                );
            })
            .map((localeGroup) => {
                return localeGroup.indexLine;
            })
            .join("\n");

        const indexFile: FileContent = {
            content: `<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<Ui xmlns=\"http://www.blizzard.com/wow/ui/\"\n    xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.blizzard.com/wow/ui/\">\n${indexContent}\n</Ui>`,
            name: "DB/Locales/Locales.xml",
        };
        return indexFile;
    }

    private ExtractEventLocales(
        events: Event[],
        language: Language
    ): localeLine[] {
        const result: localeLine[] = [];
        events.forEach((event: Event) => {
            result.push(this.ExtractLocaleByLanguage(event.label, language));
            event.chapters.forEach((chapter) => {
                if (chapter.header) {
                    result.push(
                        this.ExtractLocaleByLanguage(chapter.header, language)
                    );
                }
                chapter.pages.forEach((page) => {
                    result.push(this.ExtractLocaleByLanguage(page, language));
                });
            });
        });
        return result;
    }
    private ExtractFactionLocales(
        factions: Faction[],
        language: Language
    ): localeLine[] {
        const result: localeLine[] = [];
        factions.forEach((faction: Faction) => {
            result.push(this.ExtractLocaleByLanguage(faction.label, language));
            faction.chapters.forEach((chapter) => {
                if (chapter.header) {
                    result.push(
                        this.ExtractLocaleByLanguage(chapter.header, language)
                    );
                }
                chapter.pages.forEach((page) => {
                    result.push(this.ExtractLocaleByLanguage(page, language));
                });
            });
        });
        return result;
    }
    private ExtractCharacterLocales(
        characters: Character[],
        language: Language
    ): localeLine[] {
        const result: localeLine[] = [];
        characters.forEach((character: Character) => {
            result.push(
                this.ExtractLocaleByLanguage(character.label, language)
            );
            character.chapters.forEach((chapter) => {
                if (chapter.header) {
                    result.push(
                        this.ExtractLocaleByLanguage(chapter.header, language)
                    );
                }
                chapter.pages.forEach((page) => {
                    result.push(this.ExtractLocaleByLanguage(page, language));
                });
            });
        });
        return result;
    }

    private ExtractLocaleByLanguage(
        locale: Locale,
        language: Language
    ): localeLine {
        const localeLine: localeLine = {
            ishtml: locale.ishtml,
            key: getLocaleKey(locale),
            value: this.FormatLocaleValue(
                getLocaleKey(locale),
                this.GetLocaleValueByLanguage(locale, language),
                locale.ishtml
            ),
        };
        return localeLine;
    }

    private FormatLocaleValue(
        key: string,
        value: string,
        ishtml: boolean
    ): string {
        if (!value) {
            return "";
        }
        let localeContent = "";
        if (ishtml) {
            localeContent = value
                .replace(/(?:\r\n|\r|\n)/g, " ")
                .replace(/"/g, '\\"');
        } else {
            localeContent = value
                .replace(/(?:\r\n|\r|\n)/g, "\\n")
                .replace(/"/g, '\\"');
        }
        return `        L[\"${key}\"] = \"${localeContent}\"\n`;
    }

    private GetLocaleValueByLanguage(
        locale: Locale,
        language: Language
    ): string {
        if (!locale) return "";
        if (language === Language.enUS) return locale.enUS || "";
        if (locale.translations && locale.translations[language]) {
            return locale.translations[language] || "";
        }
        return "";
    }
}
