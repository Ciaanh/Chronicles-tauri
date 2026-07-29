import { Event } from "../../../database/models/appObjects/Event";
import { Character } from "../../../database/models/appObjects/Character";
import { Faction } from "../../../database/models/appObjects/Faction";
import { FileContent } from "../../../_utils/files/fileContent";
import { AddonExportMode, FileGenerationRequest, FormattedCollection } from "../generator";
import { Collection } from "../../../database/models/appObjects/Collection";
import { getLocaleKey } from "../../../database/models/appObjects/Locale";
import { Chapter } from "../../../database/models";
import { escapeLuaString } from "./luaUtils";

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

        const characterDbFile = this.CreateCharacterDbFile(request);
        files.push(...characterDbFile);

        const factionDbFile = this.CreateFactionDbFile(request);
        files.push(...factionDbFile);

        const eventDbFile = this.CreateEventDbFile(request);
        files.push(...eventDbFile);

        return files;
    }

    /**
     * Every generated Lua file opens with this. `private` is the per-addon table WoW passes to each
     * file of an addon, so it is how the collection files hand their data to DB.lua without either
     * side going through a global.
     */
    private dbHeader = `local FOLDER_NAME, private = ...\nlocal Locale = LibStub("AceLocale-3.0"):GetLocale(private.addon_name)`;

    /**
     * The table each collection file writes into, and DB.lua reads back out of.
     *
     * The generated files used to declare their table bare — `ExpansionsEventsDB = {` — which in Lua
     * means a global. One export of fifteen collections therefore published up to 45 of them, and
     * DB.lua read them back by global name. Namespacing them under `private` keeps the same
     * cross-file handoff with no globals; `ChroniclesPlugins` stays global on purpose, being the
     * cross-addon contract Chronicles reads.
     */
    private dbNamespace = "private.DB";

    private DbNamespaceDeclaration() {
        return `${this.dbNamespace} = ${this.dbNamespace} or {}`;
    }

    private FormatCollection(collection: string) {
        return collection.replace(/\w+/g, function (w) {
            return w[0].toUpperCase() + w.slice(1).toLowerCase();
        });
    }

    private FormatManifestEntry(
        collection: string,
        hasEvents: boolean,
        hasFactions: boolean,
        hasCharacters: boolean
    ) {
        const formatedName = this.FormatCollection(collection);
        const fields: string[] = [];
        if (hasEvents) fields.push(`\tevents = DB.${formatedName}EventsDB,`);
        if (hasFactions) fields.push(`\tfactions = DB.${formatedName}FactionsDB,`);
        if (hasCharacters) fields.push(`\tcharacters = DB.${formatedName}CharactersDB,`);
        return `ChroniclesPlugins["${formatedName}"] = {\n${fields.join("\n")}\n}`;
    }

    private FormatEmbeddedRegistrationEntry(
        collection: string,
        hasEvents: boolean,
        hasFactions: boolean,
        hasCharacters: boolean
    ) {
        const formatedName = this.FormatCollection(collection);
        const calls: string[] = [];
        if (hasEvents)
            calls.push(
                `\tif DB.${formatedName}EventsDB then Data:RegisterEventDB("${formatedName}", DB.${formatedName}EventsDB) end`
            );
        if (hasFactions)
            calls.push(
                `\tif DB.${formatedName}FactionsDB then Data:RegisterFactionDB("${formatedName}", DB.${formatedName}FactionsDB) end`
            );
        if (hasCharacters)
            calls.push(
                `\tif DB.${formatedName}CharactersDB then Data:RegisterCharacterDB("${formatedName}", DB.${formatedName}CharactersDB) end`
            );
        return calls.join("\n");
    }

    private FormatIndex(index: string, collection: string, typeName: TypeName) {
        const dbFoldername = this.GetDbFolderName(index, collection);
        const dbFilename = this.GetCollection(collection, typeName);
        return `\t<Script file="${dbFoldername}\\${dbFilename}.lua" />`;
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
        const entries = request.collections
            .map((collection: FormattedCollection) => {
                if (
                    !collection ||
                    typeof collection.id === "undefined" ||
                    typeof collection.name === "undefined" ||
                    typeof collection.index === "undefined"
                )
                    return "";

                const hasEvents = request.events.some(
                    (event) =>
                        event.collection && String(event.collection.id) === String(collection.id)
                );
                const hasFactions = request.factions.some(
                    (faction) =>
                        faction.collection &&
                        String(faction.collection.id) === String(collection.id)
                );
                const hasCharacters = request.characters.some(
                    (character) =>
                        character.collection &&
                        String(character.collection.id) === String(collection.id)
                );

                if (!hasEvents && !hasFactions && !hasCharacters) return "";

                if (request.mode === AddonExportMode.Embedded) {
                    return this.FormatEmbeddedRegistrationEntry(
                        collection.name,
                        hasEvents,
                        hasFactions,
                        hasCharacters
                    );
                }

                return this.FormatManifestEntry(
                    collection.name,
                    hasEvents,
                    hasFactions,
                    hasCharacters
                );
            })
            .filter((value: string) => value.length > 0)
            .join("\n\n");

        // DB.lua is loaded after every collection file (see CreateIndexFile), so private.DB is
        // fully populated by the time either form reads it.
        const content =
            request.mode === AddonExportMode.Embedded
                ? `local FOLDER_NAME, private = ...\n\nfunction private.registerInternalDBs()\n\tlocal Data = private.Chronicles and private.Chronicles.Data\n\tif not Data then\n\t\treturn\n\tend\n\n\tlocal DB = private.DB or {}\n\n${entries}\nend`
                : `local FOLDER_NAME, private = ...\n\nlocal DB = private.DB or {}\n\nChroniclesPlugins = ChroniclesPlugins or {}\n\n${entries}`;

        return {
            content: content,
            name: "DB/DB.lua",
        };
    }

    private CreateIndexFile(request: FileGenerationRequest): FileContent {
        const indexes = request.collections
            .map((collection: FormattedCollection) => {
                if (
                    !collection ||
                    typeof collection.id === "undefined" ||
                    typeof collection.name === "undefined" ||
                    typeof collection.index === "undefined"
                )
                    return "";

                const hasEvents = request.events.some(
                    (event) =>
                        event.collection && String(event.collection.id) === String(collection.id)
                );
                const hasFactions = request.factions.some(
                    (faction) =>
                        faction.collection &&
                        String(faction.collection.id) === String(collection.id)
                );
                const hasCharacters = request.characters.some(
                    (character) =>
                        character.collection &&
                        String(character.collection.id) === String(collection.id)
                );

                const eventIndex = hasEvents
                    ? this.FormatIndex(collection.index, collection.name, TypeName.Event) + "\n"
                    : "";

                const factionIndex = hasFactions
                    ? this.FormatIndex(collection.index, collection.name, TypeName.Faction) + "\n"
                    : "";

                const characterIndex = hasCharacters
                    ? this.FormatIndex(collection.index, collection.name, TypeName.Character) + "\n"
                    : "";

                return `${eventIndex}${factionIndex}${characterIndex}`;
            })
            .filter((value: string) => value.length > 0)
            .join("\n");

        const content = `<?xml version="1.0" encoding="utf-8"?>\n<Ui xmlns="http://www.blizzard.com/wow/ui/"\n    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.blizzard.com/wow/ui/">\n${indexes}\n\t<Script file="DB.lua" />\n</Ui>`;

        return {
            content: content,
            name: "DB/DB.xml",
        };
    }

    private CreateEventDbFile(request: FileGenerationRequest): FileContent[] {
        const files = request.collections
            .map((c: FormattedCollection) => {
                if (!c || typeof c.id === "undefined") return null;

                const filteredEvents = request.events.filter(
                    (event: Event) =>
                        event.collection && String(event.collection.id) === String(c.id)
                );
                if (filteredEvents.length === 0) return null;
                const dbFoldername = this.GetDbFolderName(c.index, c.name);
                const collection = this.GetCollection(c.name, TypeName.Event);
                const eventDbContent = `${this.dbHeader}\n\n${this.DbNamespaceDeclaration()}\n${
                    this.dbNamespace
                }.${collection} = {\n        ${filteredEvents
                    .map((event) => this.MapEventContent(event))
                    .join(",\n        ")}\n    }`;
                return {
                    content: eventDbContent,
                    name: `DB/${dbFoldername}/${collection}.lua`,
                } as FileContent;
            })
            .filter((file): file is FileContent => file !== null);
        return files;
    }

    private MapEventContent(event: Event): string {
        const yearStart = event.period?.yearStart ?? 0;
        const yearEnd = event.period?.yearEnd ?? 0;
        const chapters = event.chapters || [];

        return `[${event.id}] = {\n            id=${
            event.id
        },\n            label=Locale["${getLocaleKey(
            event.label
        )}"],\n            chapters={${this.MapChapterList(
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
        const factions = event.factions || [];

        const factionsByDB = factions.reduce(
            (acc: DepsAccumulator<Faction>[], faction: Faction) => {
                const db = faction.collection;
                if (!db || typeof db.id === "undefined") return acc;

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
            const factionIds = deps.list.map((faction) => faction.id).join(", ");
            return `["${lowerCollection}"] = {${factionIds}}`;
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
            const characterIds = deps.list.map((character) => character.id).join(", ");
            return `["${lowerCollection}"] = {${characterIds}}`;
        });
        return formatedDepsData.join(", ");
    }

    private MapChapterList(chapters: Chapter[]): string {
        return chapters
            .map((chapter) => {
                const headerKey = chapter.header ? getLocaleKey(chapter.header) : "";

                const pageKeys = chapter.pages
                    .filter((page) => page)
                    .map((page) => `Locale["${getLocaleKey(page)}"]`)
                    .join(", ");
                return `{\n                header = Locale["${headerKey}"],\n                pages = {${pageKeys}} }`;
            })
            .join(", ");
    }

    private CreateFactionDbFile(request: FileGenerationRequest): FileContent[] {
        const files = request.collections
            .map((c: FormattedCollection) => {
                if (!c || typeof c.id === "undefined") return null;

                const filteredFactions = request.factions.filter(
                    (faction: Faction) =>
                        faction.collection && String(faction.collection.id) === String(c.id)
                );
                if (filteredFactions.length === 0) return null;

                const dbFoldername = this.GetDbFolderName(c.index, c.name);
                const collection = this.GetCollection(c.name, TypeName.Faction);
                const factionDbContent = `${this.dbHeader}\n\n${this.DbNamespaceDeclaration()}\n${
                    this.dbNamespace
                }.${collection} = {\n        ${filteredFactions
                    .map((faction) => this.MapFactionContent(faction))
                    .join(",\n        ")}\n    }`;
                return {
                    content: factionDbContent,
                    name: `DB/${dbFoldername}/${collection}.lua`,
                } as FileContent;
            })
            .filter((file): file is FileContent => file !== null);
        return files;
    }
    private MapFactionContent(faction: Faction): string {
        const chapters = faction.chapters || [];

        return `[${faction.id}] = {\n            id = ${
            faction.id
        },\n            name = Locale["${getLocaleKey(
            faction.label
        )}"],\n            author = "${escapeLuaString(
            faction.author || ""
        )}",\n            chapters = {${this.MapChapterList(
            chapters
        )}},\n            timeline = ${faction.timeline}\n        }`;
    }

    private CreateCharacterDbFile(request: FileGenerationRequest): FileContent[] {
        const files = request.collections
            .map((c: FormattedCollection) => {
                if (!c || typeof c.id === "undefined") return null;

                const filteredCharacters = request.characters.filter(
                    (character: Character) =>
                        character.collection && String(character.collection.id) === String(c.id)
                );
                if (filteredCharacters.length === 0) return null;

                const dbFoldername = this.GetDbFolderName(c.index, c.name);
                const collection = this.GetCollection(c.name, TypeName.Character);
                const characterDbContent = `${this.dbHeader}\n\n${this.DbNamespaceDeclaration()}\n${
                    this.dbNamespace
                }.${collection} = {\n        ${filteredCharacters
                    .map((character) => this.MapCharacterContent(character))
                    .join(",\n        ")}\n    }`;

                return {
                    content: characterDbContent,
                    name: `DB/${dbFoldername}/${collection}.lua`,
                } as FileContent;
            })
            .filter((file): file is FileContent => file !== null);

        return files;
    }
    private MapCharacterContent(character: Character): string {
        const chapters = character.chapters || [];

        return `[${character.id}] = {\n            id = ${
            character.id
        },\n            name = Locale["${getLocaleKey(
            character.label
        )}"],\n            author = "${escapeLuaString(
            character.author || ""
        )}",\n            chapters = {${this.MapChapterList(chapters)}},\n            timeline = ${
            character.timeline
        },\n            factions = {${character.factions
            .map((fac) => fac.id)
            .join(", ")}}\n        }`;
    }
}
