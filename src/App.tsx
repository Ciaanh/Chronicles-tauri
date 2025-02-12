import "./App.css";

import { Button, Navbar, Alignment, Card, H5 } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { Route, Routes, useNavigate } from "react-router-dom";
import HomeView from "./components/home/homeView";
import SettingsView from "./components/settings/settingsView";
import { Path } from "./constants";
import { useContext } from "react";

import { dbcontext, tableNames } from "./database/dbcontext";
import { DB_Event } from "./database/models";

async function App() {
    // const [greetMsg, setGreetMsg] = useState("");
    // const [name, setName] = useState("");

    // call to rust command
    // async function greet() {
    //     // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    //     setGreetMsg(await invoke("greet", { name }));
    // }

    const contextValue = useContext(dbcontext);

    const navigate = useNavigate();

    const events = await contextValue
        .getAll(tableNames.events)
        .then(async (events) => {
           return await contextValue.mappers.events.mapFromDbArray(events as DB_Event[]);
        });

    debugger;

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
        </main>
    );
}

export default App;
