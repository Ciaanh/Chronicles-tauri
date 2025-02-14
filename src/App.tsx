import "./App.css";

import { Button, Navbar, Alignment } from "@blueprintjs/core";

import { Route, Routes, useNavigate } from "react-router-dom";
import HomeView from "./components/home/homeView";
import SettingsView from "./components/settings/settingsView";
import { Path } from "./constants";
import { useContext, useEffect, useState } from "react";

import { dbcontext, tableNames } from "./database/dbcontext";
import { Collection, DB_Collection } from "./database/models";
import ErrorBoundary from "./components/ErrorBoundary";
import { Filters } from "./components/filters";
import CollectionSelect from "./components/_collection/collectionSelect";

function App() {
    const navigate = useNavigate();

    const [filters, setFilters] = useState<Filters>({
        collection: null,
    });

    const [collections, setCollections] = useState<Collection[]>([]);
    const contextValue = useContext(dbcontext);

    useEffect(() => {
        async function fetchCollections() {
            const collections = await contextValue.getAll(
                tableNames.collections
            );
            const mappedCollections =
                await contextValue.mappers.collections.mapFromDbArray(
                    collections as DB_Collection[]
                );
            setCollections(mappedCollections);
        }
        fetchCollections();
    }, [contextValue]);

    function selectedCollection(item: Collection) {
        setFilters({ ...filters, collection: item });
    }

    function resetCollectionFilter() {
        setFilters({ ...filters, collection: null });
    }

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
                <Navbar.Group align={Alignment.CENTER}>
                    <CollectionSelect
                        selectedValue={filters.collection}
                        collections={collections}
                        onCollectionSelect={selectedCollection}
                        onCollectionReset={resetCollectionFilter}
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
                    <Route
                        path={Path.Home}
                        element={<HomeView filters={filters} />}
                    />
                    <Route path={Path.Settings} element={<SettingsView />} />
                </Routes>
            </ErrorBoundary>
        </main>
    );
}

export default App;
