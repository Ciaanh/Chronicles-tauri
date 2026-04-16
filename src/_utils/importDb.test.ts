import { describe, expect, it } from "vitest";

import { prepareImport } from "./importDb";

describe("prepareImport", () => {
    it("preserves collection ids when importing records without collection definitions", async () => {
        const prepared = await prepareImport(
            {
                locales: [
                    { id: 1, ishtml: false, enUS: "Imported Event" },
                    { id: 2, ishtml: false, enUS: "Imported event description." },
                ],
                events: [
                    {
                        id: 1,
                        name: "Imported Event",
                        yearStart: 31,
                        yearEnd: 31,
                        eventType: 1,
                        timeline: 1,
                        collectionId: 13,
                        link: "",
                        factionIds: [],
                        characterIds: [],
                        labelId: 1,
                        chapters: [{ headerId: null, pageIds: [2] }],
                        order: 0,
                    },
                ],
            },
            {
                getAll: async () => [],
            }
        );

        const added: Array<{ record: { collectionId?: number }; table: string }> = [];
        await prepared.apply({
            add: async (record, table) => {
                added.push({ record, table });
            },
        } as never);

        const eventRecord = added.find((entry) => entry.table === "events")?.record;
        expect(eventRecord?.collectionId).toBe(13);
    });
});
