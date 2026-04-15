import { describe, it, expect } from "vitest";
import { escapeLuaString } from "./luaUtils";

describe("escapeLuaString", () => {
    it("returns an empty string unchanged", () => {
        expect(escapeLuaString("")).toBe("");
    });

    it("escapes double quotes", () => {
        expect(escapeLuaString('say "hello"')).toBe('say \\"hello\\"');
    });

    it("escapes backslashes before other characters", () => {
        expect(escapeLuaString("C:\\Users\\foo")).toBe("C:\\\\Users\\\\foo");
    });

    it("does not double-escape backslashes introduced by quote escaping", () => {
        // A backslash followed by a quote: \\ then \" — not \\\"
        expect(escapeLuaString('\\"')).toBe('\\\\\\"');
    });

    it("escapes horizontal tabs", () => {
        expect(escapeLuaString("col1\tcol2")).toBe("col1\\tcol2");
    });

    it("strips NUL and other control chars below 0x09", () => {
        expect(escapeLuaString("\x00\x01\x07")).toBe("");
    });

    it("strips control chars 0x0B-0x0C (VT, FF)", () => {
        expect(escapeLuaString("\x0B\x0C")).toBe("");
    });

    it("strips control chars 0x0E-0x1F", () => {
        expect(escapeLuaString("\x0E\x1F")).toBe("");
    });

    it("strips DEL (0x7F)", () => {
        expect(escapeLuaString("\x7F")).toBe("");
    });

    it("preserves newline (0x0A) — caller handles it", () => {
        expect(escapeLuaString("line1\nline2")).toBe("line1\nline2");
    });

    it("preserves carriage return (0x0D) — caller handles it", () => {
        expect(escapeLuaString("line1\r\nline2")).toBe("line1\r\nline2");
    });

    it("handles a real author name without special chars", () => {
        expect(escapeLuaString("Blizzard Entertainment")).toBe(
            "Blizzard Entertainment"
        );
    });

    it('handles an author name with embedded quote and backslash', () => {
        expect(escapeLuaString('Author "Foo" \\ Bar')).toBe(
            'Author \\"Foo\\" \\\\ Bar'
        );
    });
});
