import "../../_style/homeview.scss";

import { useState } from "react";
import { Breadcrumb, Tabs, TabsProps } from "antd";

import { Filters } from "../filters";
import EventList from "../_event/EventList";
import FactionList from "../_faction/FactionList";
import CharacterList from "../_character/CharacterList";
import CollectionList from "../_collection/CollectionList";
import LocaleList from "../_locale/LocaleList";
import ExportTab from "../ExportTab";
import StatsTab from "../stats/StatsTab";
import TimelineTab from "../timeline/TimelineTab";
import HistoryTab from "../history/HistoryTab";

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
        {
            label: "Export",
            key: "export",
            children: <ExportTab filters={filters} />,
        },
        {
            label: "Stats",
            key: "stats",
            children: <StatsTab filters={filters} />,
        },
        {
            label: "Timeline",
            key: "timeline",
            children: <TimelineTab filters={filters} />,
        },
        {
            label: "History",
            key: "history",
            children: <HistoryTab />,
        },
    ];

    const defaultTabName = "events";
    const defaultTabIndex = tabItems.findIndex((item) => item.key === defaultTabName);
    const [currentTab, setCurrentTab] = useState(tabItems[defaultTabIndex]);

    const onTabChange = (key: string) => {
        const selectedTab = tabItems.filter((item) => item.key === key);

        if (selectedTab && selectedTab.length > 0) {
            setCurrentTab(selectedTab[0]);
        }
    };

    return (
        <div className="content">
            <Breadcrumb
                className="breadCrumb"
                items={[{ title: "Home" }, { title: currentTab ? currentTab.label : "" }]}
            />

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
