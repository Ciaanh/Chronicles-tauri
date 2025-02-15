import { Button, Layout, Menu, MenuProps, theme } from "antd";

const { Header, Content, Footer } = Layout;

import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import HomeView from "./components/home/homeView";
import SettingsView from "./components/settings/settingsView";
import { Path } from "./constants";
import { useContext, useEffect, useState } from "react";

import { dbcontext, tableNames } from "./database/dbcontext";
import { Collection, DB_Collection } from "./database/models";
import ErrorBoundary from "./components/ErrorBoundary";
import { Filters } from "./components/filters";
import CollectionSelect from "./components/_collection/collectionSelect";
import Link from "antd/es/typography/Link";
import Sider from "antd/es/layout/Sider";

type MenuItem = Required<MenuProps>["items"][number];
const menuItems: MenuItem[] = [
    { key: "home", label: <NavLink to={Path.Home}>Home</NavLink> },
    {
        key: "settings",
        label: <NavLink to={Path.Settings}>Settings</NavLink>,
    },
];

function App() {
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
        <Layout>
            <Layout>
                <Sider width={200} style={{ background: colorBgContainer }}>
                    <div>Chronicles data</div>
                    <Menu
                        theme="light"
                        mode="inline"
                        onClick={onClick}
                        selectedKeys={[currentMenuItem]}
                        items={menuItems}
                    />

                    <CollectionSelect
                        onCollectionSelect={selectedCollection}
                        onCollectionReset={resetCollectionFilter}
                    />
                </Sider>

                <Content style={{ padding: "0 48px" }}>
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
            </Layout>
            <Footer style={{ textAlign: "center" }}>
                Ant Design ©{new Date().getFullYear()} Created by Ant UED
            </Footer>
        </Layout>
    );
}

export default App;
