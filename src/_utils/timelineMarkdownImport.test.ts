import { describe, expect, it } from "vitest";

import {
    buildChroniclesImportFromTimelineMarkdown,
    parseTimelineMarkdown,
} from "./timelineMarkdownImport";

describe("parseTimelineMarkdown", () => {
    it("extracts top-level bullets and folds nested bullets into descriptions", () => {
        const markdown = `### Patch 7.0.3 Legion

- Battle for the Broken Shore - The Alliance and Horde attack the Broken Shore.
    - Varian Wrynn dies.
    - Vol'jin dies.
- Sylvanas becomes Warchief
    - Anduin becomes king.`;

        const entries = parseTimelineMarkdown(markdown);

        expect(entries).toHaveLength(2);
        expect(entries[0]).toMatchObject({
            patch: "7.0.3 Legion",
            title: "Battle for the Broken Shore",
        });
        expect(entries[0].description).toContain("The Alliance and Horde attack the Broken Shore.");
        expect(entries[0].description).toContain("Varian Wrynn dies.");
        expect(entries[1].description).toContain("Anduin becomes king.");
    });
});

describe("buildChroniclesImportFromTimelineMarkdown", () => {
    it("builds importable event and locale payloads for an existing collection", () => {
        const markdown = `### Patch 7.3.0
- Argus Campaign - The Army of the Light launches its assault.`;

        const importData = buildChroniclesImportFromTimelineMarkdown(markdown, {
            collectionId: 13,
            yearStart: 31,
            eventType: 3,
        });

        expect(importData.events).toHaveLength(1);
        expect(importData.locales).toHaveLength(2);
        expect(importData.events?.[0]).toMatchObject({
            id: 1,
            collectionId: 13,
            yearStart: 31,
            yearEnd: 31,
            eventType: 3,
            labelId: 1,
            order: 0,
        });
        expect(importData.events?.[0].chapters?.[0].pageIds).toEqual([2]);
    });
});
