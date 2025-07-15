/**
 * Markdown to WoW HTML converter service
 * This service bridges the LibMarkdown Lua library functionality
 * to TypeScript for converting markdown content to WoW-compatible HTML
 */

import { Locale } from "../database/models/appObjects/Locale";
import { Chapter } from "../database/models/appObjects/Chapter";

/**
 * Converts markdown text to WoW-compatible HTML using LibMarkdown patterns
 * This TypeScript implementation mirrors the LibMarkdown Lua library functionality
 */
export class MarkdownConverter {
  // Configuration mapping for WoW UI escape codes and HTML tags
  // Based on LibMarkdown.config from the Lua library
  private static readonly CONFIG: { [key: string]: string } = {
    // Raid targeting icons
    rt1: '|TInterface\\TARGETINGFRAME\\UI-RAIDTARGETINGICON_1.PNG:0|t',
    rt2: '|TInterface\\TARGETINGFRAME\\UI-RAIDTARGETINGICON_2.PNG:0|t',
    rt3: '|TInterface\\TARGETINGFRAME\\UI-RAIDTARGETINGICON_3.PNG:0|t',
    rt4: '|TInterface\\TARGETINGFRAME\\UI-RAIDTARGETINGICON_4.PNG:0|t',
    rt5: '|TInterface\\TARGETINGFRAME\\UI-RAIDTARGETINGICON_5.PNG:0|t',
    rt6: '|TInterface\\TARGETINGFRAME\\UI-RAIDTARGETINGICON_6.PNG:0|t',
    rt7: '|TInterface\\TARGETINGFRAME\\UI-RAIDTARGETINGICON_7.PNG:0|t',
    rt8: '|TInterface\\TARGETINGFRAME\\UI-RAIDTARGETINGICON_8.PNG:0|t',
    
    // Spacing entities
    emsp: '|TInterface\\Store\\ServicesAtlas:0:0.75:0:0:1024:1024:1023:1024:1023:1024|t ',
    ensp: '|TInterface\\Store\\ServicesAtlas:0:0.25:0:0:1024:1024:1023:1024:1023:1024|t ',
    em13: '|TInterface\\Store\\ServicesAtlas:0:0.08:0:0:1024:1024:1023:1024:1023:1024|t ',
    em14: ' ',
    nbsp: '|TInterface\\Store\\ServicesAtlas:0:0.175:0:0:1024:1024:1023:1024:1023:1024|t',
    thinsp: '|TInterface\\Store\\ServicesAtlas:0:0.100:0:0:1024:1024:1023:1024:1023:1024|t',
    
    // Text formatting
    strong: '|cff00dddd',
    '/strong': '|r',
    em: '|cff00dd00',
    '/em': '|r',
    
    // Lists
    ul: '<p>',
    '/ul': '</p><br />',
    ol: '<p>',
    '/ol': '</p><br />',
    li: '',
    '/li': '<br />',
    list_marker: '*',
    
    // Code blocks
    pre: '<p>|cff66bbbb',
    '/pre': '|r</p><br />',
    code: '|cff66bbbb',
    '/code': '|r',
    
    // Other elements
    br: '<br />',
    blockquote: '<hr width="100"/><p align="center">|cffbbbb00"',
    '/blockquote': '"|r</p><br /><hr width="100"/><br />',
    
    // Headers
    h1: '<h1>',
    '/h1': '</h1><br />',
    h2: '<h2>',
    '/h2': '</h2><br />',
    h3: '<h3>',
    '/h3': '</h3><br />',
    
    // Paragraphs
    p: '<p>',
    '/p': '</p><br />',
    
    // Root elements
    html: '<html>',
    '/html': '</html>',
    body: '<body>',
    '/body': '</body>',
    
    // Figure captions
    figcaption: 'Caption: |cffbbbb00',
    '/figcaption': '|r',
  };

  // Raid targeting icon aliases
  private static readonly RT_ALIASES = {
    rt1: ['Star'],
    rt2: ['Circle', 'Coin'],
    rt3: ['Diamond'],
    rt4: ['Triangle'],
    rt5: ['Moon'],
    rt6: ['Square'],
    rt7: ['Cross', 'X'],
    rt8: ['Skull'],
  };

