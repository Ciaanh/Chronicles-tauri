import { describe, it, expect, vi } from "vitest";
import { LocaleUtils } from "./localeUtils";
import type { ContextValue } from "../database/dbcontext";
import type { Locale } from "../database/models";
import { Language } from "../constants";

function makeLocale(overrides: Partial<Locale> = {}): Locale {
    return {
        id: -1,
        enUS: "Hello",
        ishtml: false,
        translations: {
            [Language.enUS]: "",
            [Language.deDE]: "",
            [Language.esES]: "",
            [Language.esMX]: "",
            [Language.frFR]: "",
            [Language.itIT]: "",
            [Language.ptBR]: "",
            [Language.ruRU]: "",
            [Language.koKR]: "",
            [Language.zhCN]: "",
            [Language.zhTW]: "",
        },
        ...overrides,
    };
}

function makeDbContext(
    addResult: Locale | null = makeLocale({ id: 42 }),
    updateResult: Locale | null = makeLocale({ id: 1 })
): ContextValue {
    return {
        add: vi.fn().mockResolvedValue(addResult),
        update: vi.fn().mockResolvedValue(updateResult),
        get: vi.fn(),
        getAll: vi.fn(),
        remove: vi.fn(),
        load: vi.fn(),
        loadFromPath: vi.fn(),
        saveAs: vi.fn(),
        createNew: vi.fn(),
        loading: false,
        lastLoadedPath: null,
        loadError: null,
        history: [],
        mappers: {} as never,
    };
}

describe("LocaleUtils.createOrUpdateLocale", () => {
    it("calls add() when locale has id=-1", async () => {
        const ctx = makeDbContext();
        const locale = makeLocale({ id: -1, enUS: "New text" });
        const result = await LocaleUtils.createOrUpdateLocale(locale, ctx);
        expect(ctx.add).toHaveBeenCalledOnce();
        expect(ctx.update).not.toHaveBeenCalled();
        expect(result.id).toBe(42);
    });

    it("calls add() when locale has no id", async () => {
        const ctx = makeDbContext();
        const locale = makeLocale({ id: undefined as unknown as number });
        await LocaleUtils.createOrUpdateLocale(locale, ctx);
        expect(ctx.add).toHaveBeenCalledOnce();
    });

    it("calls update() when locale has a valid positive id", async () => {
        const ctx = makeDbContext();
        const locale = makeLocale({ id: 5, enUS: "Existing text" });
        const result = await LocaleUtils.createOrUpdateLocale(locale, ctx);
        expect(ctx.update).toHaveBeenCalledOnce();
        expect(ctx.add).not.toHaveBeenCalled();
        expect(result.id).toBe(5); // update returns original locale
    });

    it("preserves ishtml flag when adding", async () => {
        const ctx = makeDbContext();
        const locale = makeLocale({ id: -1, ishtml: true });
        await LocaleUtils.createOrUpdateLocale(locale, ctx);
        const callArg = (ctx.add as ReturnType<typeof vi.fn>).mock.calls[0][0] as Locale;
        expect(callArg.ishtml).toBe(true);
    });

    it("throws when add returns null", async () => {
        const ctx = makeDbContext(null);
        const locale = makeLocale({ id: -1 });
        await expect(LocaleUtils.createOrUpdateLocale(locale, ctx)).rejects.toThrow(
            "Failed to create locale"
        );
    });
});

describe("LocaleUtils.processChapterLocales", () => {
    it("creates locales for header and pages", async () => {
        const ctx = makeDbContext(makeLocale({ id: 99 }));
        const chapter = {
            header: makeLocale({ id: -1, enUS: "Header" }),
            pages: [makeLocale({ id: -1, enUS: "Page 1" })],
        };
        const result = await LocaleUtils.processChapterLocales(chapter, ctx);
        expect(ctx.add).toHaveBeenCalledTimes(2); // header + 1 page
        expect(result.header?.id).toBe(99);
        expect(result.pages[0].id).toBe(99);
    });

    it("skips header when null", async () => {
        const ctx = makeDbContext(makeLocale({ id: 99 }));
        const chapter = {
            header: null,
            pages: [makeLocale({ id: -1, enUS: "Page" })],
        };
        const result = await LocaleUtils.processChapterLocales(chapter, ctx);
        expect(ctx.add).toHaveBeenCalledTimes(1);
        expect(result.header).toBeNull();
    });
});
