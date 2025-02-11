import { Database } from "neutron-db";
import { DB_Chapter } from "../database/models/DB_Chapter";
import { Chapter } from "../slices/models/Chapter";
import { tableNames } from "../database/dbcontext";
import { Locale } from "../slices/models/Locale";

export const ChapterMapper = (chapter: Chapter): DB_Chapter => {
    return {
        id: chapter._id,
        headerId: chapter.header?._id,
        pageIds: chapter.pages.map((locale) => locale._id),
    };
};

export function ChapterMapperFromDB(
    chapter: DB_Chapter,
    db: Database
): Chapter {
    return {
        _id: chapter.id,
        header: chapter.headerId
            ? db.get(chapter.headerId, tableNames.locales)
            : null,
        pages: db
            .getAll(tableNames.locales)
            .filter((locale) => chapter.pageIds.includes(locale.id)),
    };
}

export function ChapterMapperFromDBs(chapters: DB_Chapter[]): Chapter[] {
    return chapters.map((chapter) => ChapterMapperFromDB(chapter));
}