  /**
   * Converts markdown text to WoW-compatible HTML
   * @param markdown The markdown text to convert
   * @returns HTML suitable for WoW's SimpleHTML frames
   */
  static toHtml(markdown: string): string {
    if (!markdown || markdown.trim() === '') {
      return '';
    }

    let html = markdown;

    // Normalize line endings
    html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Convert tabs to spaces
    html = this.convertTabs(html);

    // Process block-level elements first (order matters!)
    html = this.processCodeBlocks(html);
    html = this.processHeaders(html);
    html = this.processBlockquotes(html);
    html = this.processLists(html);
    
    // Process inline elements
    html = this.processInlineCode(html);
    html = this.processImages(html);
    html = this.processLinks(html);
    html = this.processEmphasis(html);
    
    // Process entities and special tokens before paragraphs
    html = this.processEntities(html);
    html = this.processRaidTargetingIcons(html);
    
    // Process paragraphs and line breaks last
    html = this.processParagraphs(html);
    html = this.processLineBreaks(html);

    // Wrap in HTML structure
    html = this.CONFIG.html + this.CONFIG.body + html + this.CONFIG['/body'] + this.CONFIG['/html'];

    return html;
  }

  /**
   * Checks if content is already formatted HTML
   * @param content The content to check
   * @returns True if the content appears to be HTML
   */
  static isHtml(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    // Check for common HTML patterns
    const htmlPatterns = [
      /<[^>]+>/,                    // Any HTML tag
      /&[a-zA-Z]+;/,                // HTML entities
      /&#\d+;/,                     // Numeric HTML entities
      /<\/[^>]+>/,                  // Closing HTML tags
      /<(p|div|span|h[1-6]|br|img|a)\b[^>]*>/i, // Common HTML tags
    ];

    return htmlPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Checks if a locale contains markdown syntax
   * @param locale The locale to check
   * @returns True if the content appears to contain markdown
   */
  static isMarkdown(locale: Locale): boolean {
    if (!locale || !locale.enUS) {
      return false;
    }

    const content = locale.enUS;
    
    // If already marked as HTML or contains HTML patterns, it's not markdown
    if (locale.ishtml || this.isHtml(content)) {
      return false;
    }
    
    // Check for common markdown patterns
    const markdownPatterns = [
      /^#{1,6}\s+.+$/m,           // Headers
      /\*\*[^*]+\*\*/,            // Bold
      /\*[^*]+\*/,                // Italic (but not HTML list items)
      /`[^`]+`/,                  // Inline code
      /^```[\s\S]*?```$/m,        // Code blocks
      /^\s*[-*+]\s+/m,            // Unordered lists
      /^\s*\d+\.\s+/m,            // Ordered lists
      /^\s*>\s+/m,                // Blockquotes
      /\[.+\]\(.+\)/,             // Links (markdown style)
      /!\[.*\]\(.+\)/,            // Images (markdown style)
      /^\s*[ivxIVX]+[.\]]\s+/m,   // Roman numeral lists
      /^\s*[a-zA-Z][.\)]\s+/m,    // Letter lists
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Process a locale and convert markdown to HTML if needed
   * Handles three content types:
   * 1. Plain text - preserved as-is (ishtml=false) for addon conversion
   * 2. Markdown - converted to WoW HTML (ishtml=true)
   * 3. Pre-formatted HTML - preserved as-is (ishtml=true)
   * @param locale The locale to process
   * @returns The processed locale with appropriate content type
   */
  static processLocale(locale: Locale): Locale {
    if (!locale) {
      return locale;
    }

    const processedLocale = { ...locale };

    // Check and convert enUS content
    if (processedLocale.enUS) {
      // If already HTML, preserve it as-is
      if (processedLocale.ishtml || this.isHtml(processedLocale.enUS)) {
        processedLocale.ishtml = true;
      }
      // If contains markdown, convert it
      else if (this.isMarkdown({ ...locale, enUS: processedLocale.enUS })) {
        processedLocale.enUS = this.toHtml(processedLocale.enUS);
        processedLocale.ishtml = true;
      }
      // Otherwise, it's plain text - leave ishtml=false for addon conversion
    }

    // Check and convert translations
    if (processedLocale.translations) {
      for (const [lang, content] of Object.entries(processedLocale.translations)) {
        if (content) {
          // If already HTML, preserve it as-is
          if (this.isHtml(content)) {
            processedLocale.ishtml = true;
          }
          // If contains markdown, convert it
          else if (this.isMarkdown({ ...locale, enUS: content })) {
            processedLocale.translations[lang as keyof typeof processedLocale.translations] = this.toHtml(content);
            processedLocale.ishtml = true;
          }
          // Otherwise, it's plain text - leave for addon conversion
        }
      }
    }

    return processedLocale;
  }

  /**
   * Process a chapter and convert all markdown content to HTML
   * @param chapter The chapter to process
   * @returns The processed chapter with converted content
   */
  static processChapter(chapter: Chapter): Chapter {
    if (!chapter) {
      return chapter;
    }

    const processedChapter = { ...chapter };

    // Process header
    if (processedChapter.header) {
      processedChapter.header = this.processLocale(processedChapter.header);
    }

    // Process pages
    if (processedChapter.pages && Array.isArray(processedChapter.pages)) {
      processedChapter.pages = processedChapter.pages.map((page: Locale) => 
        page ? this.processLocale(page) : page
      );
    }

    return processedChapter;
  }

  /**
   * Process multiple chapters
   * @param chapters The chapters to process
   * @returns The processed chapters with converted content
   */
  static processChapters(chapters: Chapter[]): Chapter[] {
    if (!chapters || !Array.isArray(chapters)) {
      return chapters;
    }

    return chapters.map(chapter => this.processChapter(chapter));
  }

  private static convertTabs(text: string): string {
    const tabWidth = 4;
    return text.replace(/([^\n]*)\t/g, (_, prefix) => {
      const spaces = tabWidth - (prefix.length % tabWidth);
      return prefix + ' '.repeat(spaces);
    });
  }

  private static processHeaders(text: string): string {
    // ATX headers (# ## ###)
    text = text.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, content) => {
      const level = Math.min(hashes.length, 3); // WoW only supports h1-h3
      const tag = `h${level}`;
      return `${this.CONFIG[tag]}${content.trim()}${this.CONFIG[`/${tag}`]}`;
    });

    // Setext headers (underlined with = or -)
    text = text.replace(/^(.+)\n=+$/gm, (_, content) => {
      return `${this.CONFIG.h1}${content.trim()}${this.CONFIG['/h1']}`;
    });

    text = text.replace(/^(.+)\n-+$/gm, (_, content) => {
      return `${this.CONFIG.h2}${content.trim()}${this.CONFIG['/h2']}`;
    });

    return text;
  }

  private static processCodeBlocks(text: string): string {
    // Fenced code blocks (```) - process first to avoid interference
    text = text.replace(/^```[\s\S]*?^```$/gm, (match) => {
      const lines = match.split('\n');
      // Remove the opening ``` line (and optional language identifier)
      lines.shift();
      // Remove the closing ``` line
      lines.pop();
      const code = lines.join('\n');
      // Convert double spaces to em space for better formatting
      const processedCode = code.replace(/  /g, this.CONFIG.ensp);
      return `${this.CONFIG.pre}${processedCode}${this.CONFIG['/pre']}`;
    });

    // Indented code blocks (4 spaces) - only if not already processed
    text = text.replace(/^(    .+)(\n    .+)*/gm, (match) => {
      // Skip if this appears to be inside a fenced code block
      if (match.includes(this.CONFIG.pre)) {
        return match;
      }
      const code = match.replace(/^    /gm, '').replace(/  /g, this.CONFIG.ensp);
      return `${this.CONFIG.pre}${code}${this.CONFIG['/pre']}`;
    });

    return text;
  }

