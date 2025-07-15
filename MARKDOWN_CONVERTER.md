# Chronicles Markdown to WoW HTML Converter

This document describes the Markdown to WoW HTML converter implementation based on LibMarkdown for the Chronicles addon.

## Overview

The `MarkdownConverter` class provides a TypeScript implementation of the LibMarkdown functionality, converting markdown text into HTML that's compatible with World of Warcraft's SimpleHTML system.

## Features

### Supported Markdown Syntax

#### Headers
```markdown
# Header 1
## Header 2
### Header 3

Header 1
========

Header 2
--------
```

#### Text Formatting
- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*` or `_text_`
- `Inline code`: `` `code` ``

#### Lists
```markdown
* Unordered list
- Alternative syntax
+ Another alternative

1. Ordered list
2. Second item

i. Roman numerals (extension)
ii. Second roman

a) Letter lists (extension)
b) Second letter
```

#### Code Blocks
````markdown
```
Fenced code blocks
```

    Indented code blocks (4 spaces)
````

#### Links and Images
```markdown
[Link text](http://example.com)
![Alt text](path/to/image.png "Caption" 64x64 center)
```

#### Blockquotes
```markdown
> This is a blockquote
> Multiple lines supported
```

#### WoW-Specific Features

**Raid Targeting Icons:**
```markdown
{star} {circle} {diamond} {triangle}
{moon} {square} {cross} {skull}

# Aliases also work:
{Star} {Coin} {Diamond} {Triangle}
{Moon} {Square} {X} {Skull}
```

**HTML Entities:**
```markdown
&nbsp; &emsp; &ensp; &em13; &em14; &thinsp;
```

**List Separators:**
```markdown
1. First list
2. Second item
^
a) New list starts here
b) Second item
```

## API Reference

### Basic Usage

```typescript
import { MarkdownConverter } from '../_utils/markdownConverter';

// Convert markdown to HTML
const html = MarkdownConverter.toHtml(markdownText);

// Check if text contains markdown
const isMarkdown = MarkdownConverter.isMarkdown(locale);

// Process a locale object
const processedLocale = MarkdownConverter.processLocale(locale);

// Process a chapter
const processedChapter = MarkdownConverter.processChapter(chapter);
```

### Methods

#### `toHtml(markdown: string): string`
Converts markdown text to WoW-compatible HTML.

#### `safeToHtml(markdown: string): string`
Safely converts markdown with error handling and input validation.

#### `isMarkdown(locale: Locale): boolean`
Detects if a locale contains markdown syntax.

#### `processLocale(locale: Locale): Locale`
Processes a locale object, converting markdown content to HTML if detected.

#### `processChapter(chapter: Chapter): Chapter`
Processes a chapter, converting all markdown content in headers and pages.

#### `processChapters(chapters: Chapter[]): Chapter[]`
Processes multiple chapters.

#### `showConfig(): string`
Returns current configuration settings.

#### `updateConfig(config: object): void`
Updates configuration settings.

#### `validateMarkdown(markdown: string): string`
Validates and sanitizes markdown input.

## Integration

### Automatic Processing

The markdown converter is integrated into the Chronicles system at multiple levels:

1. **Database Layer**: The `LocaleMapper` automatically processes markdown when saving/loading
2. **Utility Layer**: `LocaleUtils.createOrUpdateLocale()` processes markdown automatically
3. **UI Layer**: Components detect markdown and show appropriate previews

### Manual Processing

You can also manually process content:

```typescript
// Process when creating/updating locales
const processedLocale = await LocaleUtils.createOrUpdateLocale(locale, dbContext);

// Process chapters before saving
const processedChapters = MarkdownConverter.processChapters(chapters);
```

## Configuration

The converter can be configured to change the appearance of certain elements:

```typescript
// Update color for emphasized text
MarkdownConverter.updateConfig({
  'em': '|cffff0000',        // Red emphasized text
  '/em': '|r',               // Reset color
  'strong': '|cff00ff00',    // Green bold text
  '/strong': '|r'            // Reset color
});

// View current configuration
console.log(MarkdownConverter.showConfig());
```

## WoW HTML Output

The converter produces HTML compatible with WoW's SimpleHTML system:

- Uses WoW color codes (`|cffRRGGBB` and `|r`)
- Uses texture references for spacing (`|TTexture:size|t`)
- Supports only basic HTML tags (`<p>`, `<h1>-<h3>`, `<br>`, `<a>`, `<img>`)
- Handles raid targeting icons as texture references

## Example Usage in Components

### In Locale Editor
```typescript
const isMarkdownContent = isMarkdownMode || MarkdownConverter.isMarkdown(locale);

const preview = isMarkdownContent 
  ? MarkdownConverter.toHtml(locale.enUS)
  : locale.enUS;
```

### In Chapter Editor
```typescript
const updateChapter = (chapter: Chapter) => {
  const processedChapter = MarkdownConverter.processChapter(chapter);
  // Save or update the processed chapter
};
```

## Error Handling

The converter includes error handling:

- `safeToHtml()` method catches conversion errors
- Input validation removes potentially dangerous content
- Graceful fallback to original text on errors

## Performance Considerations

- Markdown detection uses efficient regex patterns
- Processing only occurs when markdown is detected
- Caching of processed content in locale objects via `ishtml` flag
- Bulk processing methods for multiple items

## Demo

A comprehensive demo is available in the application under the "Markdown Demo" tab, showcasing all supported features and providing a live editor.

## Testing

To test the markdown converter:

1. Use the demo component for interactive testing
2. Create test locales with markdown content
3. Verify automatic conversion in the UI
4. Check exported addon files for proper HTML

## Troubleshooting

### Common Issues

1. **Content not converting**: Check if `ishtml` flag is already set
2. **Incorrect colors**: Verify WoW color code format (`|cffRRGGBB`)
3. **Missing icons**: Ensure texture paths are correct for your WoW version
4. **List formatting**: Use caret (`^`) to separate consecutive lists

### Debug Information

```typescript
// Check if content is detected as markdown
const isMarkdown = MarkdownConverter.isMarkdown(locale);

// View configuration
console.log(MarkdownConverter.showConfig());

// Validate input
const validated = MarkdownConverter.validateMarkdown(input);
```
