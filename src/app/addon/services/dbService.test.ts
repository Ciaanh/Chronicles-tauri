import { describe, it, expect } from "vitest";
import { DBService } from "./dbService";
import { AddonExportMode, FileGenerationRequest, validateLuaContent } from "../generator";
import { Event } from "../../../database/models/appObjects/Event";
import { Faction } from "../../../database/models/appObjects/Faction";
import { Character } from "../../../database/models/appObjects/Character";

const makeCollection = (id: number, name: string, index: string) => ({
    id,
    name,
    index,
});

const baseRequest = (): FileGenerationRequest => ({
    collections: [],
    events: [],
    factions: [],
    characters: [],
    mode: AddonExportMode.External,
});

describe("DBService", () => {
    describe("Generate", () => {
        it("returns an array of FileContent with a declaration file", () => {
            const svc = new DBService();
            const req = baseRequest();
            const files = svc.Generate(req);
            expect(files.length).toBeGreaterThan(0);
            const decl = files.find((f) => f.name === "DB/DB.lua");
            expect(decl).toBeDefined();
        });

        it("includes an XML index file", () => {
            const svc = new DBService();
            const files = svc.Generate(baseRequest());
            const idx = files.find((f) => f.name.endsWith(".xml"));
            expect(idx).toBeDefined();
        });

        it("loads DB.lua after collection scripts in DB.xml", () => {
            const svc = new DBService();
            const collection = { id: 1, name: "Lore" };
            const event: Event = {
                id: 1,
                name: "Test",
                collection: collection as Event["collection"],
                label: { id: 1, enUS: "Test", ishtml: false },
                period: { yearStart: 0, yearEnd: 1 },
                eventType: 0,
                timeline: 1,
                order: 1,
                link: "",
                factions: [],
                characters: [],
                chapters: [],
            };

            const req: FileGenerationRequest = {
                collections: [makeCollection(1, "Lore", "01")],
                events: [event],
                factions: [],
                characters: [],
                mode: AddonExportMode.External,
            };

            const xml = svc.Generate(req).find((f) => f.name === "DB/DB.xml")!;
            const dataScriptIndex = xml.content.indexOf("01_Lore\\LoreEventsDB.lua");
            const dbLuaIndex = xml.content.indexOf('<Script file="DB.lua" />');

            expect(dataScriptIndex).toBeGreaterThan(-1);
            expect(dbLuaIndex).toBeGreaterThan(dataScriptIndex);
        });

        it("declaration file contains ChroniclesPlugins manifest for a collection with data", () => {
            const svc = new DBService();
            const collection = { id: 1, name: "Lore" };
            const event: Event = {
                id: 1,
                name: "Test",
                collection: collection as Event["collection"],
                label: { id: 1, enUS: "Test", ishtml: false },
                period: { yearStart: 0, yearEnd: 1 },
                eventType: 0,
                timeline: 1,
                order: 1,
                link: "",
                factions: [],
                characters: [],
                chapters: [],
            };
            const req: FileGenerationRequest = {
                ...baseRequest(),
                collections: [makeCollection(1, "Lore", "01")],
                events: [event],
            };
            const decl = svc.Generate(req).find((f) => f.name === "DB/DB.lua")!;
            expect(decl.content).toContain("ChroniclesPlugins");
            expect(decl.content).toContain('ChroniclesPlugins["Lore"]');
            expect(decl.content).toContain("events = DB.LoreEventsDB,");
            expect(decl.content).toContain("local DB = private.DB or {}");
        });

        it("declaration file contains internal registration function in embedded mode", () => {
            const svc = new DBService();
            const collection = { id: 1, name: "Lore" };
            const event: Event = {
                id: 1,
                name: "Test",
                collection: collection as Event["collection"],
                label: { id: 1, enUS: "Test", ishtml: false },
                period: { yearStart: 0, yearEnd: 1 },
                eventType: 0,
                timeline: 1,
                order: 1,
                link: "",
                factions: [],
                characters: [],
                chapters: [],
            };
            const req: FileGenerationRequest = {
                ...baseRequest(),
                mode: AddonExportMode.Embedded,
                collections: [makeCollection(1, "Lore", "01")],
                events: [event],
            };
            const decl = svc.Generate(req).find((f) => f.name === "DB/DB.lua")!;
            expect(decl.content).toContain("function private.registerInternalDBs()");
            expect(decl.content).toContain('Data:RegisterEventDB("Lore", DB.LoreEventsDB)');
            expect(decl.content).toContain("local DB = private.DB or {}");
            expect(decl.content).not.toContain("ChroniclesPlugins");
        });

        it("generates an event DB file for a collection with events", () => {
            const svc = new DBService();
            const collection = { id: 1, name: "Lore" };
            const event: Event = {
                id: 1,
                name: "The Great War",
                collection: collection as Event["collection"],
                label: { id: 1, enUS: "The Great War desc", ishtml: false },
                period: { yearStart: -10000, yearEnd: -9000 },
                eventType: 0,
                timeline: 1,
                order: 1,
                link: "",
                factions: [],
                characters: [],
                chapters: [],
            };
            const req: FileGenerationRequest = {
                collections: [makeCollection(1, "Lore", "01")],
                events: [event],
                factions: [],
                characters: [],
                mode: AddonExportMode.External,
            };
            const files = svc.Generate(req);
            const eventFile = files.find((f) => f.name.includes("EventsDB"));
            expect(eventFile).toBeDefined();
            // Event content uses locale key, not event name directly
            expect(eventFile!.content).toContain(String(event.id));
        });

        it("declares collection tables under private.DB, never as globals", () => {
            const svc = new DBService();
            const collection = { id: 1, name: "Lore" };
            const event: Event = {
                id: 1,
                name: "The Great War",
                collection: collection as Event["collection"],
                label: { id: 1, enUS: "The Great War desc", ishtml: false },
                period: { yearStart: -10000, yearEnd: -9000 },
                eventType: 0,
                timeline: 1,
                order: 1,
                link: "",
                factions: [],
                characters: [],
                chapters: [],
            };
            const req: FileGenerationRequest = {
                collections: [makeCollection(1, "Lore", "01")],
                events: [event],
                factions: [],
                characters: [],
                mode: AddonExportMode.External,
            };

            const eventFile = svc.Generate(req).find((f) => f.name.includes("EventsDB"))!;

            expect(eventFile.content).toContain("private.DB = private.DB or {}");
            expect(eventFile.content).toContain("private.DB.LoreEventsDB = {");
            // A bare `LoreEventsDB = {` is a global in Lua. Fifteen collections used to publish up
            // to 45 of them; the assignment must always be qualified.
            expect(eventFile.content).not.toMatch(/^\s*LoreEventsDB\s*=/m);
        });

        it("generates a faction DB file for a collection with factions", () => {
            const svc = new DBService();
            const collection = { id: 1, name: "Lore" };
            const faction: Faction = {
                id: 1,
                name: "Alliance",
                collection: collection as Faction["collection"],
                label: { id: 2, enUS: "Alliance desc", ishtml: false },
                timeline: 1,
                author: "",
                chapters: [],
            };
            const req: FileGenerationRequest = {
                collections: [makeCollection(1, "Lore", "01")],
                events: [],
                factions: [faction],
                characters: [],
                mode: AddonExportMode.External,
            };
            const files = svc.Generate(req);
            const factionFile = files.find((f) => f.name.includes("FactionsDB"));
            expect(factionFile).toBeDefined();
        });

        it("generates a character DB file for a collection with characters", () => {
            const svc = new DBService();
            const collection = { id: 1, name: "Lore" };
            const character: Character = {
                id: 1,
                name: "Arthas",
                collection: collection as Character["collection"],
                label: { id: 3, enUS: "Arthas desc", ishtml: false },
                timeline: 1,
                author: "",
                chapters: [],
                factions: [],
            };
            const req: FileGenerationRequest = {
                collections: [makeCollection(1, "Lore", "01")],
                events: [],
                factions: [],
                characters: [character],
                mode: AddonExportMode.External,
            };
            const files = svc.Generate(req);
            const charFile = files.find((f) => f.name.includes("CharactersDB"));
            expect(charFile).toBeDefined();
            expect(charFile!.content).toContain(String(character.id));
        });

        it("produces valid Lua (balanced braces) for declaration file", () => {
            const svc = new DBService();
            const req: FileGenerationRequest = {
                collections: [makeCollection(1, "Lore", "01")],
                events: [],
                factions: [],
                characters: [],
                mode: AddonExportMode.External,
            };
            const decl = svc.Generate(req).find((f) => f.name === "DB/DB.lua")!;
            const issues = validateLuaContent(decl.name, decl.content);
            expect(issues.filter((i) => i.includes("brace"))).toHaveLength(0);
        });
    });
});
