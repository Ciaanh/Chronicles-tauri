import "../../_style/homeview.scss";

import { useState } from "react";
import { Breadcrumb, Tabs, TabsProps } from "antd";

import { Filters } from "../filters";
import EventList from "../_event/eventList";
import FactionList from "../_faction/factionList";
import CharacterList from "../_character/characterList";
import CollectionList from "../_collection/collectionList";
import LocaleList from "../_locale/localeList";

interface HomeViewProps {
    filters: Filters;
}

const HomeView: React.FC<HomeViewProps> = ({ filters }) => {
    const tabItems: TabsProps["items"] = [
        {
            label: "Events",
            key: "events",
            children: <EventList filters={filters} />,
        },
        {
            label: "Characters",
            key: "characters",
            children: <CharacterList filters={filters} />,
        },
        {
            label: "Factions",
            key: "factions",
            children: <FactionList filters={filters} />,
        },
        {
            label: "Locales",
            key: "locales",
            children: <LocaleList filters={filters} />,
        },
        {
            label: "Collections",
            key: "collections",
            children: <CollectionList filters={filters} />,
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
        </div>
    );
};

export default HomeView;
