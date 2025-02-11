import { Database } from "neutron-db";
import { DB_Event } from "../database/models/DB_Event";
import { Event } from "../slices/models/Event";
import { tableNames } from "../database/dbcontext";

export const EventMapper = (event: Event): DB_Event => {
    return {
        id: event._id,
        name: event.name,
        yearStart: event.yearStart ?? 0,
        yearEnd: event.yearEnd ?? 0,
        eventType: event.eventType,
        timeline: event.timeline,
        link: event.link,
        factionIds: event.factions.map((faction) => faction._id),
        characterIds: event.characters.map((character) => character._id),
        labelId: event.label._id,
        descriptionIds: event.description.map((locale) => locale._id),
        chapterIds: event.chapters.map((chapter) => chapter._id),
        dbnameId: event.dbname._id,
        order: event.order,
    };
};

export const EventMapperFromDB = (event: DB_Event, db: Database): Event => {
    const id = event.id;
    const name = event.name;
    const yearStart = event.yearStart;
    const yearEnd = event.yearEnd;
    const eventType = event.eventType;
    const timeline = event.timeline;
    const link = event.link;
    const factions = db
        .getAll(tableNames.factions)
        .filter((faction) => event.factionIds.includes(faction.id));
    const characters = db
        .getAll(tableNames.characters)
        .filter((character) => event.characterIds.includes(character.id));
    const label = db.get(event.labelId, tableNames.locales);
    const description = db
        .getAll(tableNames.locales)
        .filter((locale) => event.descriptionIds.includes(locale.id));
    const chapters = db
        .getAll(tableNames.chapters)
        .filter((chapter) => event.chapterIds.includes(chapter.id));
    const dbname = db.get(event.dbnameId, tableNames.locales);
    const order = event.order;

    return {
        _id: id,
        name: name,
        yearStart: yearStart,
        yearEnd: yearEnd,
        eventType: eventType,
        timeline: timeline,
        link: link,
        factions: factions,
        characters: characters,
        label: label,
        description: description,
        chapters: chapters,
        dbname: dbname,
        order: order,
    };
};

export const EventMapperFromDBs = (
    events: DB_Event[],
    db: Database
): Event[] => {
    return events
        .map((event) => EventMapperFromDB(event, db))
        .filter((event) => event !== null) as Event[];
};
