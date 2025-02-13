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

            <ErrorBoundary>
                <Routes>
                    <Route path={Path.Home} element={<HomeView />} />
                    <Route path={Path.Settings} element={<SettingsView />} />
                </Routes>
            </ErrorBoundary>
        </main>
    );
}

export default App;
