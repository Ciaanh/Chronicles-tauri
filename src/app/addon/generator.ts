import { Character } from "../../database/models/appObjects/Character";
import { Collection } from "../../database/models/appObjects/Collection";
import { Event } from "../../database/models/appObjects/Event";
import { Faction } from "../../database/models/appObjects/Faction";
import { DBService } from "./services/dbService";
import { LocaleService } from "./services/localeService";
import { FileApi } from "../../_utils/files/fileApi";
import { FileContent } from "../../_utils/files/fileContent";

export interface GenerationRequest {
    collections: Collection[];
    events: Event[];
    factions: Faction[];
    characters: Character[];
}

export interface FormattedCollection {
    id: number;
    name: string;
    index: string;
}
export interface FileGenerationRequest {
    collections: FormattedCollection[];
    events: Event[];
    factions: Faction[];
    characters: Character[];
}

export class AddonGenerator {
    Create = async function (request: GenerationRequest, fileApi: FileApi): Promise<void> {
        if (request.collections.length > 0) {
            // Prepare collections for file generation (add index)
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

            // Use the original objects (with all properties) for events, factions, characters
            const fileGenerationRequest: FileGenerationRequest = {
                collections: preparedCollections,
                events: request.events,
                factions: request.factions,
                characters: request.characters,
            };
            const locale = new LocaleService().Generate(fileGenerationRequest);
            const db = new DBService().Generate(fileGenerationRequest);

            // merge arrays locale and db
            const merged: FileContent[] = [...locale, ...db];

            await fileApi.pack(merged);
        }
    };
}
