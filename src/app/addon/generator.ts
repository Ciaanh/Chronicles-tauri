import { Character } from "../../database/models/appObjects/Character";
import { Collection } from "../../database/models/appObjects/Collection";
import { Event } from "../../database/models/appObjects/Event";
import { Faction } from "../../database/models/appObjects/Faction";
import { DBService } from "./services/dbService";
import { LocaleService } from "./services/localeService";
import { FileApi } from "../../_utils/files/fileApi";

export interface GenerationRequest {
    collections: Collection[];
    events: Event[];
    factions: Faction[];
    characters: Character[];
}

export interface FormatedCollection {
    id: number;
    name: string;
    index: string;
}
export interface FileGenerationRequest {
    collections: FormatedCollection[];
    events: Event[];
    factions: Faction[];
    characters: Character[];
}

export class AddonGenerator {
    Create = function (request: GenerationRequest, fileApi: FileApi) {
        if (request.collections.length > 0) {
            // --- Core mapping logic for Tauri (using id, not _id) ---
            const preparedCollections = request.collections.map(
                (collection: Collection, zeroBasedIndex: number) => {
                    const index = zeroBasedIndex + 1;
                    const formatedIndex = index > 9 ? String(index) : `0${index}`;
                    return {
                        id: collection.id,
                        name: collection.name,
                        index: formatedIndex,
                    };
                }
            );

            // Map events, factions, characters to the expected Lua structure
            const mapEvent = (event: Event) => ({
                id: event.id,
                label: event.label, // Should be localized key or object
                // description: event.description, // If present
                chapters: event.chapters, // Array of chapters with header/pages
                yearStart: event.period?.yearStart ?? 0,
                yearEnd: event.period?.yearEnd ?? 0,
                eventType: event.eventType,
                timeline: event.timeline,
                order: event.order,
                characters: Array.isArray(event.characters)
                    ? event.characters.filter(c => c && typeof c.id !== 'undefined').map(c => c.id)
                    : [],
                factions: Array.isArray(event.factions)
                    ? event.factions.filter(f => f && typeof f.id !== 'undefined').map(f => f.id)
                    : [],
            });
            const mapFaction = (faction: Faction) => ({
                id: faction.id,
                name: faction.label, // Should be localized key or object
                description: faction.description, // Localized key or object
                timeline: faction.timeline,
            });
            const mapCharacter = (character: Character) => ({
                id: character.id,
                name: character.label, // Localized key or object
                biography: character.biography, // Localized key or object
                timeline: character.timeline,
                factions: Array.isArray(character.factions)
                    ? character.factions.filter(f => f && typeof f.id !== 'undefined').map(f => f.id)
                    : [],
            });

            // Prepare mapped data for file generation
            const mappedEvents = request.events.map(mapEvent);
            const mappedFactions = request.factions.map(mapFaction);
            const mappedCharacters = request.characters.map(mapCharacter);

            // Fix type for preparedCollections
            const fileGenerationRequest: FileGenerationRequest = {
                collections: preparedCollections as any, // id instead of _id
                events: mappedEvents as any,
                factions: mappedFactions as any,
                characters: mappedCharacters as any,
            };
            const locale = new LocaleService().Generate(fileGenerationRequest);
            const db = new DBService().Generate(fileGenerationRequest);

            // merge arrays locale and db
            const merged = ([] as any[]).concat(locale, db);

            fileApi.pack(merged);
        }
    };
}
