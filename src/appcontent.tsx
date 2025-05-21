import "./_style/appcontent.scss";
import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Divider, Flex, Layout, Menu, MenuProps, Space, theme } from "antd";

const { Header, Content, Footer } = Layout;

import { MenuItems, Path } from "./constants";

import HomeView from "./components/home/HomeView";
import SettingsView from "./components/settings/settingsView";
import ErrorBoundary from "./components/ErrorBoundary";
import { Filters } from "./components/filters";
import CollectionSelect from "./components/_collection/CollectionSelect";

import { Collection } from "./database/models";

function AppContent() {
    const {
        token: { colorBgContainer },
    } = theme.useToken();

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

                <CollectionSelect
                    className="collection-select"
                    onCollectionSelect={selectedCollection}
                    onCollectionReset={resetCollectionFilter}
                />
            </Header>

            <Content className="container">
                <ErrorBoundary>
                    <Routes>
                        <Route
                            path={Path.Home}
                            element={<HomeView filters={filters} />}
                        />
                        <Route
                            path={Path.Settings}
                            element={<SettingsView />}
                        />
                    </Routes>
                </ErrorBoundary>
            </Content>

            <Footer className="footer">
                ©{new Date().getFullYear()} by Ciaanh
            </Footer>
        </Layout>
    );
}

export default AppContent;
