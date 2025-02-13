import { useState, useContext, useEffect } from "react";
import { dbcontext, tableNames } from "../../database/dbcontext";
import { DB_Event, Event } from "../../database/models";
import EventItem from "./eventItem";
import { Button, Card, H5 } from "@blueprintjs/core";

function EventList() {
    const [events, setEvents] = useState<Event[]>([]);
    const contextValue = useContext(dbcontext);

    useEffect(() => {
        async function fetchEvents() {
            const events = await contextValue.getAll(tableNames.events);
            const mappedEvents =
                await contextValue.mappers.events.mapFromDbArray(
                    events as DB_Event[]
                );
            setEvents(mappedEvents);
        }
        fetchEvents();
    }, [contextValue]);

    const reloadEvents = async () => {
        const events = await contextValue.getAll(tableNames.events);
        const mappedEvents = await contextValue.mappers.events.mapFromDbArray(
            events as DB_Event[]
        );
        setEvents(mappedEvents);
    };

    const cleanEvents = async () => {
        setEvents([]);
    };
    return (
        <div>
            <h1>Event List</h1>
            <Button
                className="bp5-minimal"
                onClick={cleanEvents}
                text="Clean events"
            />
            <Button
                className="bp5-minimal"
                onClick={reloadEvents}
                text="Reload events"
            />

            <Card>
                <H5>Database info</H5>
                {events.map((event, index) => {
                    return (
                        <div key={event._id}>
                            <EventItem event={event} />
                        </div>
                    );
                })}
            </Card>
        </div>
    );
}

export default EventList;
