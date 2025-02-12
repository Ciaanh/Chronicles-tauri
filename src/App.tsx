import "./App.css";

import { Button, Navbar, Alignment, Card, H5 } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { Route, Routes, useNavigate } from "react-router-dom";
import HomeView from "./components/home/homeView";
import SettingsView from "./components/settings/settingsView";
import { Path } from "./constants";
import { useContext, useEffect, useState } from "react";

import { dbcontext, tableNames } from "./database/dbcontext";
import { DB_Event, Event } from "./database/models";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
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

    const navigate = useNavigate();

    return (
        <main>
            <Navbar>
                <Navbar.Group align={Alignment.LEFT}>
                    <Navbar.Heading>Chronicles data</Navbar.Heading>
                    <Navbar.Divider />

                    <Button
                        className="bp5-minimal"
                        icon="home"
                        text="Home"
                        onClick={() => {
                            navigate(Path.Home, { state: { fromHome: true } });
                        }}
                    />
                </Navbar.Group>
                <Navbar.Group align={Alignment.RIGHT}>
                    <Button
                        className="bp5-minimal"
                        icon="document"
                        text="Export"
                    />
                    <Button
                        className="bp5-minimal"
                        text="Settings toto"
                        onClick={() => {
                            navigate(Path.Settings, {
                                state: { fromHome: true },
                            });
                        }}
                    />
                </Navbar.Group>
            </Navbar>

            <Routes>
                <Route path={Path.Home} element={<HomeView />} />
                <Route path={Path.Settings} element={<SettingsView />} />
            </Routes>

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

            <ErrorBoundary>
                <Card>
                    <H5>Database info</H5>
                    {events.map((event, index) => {
                        return (
                            <div key={event._id}>
                                <h2>name: {event.name}</h2>
                                <hr />
                            </div>
                        );
                    })}
                </Card>
            </ErrorBoundary>
        </main>
    );
}

export default App;
