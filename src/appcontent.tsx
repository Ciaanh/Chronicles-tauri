import "./_style/appcontent.scss";
import { useContext, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Button, Divider, Layout, Menu, MenuProps, theme } from "antd";

const { Header, Content, Footer } = Layout;

import { MenuItems, Path } from "./constants";

import HomeView from "./components/home/HomeView";
import SettingsView from "./components/settings/settingsView";
import ErrorBoundary from "./components/ErrorBoundary";
import { Filters } from "./components/filters";
import CollectionSelect from "./components/_collection/CollectionSelect";

import { Collection } from "./database/models";
import { dbRepository } from "./database/dbcontext";
import { useTheme } from "./useTheme";

function AppContent() {
    const dbContext = useContext(dbRepository);
    const {
        token: { colorBgContainer },
    } = theme.useToken();
    const { darkMode, toggleDarkMode } = useTheme();

    const [filters, setFilters] = useState<Filters>({
        collection: null,
    });

    const [currentMenuItem, setCurrentMenuItem] = useState("home");
    const onClick: MenuProps["onClick"] = (e) => {
        setCurrentMenuItem(e.key);
    };

    function selectedCollection(item: Collection) {
        setFilters({ ...filters, collection: item });
    }

    function resetCollectionFilter() {
        setFilters({ ...filters, collection: null });
    }

    return (
        <Layout className="view">
            <Header className="header" style={{ background: colorBgContainer }}>
                <Menu
                    mode="horizontal"
                    onClick={onClick}
                    selectedKeys={[currentMenuItem]}
                    items={MenuItems}
                    style={{ flex: 1, minWidth: 0 }}
                />

                <Divider type="vertical" />

                <Button
                    onClick={toggleDarkMode}
                    title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                    aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {darkMode ? "☀ Light" : "☾ Dark"}
                </Button>

                <Divider type="vertical" />

                <Button onClick={() => dbContext.saveAs()}>Save As…</Button>

                <Divider type="vertical" />

                <CollectionSelect
                    className="collection-select"
                    onCollectionSelect={selectedCollection}
                    onCollectionReset={resetCollectionFilter}
                />
            </Header>

            <Content className="container">
                <ErrorBoundary>
                    <Routes>
                        <Route path={Path.Home} element={<HomeView filters={filters} />} />
                        <Route path={Path.Settings} element={<SettingsView />} />
                        <Route path="*" element={<Navigate to={Path.Home} replace />} />
                    </Routes>
                </ErrorBoundary>
            </Content>

            <Footer className="footer">©{new Date().getFullYear()} by Ciaanh</Footer>
        </Layout>
    );
}

export default AppContent;
