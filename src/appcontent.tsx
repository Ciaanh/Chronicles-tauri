import "./_style/appcontent.scss";

import { MenuItems } from "./constants";
import {
    Breadcrumb,
    Button,
    Divider,
    Flex,
    Layout,
    Menu,
    MenuProps,
    Space,
    theme,
    Typography,
} from "antd";

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

function AppContent() {
    const {
        token: { colorBgContainer, borderRadiusLG },
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
                    theme="light"
                    mode="horizontal"
                    onClick={onClick}
                    selectedKeys={[currentMenuItem]}
                    items={MenuItems}
                />
                <Divider type="vertical" />
                <CollectionSelect
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
                Chronicles DB ©{new Date().getFullYear()} Created by Ciaanh
            </Footer>
        </Layout>
    );
}

export default AppContent;
