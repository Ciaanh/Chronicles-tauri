import "../../_style/homeview.scss"

import {
    Breadcrumb,
    Button,
    Card,
    Flex,
    Layout,
    Menu,
    MenuProps,
    Tabs,
    TabsProps,
    theme,
} from "antd";
import EventList from "../_event/eventList";
import { Filters } from "../filters";

// const { Header, Content, Footer, Sider } = Layout;

import {
    AppstoreOutlined,
    MailOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import { useState } from "react";

interface HomeViewProps {
    filters: Filters;
}

// type MenuItem = Required<MenuProps>["items"][number];

const HomeView: React.FC<HomeViewProps> = ({ filters }) => {
    // const {
    //     token: { colorBgContainer, borderRadiusLG },
    // } = theme.useToken();

    const tabItems: TabsProps["items"] = [
        {
            label: "Events",
            key: "events",
            children: <EventList filters={filters} />,
        },
        {
            label: "Characters",
            key: "characters",
            children: "The characters tab content",
        },
        {
            label: "Factions",
            key: "factions",
            children: "The factions tab content",
        },
        {
            label: "Collections",
            key: "collections",
            children: "The collections tab content",
        },
        {
            label: "Locales",
            key: "locales",
            children: "The locales tab content",
        },
    ];
    const defaultTabName = "events";
    const defaultTabIndex = tabItems.findIndex(
        (item) => item.key === defaultTabName
    );
    const [currentTab, setCurrentTab] = useState(tabItems[defaultTabIndex]);

    const onTabChange = (key: string) => {
        const selectedTab = tabItems.filter((item) => item.key === key);

        if (selectedTab && selectedTab.length > 0) {
            setCurrentTab(selectedTab[0]);
        }
    };

    return (
        <div className="content">
            <Breadcrumb className="breadCrumb">
                <Breadcrumb.Item>Home</Breadcrumb.Item>
                <Breadcrumb.Item>
                    {currentTab ? currentTab.label : ""}
                </Breadcrumb.Item>
            </Breadcrumb>

            <Tabs
                className="tabs"
                defaultActiveKey={defaultTabName}
                tabPosition="left"
                items={tabItems}
                onChange={onTabChange}
            />

            {/* <Card>
                        <EventList filters={filters} />
                    </Card> */}
        </div>
    );
};

export default HomeView;
