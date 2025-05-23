import { Locale } from '../database/models';
import { dbRepository, tableNames } from '../database/dbcontext';

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
        dbContext: React.Context<any>['_currentValue']
    ): Promise<Locale> {
        // Case 1: Locale is completely new or has no ID
        if (!locale.id || locale.id === -1) {
            const newLocale = {
                id: -1,
                ishtml: locale.ishtml !== undefined ? locale.ishtml : false,
                enUS: locale.enUS,
                translations: locale.translations || {},
            };
            return await dbContext.add(newLocale, tableNames.locales);
        }
        // Case 2: Locale exists and has a valid ID
        else if (locale.id > 0) {
            await dbContext.update(locale, tableNames.locales);
            return locale;
        }
        
        // Fallback - should not happen
        throw new Error(`Invalid locale ID: ${locale.id}`);
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
        dbContext: React.Context<any>['_currentValue']
    ): Promise<any> {
        // Clone the chapter to avoid modifying the original
        const updatedChapter = { ...chapter };
        
        // Process header
        if (updatedChapter.header) {
            updatedChapter.header = await this.createOrUpdateLocale(
                updatedChapter.header,
                dbContext
            );
        }
        
        // Process pages
        if (Array.isArray(updatedChapter.pages)) {
            for (let i = 0; i < updatedChapter.pages.length; i++) {
                if (updatedChapter.pages[i]) {
                    updatedChapter.pages[i] = await this.createOrUpdateLocale(
                        updatedChapter.pages[i],
                        dbContext
                    );
                }
            }
        }
        
        return updatedChapter;
    }
}
