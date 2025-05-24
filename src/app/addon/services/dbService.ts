import { Event } from "../../../database/models/appObjects/Event";
import { Character } from "../../../database/models/appObjects/Character";
import { Faction } from "../../../database/models/appObjects/Faction";
import { FileContent } from "../../../_utils/files/fileContent";
import { FileGenerationRequest, FormatedCollection } from "../generator";
import { Collection } from "../../../database/models/appObjects/Collection";
import { getLocaleKey } from "../../../database/models/appObjects/Locale";
import { Chapter } from "../../../database/models";

interface DepsAccumulator<T> {
    collection: Collection;
    list: T[];
}

export enum TypeName {
    Event = "Event",
    Faction = "Faction",
    Character = "Character",
}

export class DBService {
    Generate(request: FileGenerationRequest) {
        const files: FileContent[] = [];

        const declarationFile = this.CreateDeclarationFile(request);
        files.push(declarationFile);

        const indexFile = this.CreateIndexFile(request);
        files.push(indexFile);

        // character db content
        const characterDbFile = this.CreateCharacterDbFile(request);
        files.push(...characterDbFile);

        // faction db content
        const factionDbFile = this.CreateFactionDbFile(request);
        files.push(...factionDbFile);

        // event db content
        const eventDbFile = this.CreateEventDbFile(request);
        files.push(...eventDbFile);

        return files;
    }

    private dbHeader = `local FOLDER_NAME, private = ...\nlocal Chronicles = private.Chronicles\nlocal modules = Chronicles.Custom.Modules\nlocal Locale = LibStub(\"AceLocale-3.0\"):GetLocale(private.addon_name)`;

    private FormatCollection(collection: string) {
        return collection.replace(/\w+/g, function (w) {
            return w[0].toUpperCase() + w.slice(1).toLowerCase();
        });
    }

    private FormatDeclaration(collection: string, typeName: TypeName) {
        const lowerName = collection.toLowerCase();
        const formatedName = this.FormatCollection(collection);
        return `\tChronicles.Data:Register${typeName}DB(Chronicles.Custom.Modules.${lowerName}, ${formatedName}${typeName}sDB)`;
    }

    private FormatIndex(index: string, collection: string, typeName: TypeName) {
        const dbFoldername = this.GetDbFolderName(index, collection);
        const dbFilename = this.GetCollection(collection, typeName);
        return `\t<Script file=\"${dbFoldername}\\${dbFilename}.lua\" />`;
    }

    private GetDbFolderName(index: string, collection: string) {
        const formatedName = this.FormatCollection(collection);
        return `${index}_${formatedName}`;
    }

    private GetCollection(collection: string, typeName: TypeName) {
        const formatedName = this.FormatCollection(collection);
        return `${formatedName}${typeName}sDB`;
    }

    private CreateDeclarationFile(request: FileGenerationRequest): FileContent {
        const names = request.collections
            .map((collection: FormatedCollection) => {
                // Defensive: ensure collection has id, name, index
                if (
                    !collection ||
                    typeof collection.id === "undefined" ||
                    typeof collection.name === "undefined" ||
                    typeof collection.index === "undefined"
                )
                    return "";

                const lowerCollection = collection.name.toLowerCase();
                return `\t${lowerCollection} = \"${this.FormatCollection(
                    collection.name
                )}\"`;
            })
            .filter((value: string) => value.length > 0)
            .join(",\n");

        const declarations = request.collections
            .map((collection: FormatedCollection) => {
                if (
                    !collection ||
                    typeof collection.id === "undefined" ||
                    typeof collection.name === "undefined" ||
                    typeof collection.index === "undefined"
                )
                    return "";

                const hasEvents = request.events.some(
                    (event) =>
                        event.collection &&
                        String(event.collection.id) === String(collection.id)
                );
                const hasFactions = request.factions.some(
                    (faction) =>
                        faction.collection &&
                        String(faction.collection.id) === String(collection.id)
                );
                const hasCharacters = request.characters.some(
                    (character) =>
                        character.collection &&
                        String(character.collection.id) ===
                            String(collection.id)
                );

                const eventDeclaration = hasEvents
                    ? this.FormatDeclaration(collection.name, TypeName.Event) +
                      "\n"
                    : "";
                const factionDeclaration = hasFactions
                    ? this.FormatDeclaration(
                          collection.name,
                          TypeName.Faction
                      ) + "\n"
                    : "";
                const characterDeclaration = hasCharacters
                    ? this.FormatDeclaration(
                          collection.name,
                          TypeName.Character
                      ) + "\n"
                    : "";

                return `${eventDeclaration}${factionDeclaration}${characterDeclaration}`;
            })
            .filter((value: string) => value.length > 0)
            .join("\n");

        const content = `local FOLDER_NAME, private = ...\nlocal Chronicles = private.Chronicles\nChronicles.Custom = {}\nChronicles.Custom.DB = {}\nChronicles.Custom.Modules = {\n${names}\n}\nfunction Chronicles.Custom.DB:Init()\n${declarations}   \nend`;

        const dbDeclarationContent: FileContent = {
            content: content,
            name: "Custom/DB/ChroniclesDB.lua",
        };
        return dbDeclarationContent;
    }

