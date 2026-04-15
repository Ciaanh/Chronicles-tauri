import { describe, it, expect } from "vitest";
import { LocaleService } from "./localeService";
import { FileGenerationRequest } from "../generator";
import { Event } from "../../../database/models/appObjects/Event";
import { Character } from "../../../database/models/appObjects/Character";
import { Faction } from "../../../database/models/appObjects/Faction";

const baseRequest = (): FileGenerationRequest => ({
    collections: [],
    events: [],
    factions: [],
    characters: [],
});

const makeCollection = (id: number, name: string, index: string) => ({
    id,
    name,
    index,
});

describe("LocaleService", () => {
    describe("Generate", () => {
        it("returns an empty array when no collections are provided", () => {
            const svc = new LocaleService();
            const files = svc.Generate(baseRequest());
            expect(Array.isArray(files)).toBe(true);
        });

        it("generates locale files for each language for a collection with events", () => {
            const svc = new LocaleService();
            const collection = { id: 1, name: "Lore" };
            const event: Event = {
                id: 1,
                name: "The Great War",
                collection: collection as Event["collection"],
                label: { id: 1, enUS: "The Great War description", ishtml: false },
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
            expect(files.length).toBeGreaterThan(0);
            // Should have locale .lua files
            const luaFiles = files.filter((f) => f.name.endsWith(".lua"));
            expect(luaFiles.length).toBeGreaterThan(0);
        });

        it("includes XML index file with locale scripts", () => {
            const svc = new LocaleService();
            const req: FileGenerationRequest = {
                collections: [makeCollection(1, "Lore", "01")],
                events: [],
                factions: [],
                characters: [],
            };
            const files = svc.Generate(req);
            const xmlFile = files.find((f) => f.name.endsWith(".xml"));
            expect(xmlFile).toBeDefined();
        });

        it("locale file content contains locale key for event label", () => {
            const svc = new LocaleService();
            const collection = { id: 1, name: "Lore" };
            const label = { id: 1, enUS: "An important event", ishtml: false };
            const event: Event = {
                id: 1,
                name: "Event One",
                collection: collection as Event["collection"],
                label,
                period: { yearStart: 0, yearEnd: 100 },
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
            // enUS locale file should contain the label enUS text
            const enFile = files.find((f) => f.name.includes("enUS") && f.name.endsWith(".lua"));
            expect(enFile).toBeDefined();
            expect(enFile!.content).toContain("An important event");
        });

        it("generates locale files for factions", () => {
            const svc = new LocaleService();
            const collection = { id: 1, name: "Lore" };
            const faction: Faction = {
                id: 1,
                name: "Alliance",
                collection: collection as Faction["collection"],
                label: { id: 2, enUS: "The Alliance faction", ishtml: false },
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
            const enFile = files.find((f) => f.name.includes("enUS") && f.name.endsWith(".lua"));
            expect(enFile).toBeDefined();
            expect(enFile!.content).toContain("The Alliance faction");
        });

        it("generates locale files for characters", () => {
            const svc = new LocaleService();
            const collection = { id: 1, name: "Lore" };
            const character: Character = {
                id: 1,
                name: "Arthas",
                collection: collection as Character["collection"],
                label: { id: 3, enUS: "A fallen prince", ishtml: false },
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
            const enFile = files.find((f) => f.name.includes("enUS") && f.name.endsWith(".lua"));
            expect(enFile).toBeDefined();
            expect(enFile!.content).toContain("A fallen prince");
        });
    });
});
