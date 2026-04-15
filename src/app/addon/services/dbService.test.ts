import { describe, it, expect } from "vitest";
import { DBService } from "./dbService";
import { FileGenerationRequest, validateLuaContent } from "../generator";
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
});

describe("DBService", () => {
    describe("Generate", () => {
        it("returns an array of FileContent with a declaration file", () => {
            const svc = new DBService();
            const req = baseRequest();
            const files = svc.Generate(req);
            expect(files.length).toBeGreaterThan(0);
            const decl = files.find((f) => f.name === "DB/ChroniclesDB.lua");
            expect(decl).toBeDefined();
        });

        it("includes an XML index file", () => {
            const svc = new DBService();
            const files = svc.Generate(baseRequest());
            const idx = files.find((f) => f.name.endsWith(".xml"));
            expect(idx).toBeDefined();
        });

        it("declaration file contains Chronicles.DB.Modules for a collection", () => {
            const svc = new DBService();
            const req: FileGenerationRequest = {
                ...baseRequest(),
                collections: [makeCollection(1, "lore", "01")],
            };
            const decl = svc.Generate(req).find((f) => f.name === "DB/ChroniclesDB.lua")!;
            expect(decl.content).toContain("lore");
            expect(decl.content).toContain("Chronicles.DB.Modules");
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
            };
            const files = svc.Generate(req);
            const eventFile = files.find((f) => f.name.includes("EventsDB"));
            expect(eventFile).toBeDefined();
            // Event content uses locale key, not event name directly
            expect(eventFile!.content).toContain(String(event.id));
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
            };
            const decl = svc.Generate(req).find((f) => f.name === "DB/ChroniclesDB.lua")!;
            const issues = validateLuaContent(decl.name, decl.content);
            expect(issues.filter((i) => i.includes("brace"))).toHaveLength(0);
        });
    });
});
