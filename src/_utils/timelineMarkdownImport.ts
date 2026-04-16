import { DB_Event, DB_Locale } from "../database/models";
import type { ChroniclesDbJson } from "./importDb";

export interface TimelineMarkdownEntry {
    patch?: string;
    title: string;
    description: string;
    sourceLine: number;
}

export interface TimelineMarkdownImportOptions {
    collectionId: number;
    yearStart: number;
    yearEnd?: number;
    eventType?: number;
    timeline?: number;
    orderStart?: number;
    linkResolver?: (entry: TimelineMarkdownEntry) => string;
}

function stripMarkdown(text: string): string {
    return text
        .replace(/\u00a0/g, " ")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizePatchName(rawPatchName: string): string {
    return stripMarkdown(rawPatchName.replace(/\[edit\]/gi, "").replace(/^_+|_+$/g, ""));
}

function splitBulletContent(content: string): { title: string; lead?: string } {
    const cleaned = stripMarkdown(content);
    const separatorIndex = cleaned.indexOf(" - ");
    if (separatorIndex === -1) {
        return { title: cleaned };
    }

    return {
        title: cleaned.slice(0, separatorIndex).trim(),
        lead: cleaned.slice(separatorIndex + 3).trim(),
    };
}

export function parseTimelineMarkdown(markdown: string): TimelineMarkdownEntry[] {
    const lines = markdown.split(/\r?\n/);
    const entries: TimelineMarkdownEntry[] = [];

    let currentPatch: string | undefined;
    let currentEntry:
        | {
              patch?: string;
              title: string;
              descriptionParts: string[];
              sourceLine: number;
          }
        | undefined;

    const flushEntry = (): void => {
        if (!currentEntry) {
            return;
        }

        const description = currentEntry.descriptionParts.join(" ").trim();
        entries.push({
            patch: currentEntry.patch,
            title: currentEntry.title,
            description:
                description ||
                (currentEntry.patch
                    ? `Patch ${currentEntry.patch}: ${currentEntry.title}.`
                    : currentEntry.title),
            sourceLine: currentEntry.sourceLine,
        });
        currentEntry = undefined;
    };

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const patchMatch = line.match(/^###\s+_?Patch\s+(.+?)_?$/i);
        if (patchMatch) {
            flushEntry();
            currentPatch = normalizePatchName(patchMatch[1]);
            continue;
        }

        const bulletMatch = line.match(/^(\s*)-\s+(.*)$/);
        if (!bulletMatch) {
            if (currentEntry && line.trim() && !line.trimStart().startsWith("#")) {
                currentEntry.descriptionParts.push(stripMarkdown(line));
            }
            continue;
        }

        const indent = bulletMatch[1].replace(/\t/g, "    ").length;
        const content = bulletMatch[2].trim();
        if (!content) {
            continue;
        }

        if (indent <= 3) {
            flushEntry();
            const { title, lead } = splitBulletContent(content);
            currentEntry = {
                patch: currentPatch,
                title,
                descriptionParts: [currentPatch ? `Patch ${currentPatch}.` : "", lead ?? ""].filter(
                    Boolean
                ),
                sourceLine: index + 1,
            };
            continue;
        }

        if (currentEntry) {
            currentEntry.descriptionParts.push(stripMarkdown(content));
        }
    }

    flushEntry();

    return entries.filter((entry) => entry.title.length > 0);
}

export function buildChroniclesImportFromTimelineMarkdown(
    markdown: string,
    options: TimelineMarkdownImportOptions
): ChroniclesDbJson {
    const entries = parseTimelineMarkdown(markdown);
    const locales: DB_Locale[] = [];
    const events: DB_Event[] = [];

    let nextLocaleId = 1;
    const yearEnd = options.yearEnd ?? options.yearStart;
    const eventType = options.eventType ?? 1;
    const timeline = options.timeline ?? 1;
    const orderStart = options.orderStart ?? 0;

    entries.forEach((entry, index) => {
        const labelId = nextLocaleId;
        const pageId = nextLocaleId + 1;
        nextLocaleId += 2;

        locales.push(
            {
                id: labelId,
                ishtml: false,
                enUS: entry.title,
            },
            {
                id: pageId,
                ishtml: false,
                enUS: entry.description,
            }
        );

        events.push({
            id: index + 1,
            name: entry.title,
            yearStart: options.yearStart,
            yearEnd,
            eventType,
            timeline,
            collectionId: options.collectionId,
            link: options.linkResolver ? options.linkResolver(entry) : "",
            factionIds: [],
            characterIds: [],
            labelId,
            chapters: [{ headerId: null, pageIds: [pageId] }],
            order: orderStart + index,
        });
    });

    return { events, locales };
}
