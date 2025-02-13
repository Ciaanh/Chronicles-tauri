import "./App.css";
import "@blueprintjs/core/lib/css/blueprint.css";

import { Button, Navbar, Alignment, Card, H5, MenuItem } from "@blueprintjs/core";
import {
    ItemPredicate,
    ItemRenderer,
    ItemRendererProps,
    Select,
} from "@blueprintjs/select";

import { Route, Routes, useNavigate } from "react-router-dom";
import HomeView from "./components/home/homeView";
import SettingsView from "./components/settings/settingsView";
import { Path } from "./constants";
import { useContext, useEffect, useState } from "react";

import { dbcontext, tableNames } from "./database/dbcontext";
import { Collection, DB_Collection, DB_Event, Event } from "./database/models";
import ErrorBoundary from "./components/ErrorBoundary";
import { Filters } from "./components/filters";

function App() {
    const navigate = useNavigate();

    const [filters, setFilters] = useState<Filters>({
        collection: undefined,
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

    // demo select with predicate : https://blueprintjs.com/docs/#select/select-component.usage
    const renderFilm: ItemRenderer<Collection> = (collection, { handleClick, handleFocus, modifiers }) => {
        return (
            <MenuItem
                active={modifiers.active}
                disabled={modifiers.disabled}
                key={collection._id}
                label={collection.name}
                onClick={handleClick}
                onFocus={handleFocus}
                roleStructure="listoption"
                text={`${film.rank}. ${film.title}`}
            />
        );
    };

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
                    <Select<Collection>
                        items={collections}
                        itemRenderer={renderFilm}
                        noResults={
                            <MenuItem
                                disabled={true}
                                text="No results."
                                roleStructure="listoption"
                            />
                        }
                        onItemSelect={selectedCollection}
                    >
                        <Button
                            text={filters?.collection?.name ?? "Select a collection"}
                            rightIcon="caret-down"
                        />
                    </Select>
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