    private CreateIndexFile(request: FileGenerationRequest): FileContent {
        const indexes = request.collections
            .map((collection: FormatedCollection) => {
                if (
                    !collection ||
                    typeof collection.id === "undefined" ||
                    typeof collection.name === "undefined" ||
                    typeof collection.index === "undefined"
                )
                    return "";

                const hasEvents = request.events.some(
                    (event) =>
                        event.collection &&
                        String(event.collection.id) === String(collection.id)
                );
                const hasFactions = request.factions.some(
                    (faction) =>
                        faction.collection &&
                        String(faction.collection.id) === String(collection.id)
                );
                const hasCharacters = request.characters.some(
                    (character) =>
                        character.collection &&
                        String(character.collection.id) ===
                            String(collection.id)
                );

                const eventIndex = hasEvents
                    ? this.FormatIndex(
                          collection.index,
                          collection.name,
                          TypeName.Event
                      ) + "\n"
                    : "";

                const factionIndex = hasFactions
                    ? this.FormatIndex(
                          collection.index,
                          collection.name,
                          TypeName.Faction
                      ) + "\n"
                    : "";

                const characterIndex = hasCharacters
                    ? this.FormatIndex(
                          collection.index,
                          collection.name,
                          TypeName.Character
                      ) + "\n"
                    : "";

                return `${eventIndex}${factionIndex}${characterIndex}`;
            })
            .filter((value: string) => value.length > 0)
            .join("\n");

        const content = `<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<Ui xmlns=\"http://www.blizzard.com/wow/ui/\"\n    xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.blizzard.com/wow/ui/\">\n\t<Script file=\"ChroniclesDB.lua\" />\n${indexes}\n</Ui>`;

        return {
            content: content,
            name: "Custom/DB/ChroniclesDB.xml",
        };
    }

    private CreateEventDbFile(request: FileGenerationRequest): FileContent[] {
        const files = request.collections
            .map((c: FormatedCollection) => {
                if (!c || typeof c.id === "undefined") return null;
                // Defensive: filter events with valid collection property
                const filteredEvents = request.events.filter(
                    (event: Event) =>
                        event.collection &&
                        String(event.collection.id) === String(c.id)
                );
                if (filteredEvents.length === 0) return null;
                const dbFoldername = this.GetDbFolderName(c.index, c.name);
                const collection = this.GetCollection(c.name, TypeName.Event);
                const eventDbContent = `${
                    this.dbHeader
                }\n\n    ${collection} = {\n        ${filteredEvents
                    .map((event) => this.MapEventContent(event))
                    .join(",\n        ")}\n    }`;
                return {
                    content: eventDbContent,
                    name: `Custom/DB/${dbFoldername}/${collection}.lua`,
                } as FileContent;
            })
            .filter((file): file is FileContent => file !== null);
        return files;
    }
    private MapEventContent(event: Event): string {
        // Use event.period.yearStart/yearEnd for years
        const yearStart = event.period?.yearStart ?? 0;
        const yearEnd = event.period?.yearEnd ?? 0;
        const chapters = event.chapters || [];

        return `[${event.id}] = {\n            id=${
            event.id
        },\n            label=Locale[\"${getLocaleKey(
            event.label
        )}\"],\n            chapters={${this.MapChapterList(
            chapters
        )}},\n            yearStart=${yearStart},\n            yearEnd=${yearEnd},\n            eventType=${
            event.eventType
        },\n            timeline=${event.timeline},\n            order=${
            event.order
        },\n            characters={${this.MapCharacterList(
            event
        )}},\n            factions={${this.MapFactionList(event)}},\n        }`;
    }
    private MapFactionList(event: Event): string {
        // Ensure factions is initialized, use empty array if undefined
        const factions = event.factions || [];

        const factionsByDB = factions.reduce(
            (acc: DepsAccumulator<Faction>[], faction: Faction) => {
                const db = faction.collection;
                if (!db || typeof db.id === "undefined") return acc; // Skip if collection or id is invalid

                if (!acc[db.id]) {
                    acc[db.id] = {
                        collection: db,
                        list: [],
                    } as DepsAccumulator<Faction>;
                }
                acc[db.id].list.push(faction);
                return acc;
            },
            []
        );
        const formatedDepsData = factionsByDB.filter(Boolean).map((deps) => {
            const lowerCollection = deps.collection.name.toLowerCase();
            const factionIds = deps.list
                .map((faction) => faction.id)
                .join(", ");
            return `[\"${lowerCollection}\"] = {${factionIds}}`;
        });
        return formatedDepsData.join(", ");
    }

