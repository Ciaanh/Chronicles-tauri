import { Character } from "../../database/models/appObjects/Character";
import { Collection } from "../../database/models/appObjects/Collection";
import { Event } from "../../database/models/appObjects/Event";
import { Faction } from "../../database/models/appObjects/Faction";
import { DBService } from "./services/dbService";
import { LocaleService } from "./services/localeService";
import { FileApi } from "../../_utils/files/fileApi";
import { FileContent } from "../../_utils/files/fileContent";

export enum AddonExportMode {
    External = "external",
    Embedded = "embedded",
}

export interface GenerationRequest {
    collections: Collection[];
    events: Event[];
    factions: Faction[];
    characters: Character[];
    mode?: AddonExportMode;
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
    mode: AddonExportMode;
}

/** Basic post-generation Lua syntax sanity check. Returns a list of issues found. */
export function validateLuaContent(fileName: string, content: string): string[] {
    const issues: string[] = [];

    // Check balanced braces
    let depth = 0;
    for (const ch of content) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        if (depth < 0) {
            issues.push(`${fileName}: unexpected closing brace '}'`);
            break;
        }
    }
    if (depth !== 0)
        issues.push(`${fileName}: unbalanced braces (net ${depth > 0 ? "+" : ""}${depth})`);

    // Check balanced double-quotes (naive — counts unescaped quotes)
    let quoteCount = 0;
    for (let i = 0; i < content.length; i++) {
        if (content[i] === "\\") {
            i++;
            continue;
        } // skip escaped char
        if (content[i] === '"') quoteCount++;
    }
    if (quoteCount % 2 !== 0) issues.push(`${fileName}: unbalanced double quotes`);

    return issues;
}

export class AddonGenerator {
    Create = async function (request: GenerationRequest, fileApi: FileApi): Promise<string[]> {
        const warnings: string[] = [];
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

            const fileGenerationRequest: FileGenerationRequest = {
                collections: preparedCollections,
                events: request.events,
                factions: request.factions,
                characters: request.characters,
                mode: request.mode ?? AddonExportMode.External,
            };
            const locale = new LocaleService().Generate(fileGenerationRequest);
            const db = new DBService().Generate(fileGenerationRequest);

            const merged: FileContent[] = [...locale, ...db];

            // Post-generation validation
            for (const file of merged) {
                if (file.name.endsWith(".lua")) {
                    const issues = validateLuaContent(file.name, file.content);
                    warnings.push(...issues);
                }
            }

            await fileApi.pack(merged);
        }
        return warnings;
    };
}
