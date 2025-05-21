import { Event } from "../../../database/models/appObjects/Event";
import { Character } from "../../../database/models/appObjects/Character";
import { Faction } from "../../../database/models/appObjects/Faction";
import { FileContent } from "../../../_utils/files/fileContent";
import { FileGenerationRequest, FormatedCollection } from "../generator";
import { Collection } from "../../../database/models/appObjects/Collection";
import { Chapter } from "../../../database/models/appObjects/Chapter";
import { getLocaleKey } from "../../../database/models/appObjects/Locale";

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
        return `\tChronicles.DB:Register${typeName}DB(Chronicles.Custom.Modules.${lowerName}, ${formatedName}${typeName}sDB)`;
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
                const lowerCollection = collection.name.toLowerCase();
                return `\t${lowerCollection} = \"${lowerCollection}\"`;
            })
            .join(",\n");

        const declarations = request.collections
            .map((collection: FormatedCollection) => {
                const filteredEvents = request.events.filter(
                    (event: Event) => String(event.collection.id) == String(collection.id)
                );
                const filteredFactions = request.factions.filter(
                    (faction: Faction) => String(faction.collection.id) == String(collection.id)
                );
                const filteredCharacters = request.characters.filter(
                    (character: Character) => String(character.collection.id) == String(collection.id)
                );

                let eventDeclaration = "";
                let factionDeclaration = "";
                let characterDeclaration = "";

                if (filteredEvents.length > 0) {
                    eventDeclaration = this.FormatDeclaration(collection.name, TypeName.Event);
                }
                if (filteredFactions.length > 0) {
                    factionDeclaration = this.FormatDeclaration(collection.name, TypeName.Faction);
                }
                if (filteredCharacters.length > 0) {
                    characterDeclaration = this.FormatDeclaration(collection.name, TypeName.Character);
                }
                return [eventDeclaration, factionDeclaration, characterDeclaration]
                    .filter((value) => value.length > 0)
                    .join("\n");
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
                const filteredEvents = request.events.filter(
                    (event: Event) => String(event.collection.id) == String(collection.id)
                );
                const filteredFactions = request.factions.filter(
                    (faction: Faction) => String(faction.collection.id) == String(collection.id)
                );
                const filteredCharacters = request.characters.filter(
                    (character: Character) => String(character.collection.id) == String(collection.id)
                );

                let eventIndex = "";
                let factionIndex = "";
                let characterIndex = "";

                if (filteredEvents.length > 0) {
                    eventIndex = this.FormatIndex(collection.index, collection.name, TypeName.Event);
                }
                if (filteredFactions.length > 0) {
                    factionIndex = this.FormatIndex(collection.index, collection.name, TypeName.Faction);
                }
                if (filteredCharacters.length > 0) {
                    characterIndex = this.FormatIndex(collection.index, collection.name, TypeName.Character);
                }
                return [eventIndex, factionIndex, characterIndex]
                    .filter((value) => value.length > 0)
                    .join("\n");
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
        const files = request.collections.map((c: FormatedCollection) => {
            const dbFoldername = this.GetDbFolderName(c.index, c.name);
            const collection = this.GetCollection(c.name, TypeName.Event);
            const filteredEvents = request.events.filter(
                (event: Event) => String(event.collection.id) == String(c.id)
            );
            const eventDbContent = `${this.dbHeader}\n\n    ${collection} = {\n        ${filteredEvents
                .map((event) => this.MapEventContent(event))
                .join(",\n        ")}\n    }`;
            return {
                content: eventDbContent,
                name: `Custom/DB/${dbFoldername}/${collection}.lua`,
            } as FileContent;
        });
        return files;
    }

    private MapEventContent(event: Event): string {
        // Use event.period.yearStart/yearEnd for years
        const yearStart = event.period?.yearStart ?? 0;
        const yearEnd = event.period?.yearEnd ?? 0;
        // No event.description in Tauri, use chapters/pages for description
        // For compatibility, generate an empty array for description
        return `[${event.id}] = {\n            id=${event.id},\n            label=Locale[\"${getLocaleKey(event.label)}\"],\n            description={},\n            chapters={${this.MapChapterList(event.chapters)}},\n            yearStart=${yearStart},\n            yearEnd=${yearEnd},\n            eventType=${event.eventType},\n            timeline=${event.timeline},\n            order=${event.order},\n            characters={${this.MapCharacterList(event)}},\n            factions={${this.MapFactionList(event)}},\n        }`;
    }

    private MapFactionList(event: Event): string {
        const factionsByDB = event.factions.reduce(
            (acc: DepsAccumulator<Faction>[], faction: Faction) => {
                const db = faction.collection;
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
        const formatedDepsData = factionsByDB
            .filter(Boolean)
            .map((deps) => {
                const lowerCollection = deps.collection.name.toLowerCase();
                const factionIds = deps.list.map((faction) => faction.id).join(", ");
                return `[\"${lowerCollection}\"] = {${factionIds}}`;
            });
        return formatedDepsData.join(", ");
    }

    private MapCharacterList(event: Event): string {
        const charactersByDB = event.characters.reduce(
            (acc: DepsAccumulator<Character>[], character: Character) => {
                const db = character.collection;
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
        const formatedDepsData = charactersByDB
            .filter(Boolean)
            .map((deps) => {
                const lowerCollection = deps.collection.name.toLowerCase();
                const characterIds = deps.list.map((character) => character.id).join(", ");
                return `[\"${lowerCollection}\"] = {${characterIds}}`;
            });
        return formatedDepsData.join(", ");
    }

    private MapChapterList(chapters: Chapter[]): string {
        return chapters
            .map((chapter) => {
                // chapter.header: Locale | null
                const headerKey = chapter.header ? getLocaleKey(chapter.header) : "";
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
        const files = request.collections.map((c: FormatedCollection) => {
            const dbFoldername = this.GetDbFolderName(c.index, c.name);
            const collection = this.GetCollection(c.name, TypeName.Faction);
            const filteredFactions = request.factions.filter(
                (faction: Faction) => String(faction.collection.id) == String(c.id)
            );
            const factionDbContent = `${this.dbHeader}\n\n    ${collection} = {\n        ${filteredFactions.map(this.MapFactionContent).join(",\n        ")}\n    }`;
            return {
                content: factionDbContent,
                name: `Custom/DB/${dbFoldername}/${collection}.lua`,
            } as FileContent;
        });
        return files;
    }

    private MapFactionContent(faction: Faction): string {
        return `[${faction.id}] = {\n            id = ${faction.id},\n            name = Locale[\"${getLocaleKey(faction.label)}\"],\n            description = Locale[\"${getLocaleKey(faction.description)}\"],\n            timeline = ${faction.timeline}\n        }`;
    }

    private CreateCharacterDbFile(request: FileGenerationRequest): FileContent[] {
        const files = request.collections.map((c: FormatedCollection) => {
            const dbFoldername = this.GetDbFolderName(c.index, c.name);
            const collection = this.GetCollection(c.name, TypeName.Character);
            const filteredCharacters = request.characters.filter(
                (character: Character) => String(character.collection.id) == String(c.id)
            );
            const characterDbContent = `${this.dbHeader}\n\n    ${collection} = {\n        ${filteredCharacters.map(this.MapCharacterContent).join(",\n        ")}\n    }`;
            return {
                content: characterDbContent,
                name: `Custom/DB/${dbFoldername}/${collection}.lua`,
            } as FileContent;
        });
        return files;
    }

    private MapCharacterContent(character: Character): string {
        return `[${character.id}] = {\n            id = ${character.id},\n            name = Locale[\"${getLocaleKey(character.label)}\"],\n            biography = Locale[\"${getLocaleKey(character.biography)}\"],\n            timeline = ${character.timeline},\n            factions = {${character.factions.map((fac) => fac.id).join(", ")}}\n        }`;
    }
}