    private MapCharacterList(event: Event): string {
        const characters = event.characters || [];
        const charactersByDB = characters.reduce(
            (acc: DepsAccumulator<Character>[], character: Character) => {
                const db = character.collection;
                if (!db || typeof db.id === "undefined") return acc;
                if (!acc[db.id]) {
                    acc[db.id] = {
                        collection: db,
                        list: [],
                    } as DepsAccumulator<Character>;
                }
                acc[db.id].list.push(character);
                return acc;
            },
            []
        );
        const formatedDepsData = charactersByDB.filter(Boolean).map((deps) => {
            const lowerCollection = deps.collection.name.toLowerCase();
            const characterIds = deps.list
                .map((character) => character.id)
                .join(", ");
            return `[\"${lowerCollection}\"] = {${characterIds}}`;
        });
        return formatedDepsData.join(", ");
    }

    private MapChapterList(chapters: Chapter[]): string {
        return chapters
            .map((chapter) => {
                // chapter.header: Locale | null
                const headerKey = chapter.header
                    ? getLocaleKey(chapter.header)
                    : "";

                // chapter.pages: Locale[]
                const pageKeys = chapter.pages
                    .filter((page) => page)
                    .map((page) => `Locale[\"${getLocaleKey(page)}\"]`)
                    .join(", ");
                return `{\n                header = Locale[\"${headerKey}\"],\n                pages = {${pageKeys}} }`;
            })
            .join(", ");
    }

    private CreateFactionDbFile(request: FileGenerationRequest): FileContent[] {
        const files = request.collections
            .map((c: FormatedCollection) => {
                if (!c || typeof c.id === "undefined") return null;

                const filteredFactions = request.factions.filter(
                    (faction: Faction) =>
                        faction.collection &&
                        String(faction.collection.id) === String(c.id)
                );
                if (filteredFactions.length === 0) return null;

                const dbFoldername = this.GetDbFolderName(c.index, c.name);
                const collection = this.GetCollection(c.name, TypeName.Faction);
                const factionDbContent = `${
                    this.dbHeader
                }\n\n    ${collection} = {\n        ${filteredFactions
                    .map((faction) => this.MapFactionContent(faction))
                    .join(",\n        ")}\n    }`;
                return {
                    content: factionDbContent,
                    name: `Custom/DB/${dbFoldername}/${collection}.lua`,
                } as FileContent;
            })
            .filter((file): file is FileContent => file !== null);
        return files;
    }
    private MapFactionContent(faction: Faction): string {
        // Ensure chapters is initialized, use empty array if undefined
        const chapters = faction.chapters || [];

        return `[${faction.id}] = {\n            id = ${
            faction.id
        },\n            name = Locale[\"${getLocaleKey(
            faction.label
        )}\"],\n            chapters = {${this.MapChapterList(
            chapters
        )}},\n            timeline = ${faction.timeline}\n        }`;
    }

    private CreateCharacterDbFile(
        request: FileGenerationRequest
    ): FileContent[] {
        const files = request.collections
            .map((c: FormatedCollection) => {
                if (!c || typeof c.id === "undefined") return null;

                const filteredCharacters = request.characters.filter(
                    (character: Character) =>
                        character.collection &&
                        String(character.collection.id) === String(c.id)
                );
                if (filteredCharacters.length === 0) return null;

                const dbFoldername = this.GetDbFolderName(c.index, c.name);
                const collection = this.GetCollection(
                    c.name,
                    TypeName.Character
                );
                const characterDbContent = `${
                    this.dbHeader
                }\n\n    ${collection} = {\n        ${filteredCharacters
                    .map((character) => this.MapCharacterContent(character))
                    .join(",\n        ")}\n    }`;

                return {
                    content: characterDbContent,
                    name: `Custom/DB/${dbFoldername}/${collection}.lua`,
                } as FileContent;
            })
            .filter((file): file is FileContent => file !== null);

        return files;
    }
    private MapCharacterContent(character: Character): string {
        // Ensure chapters is initialized, use empty array if undefined
        const chapters = character.chapters || [];

        return `[${character.id}] = {\n            id = ${
            character.id
        },\n            name = Locale[\"${getLocaleKey(
            character.label
        )}\"],\n            chapters = {${this.MapChapterList(
            chapters
        )}},\n            timeline = ${
            character.timeline
        },\n            factions = {${character.factions
            .map((fac) => fac.id)
            .join(", ")}}\n        }`;
    }
}
