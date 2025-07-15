import { Locale } from "../database/models";
import { tableNames } from "../database/dbcontext";
import { MarkdownConverter } from "./markdownConverter";

/**
 * Utility for handling locale operations across the application
 * Centralizes the creation and update of locale records
 */
export class LocaleUtils {
  /**
   * Creates or updates a locale record
   *
   * @param locale The locale object to create or update
   * @param dbContext The database context
   * @returns The created or updated locale
   */
  static async createOrUpdateLocale(
    locale: Locale,
    dbContext: any,
  ): Promise<Locale> {
    // Process markdown content before saving
    const processedLocale = MarkdownConverter.processLocale(locale);

    // Case 1: Locale is completely new or has no ID
    if (!processedLocale.id || processedLocale.id === -1) {
      const newLocale = {
        id: -1,
        ishtml: processedLocale.ishtml !== undefined ? processedLocale.ishtml : false,
        enUS: processedLocale.enUS,
        translations: processedLocale.translations || {},
      };
      return await dbContext.add(newLocale, tableNames.locales);
    }
    // Case 2: Locale exists and has a valid ID
    else if (processedLocale.id > 0) {
      await dbContext.update(processedLocale, tableNames.locales);
      return processedLocale;
    }

    // Fallback - should not happen
    throw new Error(`Invalid locale ID: ${processedLocale.id}`);
  }

  /**
   * Creates or updates locales for a chapter (header and pages)
   *
   * @param chapter The chapter with header and pages to process
   * @param dbContext The database context
   * @returns The chapter with updated locales
   */
  static async processChapterLocales(
    chapter: any,
    dbContext: any,
  ): Promise<any> {
    // Clone the chapter to avoid modifying the original
    const updatedChapter = { ...chapter };

    // Process header
    if (updatedChapter.header) {
      updatedChapter.header = await this.createOrUpdateLocale(
        updatedChapter.header,
        dbContext,
      );
    }

    // Process pages
    if (Array.isArray(updatedChapter.pages)) {
      for (let i = 0; i < updatedChapter.pages.length; i++) {
        if (updatedChapter.pages[i]) {
          updatedChapter.pages[i] = await this.createOrUpdateLocale(
            updatedChapter.pages[i],
            dbContext,
          );
        }
      }
    }

    return updatedChapter;
  }
}