  private static processInlineCode(text: string): string {
    return text.replace(/`([^`]+)`/g, `${this.CONFIG.code}$1${this.CONFIG['/code']}`);
  }

  private static processBlockquotes(text: string): string {
    return text.replace(/^>\s*(.+)$/gm, (_, content) => {
      return `${this.CONFIG.blockquote}${content}${this.CONFIG['/blockquote']}`;
    });
  }

  private static processLists(text: string): string {
    // Handle list terminators (^) first
    text = text.replace(/^\^\s*$/gm, '<!-- LIST_BREAK -->');
    
    // Process lists in blocks to handle consecutive lists properly
    const lines = text.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for list terminator
      if (line.trim() === '<!-- LIST_BREAK -->') {
        if (inList) {
          processedLines.push(''); // Add separator
          inList = false;
        }
        continue;
      }
      
      // Unordered lists
      if (/^[\s]*[-*+]\s+(.+)$/.test(line)) {
        const match = line.match(/^[\s]*[-*+]\s+(.+)$/);
        if (match) {
          processedLines.push(`${this.CONFIG.li}${this.CONFIG.list_marker}${this.CONFIG.ensp}${match[1]}${this.CONFIG['/li']}`);
          inList = true;
          continue;
        }
      }
      
      // Ordered lists (numbers)
      if (/^[\s]*(\d+)[.\)]\s+(.+)$/.test(line)) {
        const match = line.match(/^[\s]*(\d+)[.\)]\s+(.+)$/);
        if (match) {
          processedLines.push(`${this.CONFIG.li}${match[1]}.${this.CONFIG.ensp}${match[2]}${this.CONFIG['/li']}`);
          inList = true;
          continue;
        }
      }
      
      // Roman numeral lists (LibMarkdown extension)
      if (/^[\s]*([ivxlcdmIVXLCDM]+)[.\]]\s+(.+)$/.test(line)) {
        const match = line.match(/^[\s]*([ivxlcdmIVXLCDM]+)[.\]]\s+(.+)$/);
        if (match) {
          processedLines.push(`${this.CONFIG.li}${match[1]}.${this.CONFIG.ensp}${match[2]}${this.CONFIG['/li']}`);
          inList = true;
          continue;
        }
      }
      
      // Letter lists (LibMarkdown extension)
      if (/^[\s]*([a-zA-Z])[.\)]\s+(.+)$/.test(line)) {
        const match = line.match(/^[\s]*([a-zA-Z])[.\)]\s+(.+)$/);
        if (match) {
          processedLines.push(`${this.CONFIG.li}${match[1]}.${this.CONFIG.ensp}${match[2]}${this.CONFIG['/li']}`);
          inList = true;
          continue;
        }
      }
      
      // Not a list item - end current list if we were in one
      if (inList && line.trim() !== '') {
        inList = false;
      }
      
      processedLines.push(line);
    }
    
    return processedLines.join('\n');
  }

  private static processParagraphs(text: string): string {
    // Split into paragraphs (double newlines)
    const paragraphs = text.split(/\n\s*\n/);
    
    return paragraphs
      .map(paragraph => {
        paragraph = paragraph.trim();
        if (paragraph === '') return '';
        
        // Don't wrap already processed HTML elements
        if (paragraph.includes('<h') || 
            paragraph.includes('<pre>') || 
            paragraph.includes('<hr ') || 
            paragraph.includes(this.CONFIG.blockquote) ||
            paragraph.includes(this.CONFIG.li) ||
            paragraph.includes('<!-- LIST_BREAK -->')) {
          return paragraph;
        }
        
        return `${this.CONFIG.p}${paragraph}${this.CONFIG['/p']}`;
      })
      .filter(p => p !== '')
      .join('\n');
  }

  private static processImages(text: string): string {
    // Extended image syntax with optional caption, dimensions, and alignment
    // ![Alt Text](path "caption" WxH alignment)
    return text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?(?:\s+(\d+[x/:,\s]\d+))?(?:\s+(left|right|center))?\)/g, 
      (_, alt, src, caption, dimensions, alignment) => {
        let result = `<img src="${src}"`;
        
        if (dimensions) {
          const [width, height] = dimensions.split(/[x/:,\s]/).map((d: string) => d.trim());
          result += ` width="${width}" height="${height}"`;
        }
        
        if (alignment) {
          result += ` align="${alignment}"`;
        }
        
        result += ` alt="${alt}" />`;
        
        if (caption) {
          result += `${this.CONFIG.figcaption}${caption}${this.CONFIG['/figcaption']}`;
        }
        
        return result;
      });
  }

  private static processLinks(text: string): string {
    // Standard links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Reference links [text][ref] - simplified handling
    text = text.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, '<a href="$2">$1</a>');
    
    return text;
  }

  private static processEmphasis(text: string): string {
    // Bold (**text** or __text__)
    text = text.replace(/\*\*([^*]+)\*\*/g, `${this.CONFIG.strong}$1${this.CONFIG['/strong']}`);
    text = text.replace(/__([^_]+)__/g, `${this.CONFIG.strong}$1${this.CONFIG['/strong']}`);
    
    // Italic (*text* or _text_)
    text = text.replace(/\*([^*]+)\*/g, `${this.CONFIG.em}$1${this.CONFIG['/em']}`);
    text = text.replace(/_([^_]+)_/g, `${this.CONFIG.em}$1${this.CONFIG['/em']}`);
    
    return text;
  }

  private static processLineBreaks(text: string): string {
    // Two spaces at end of line = line break
    return text.replace(/  +\n/g, ` ${this.CONFIG.br}\n`);
  }

  private static processEntities(text: string): string {
    const entities = ['emsp', 'ensp', 'em13', 'em14', 'nbsp', 'thinsp'];
    
    entities.forEach(entity => {
      const regex = new RegExp(`&${entity};`, 'g');
      text = text.replace(regex, this.CONFIG[entity]);
    });
    
    return text;
  }

  private static processRaidTargetingIcons(text: string): string {
    // Process raid targeting icons and their aliases
    Object.entries(this.RT_ALIASES).forEach(([rt, aliases]) => {
      // Main icon name
      text = text.replace(new RegExp(`\\{${rt}\\}`, 'gi'), this.CONFIG[rt] || '');
      
      // Aliases
      aliases.forEach(alias => {
        text = text.replace(new RegExp(`\\{${alias}\\}`, 'gi'), this.CONFIG[rt] || '');
      });
    });
    
    return text;
  }

  /**
   * Shows the current configuration settings
   * Similar to LibMarkdown's ShowConfig function
   * @returns A string representation of the current configuration
   */
  static showConfig(): string {
    const configEntries = Object.entries(this.CONFIG).map(([key, value]) => 
      `${key}: "${value}"`
    ).join('\n');
    
    const rtAliases = Object.entries(this.RT_ALIASES).map(([rt, aliases]) =>
      `${rt}: [${aliases.join(', ')}]`
    ).join('\n');
    
    return `MarkdownConverter Configuration:
    
HTML/WoW Tags:
${configEntries}

Raid Targeting Icon Aliases:
${rtAliases}`;
  }

  /**
   * Updates configuration settings
   * @param config Partial configuration to update
   */
  static updateConfig(config: { [key: string]: string }): void {
    Object.assign(this.CONFIG, config);
  }

  /**
   * Validates and sanitizes markdown input
   * @param markdown The markdown text to validate
   * @returns Validated and sanitized markdown
   */
  static validateMarkdown(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    // Remove any potentially dangerous HTML if present
    let sanitized = markdown.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    return sanitized;
  }

  /**
   * Safely converts markdown to HTML with error handling
   * @param markdown The markdown text to convert
   * @returns HTML suitable for WoW's SimpleHTML frames, or original text on error
   */
  static safeToHtml(markdown: string): string {
    try {
      const validatedMarkdown = this.validateMarkdown(markdown);
      return this.toHtml(validatedMarkdown);
    } catch (error) {
      console.warn('MarkdownConverter: Error converting markdown, returning original text:', error);
      return markdown;
    }
  }

  /**
   * Process content based on its type (markdown, HTML, or plain text)
   * @param locale The locale to process
   * @returns The processed locale with appropriate formatting
   */
  static processContentByType(locale: Locale): Locale {
    if (!locale || !locale.enUS) {
      return locale;
    }

    const processedLocale = { ...locale };

    // If already marked as HTML and contains HTML tags, leave as-is
    if (processedLocale.ishtml && this.isHtml(processedLocale.enUS)) {
      return processedLocale;
    }

    // If contains markdown patterns, convert to HTML
    if (this.isMarkdown(processedLocale)) {
      processedLocale.enUS = this.toHtml(processedLocale.enUS);
      processedLocale.ishtml = true;
      return processedLocale;
    }

    // If contains HTML tags but not marked as HTML, mark it
    if (this.isHtml(processedLocale.enUS)) {
      processedLocale.ishtml = true;
      return processedLocale;
    }

    // Plain text - leave as-is
    return processedLocale;
  }
}
