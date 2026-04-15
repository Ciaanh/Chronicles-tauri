/**
 * Escapes a string value for safe embedding inside a Lua double-quoted string literal.
 *
 * Order matters: backslash must be escaped first to avoid double-escaping
 * characters introduced by subsequent replacements.
 *
 * Newline handling (\n / \r\n) is intentionally left to the caller because
 * some contexts (HTML locales) collapse newlines to spaces while others
 * (plain locales) encode them as the Lua escape sequence \n.
 */
export function escapeLuaString(value: string): string {
    return (
        value
            .replace(/\\/g, "\\\\") // backslash — must be first
            .replace(/"/g, '\\"') // double quote
            .replace(/\t/g, "\\t") // horizontal tab
            // eslint-disable-next-line no-control-regex
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    ); // strip remaining control chars (preserves \n=0x0A, \r=0x0D)
}
