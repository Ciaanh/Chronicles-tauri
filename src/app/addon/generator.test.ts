import { describe, it, expect } from "vitest";
import { validateLuaContent } from "./generator";

describe("validateLuaContent", () => {
    it("returns no issues for valid balanced braces and quotes", () => {
        const lua = `local t = { key = "value" }`;
        expect(validateLuaContent("test.lua", lua)).toEqual([]);
    });

    it("reports missing closing brace", () => {
        const lua = `local t = { key = "value"`;
        const issues = validateLuaContent("test.lua", lua);
        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatch(/unbalanced braces/);
    });

    it("reports unexpected closing brace", () => {
        const lua = `local t = } `;
        const issues = validateLuaContent("test.lua", lua);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0]).toMatch(/unexpected closing brace/);
    });

    it("reports unbalanced double quotes", () => {
        const lua = `local s = "hello`;
        const issues = validateLuaContent("test.lua", lua);
        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatch(/unbalanced double quotes/);
    });

    it("does not count escaped quotes as unbalanced", () => {
        const lua = `local s = "say \\"hello\\" world"`;
        expect(validateLuaContent("test.lua", lua)).toEqual([]);
    });

    it("returns multiple issues when both braces and quotes are unbalanced", () => {
        const lua = `local t = { key = "value`;
        const issues = validateLuaContent("test.lua", lua);
        expect(issues.length).toBe(2);
    });

    it("includes the file name in each issue", () => {
        const lua = `local t = {`;
        const issues = validateLuaContent("MyFile.lua", lua);
        expect(issues[0]).toContain("MyFile.lua");
    });

    it("handles empty content without errors", () => {
        expect(validateLuaContent("empty.lua", "")).toEqual([]);
    });

    it("handles nested balanced braces correctly", () => {
        const lua = `local t = { a = { b = { c = 1 } } }`;
        expect(validateLuaContent("nested.lua", lua)).toEqual([]);
    });
});
