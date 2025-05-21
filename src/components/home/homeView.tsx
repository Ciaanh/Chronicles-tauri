import "../../_style/homeview.scss";

import { Breadcrumb, Tabs, TabsProps } from "antd";

import { Filters } from "../filters";
import EventList from "../_event/eventList";
import FactionList from "../_faction/factionList";
import CharacterList from "../_character/characterList";
import CollectionList from "../_collection/collectionList";
import LocaleList from "../_locale/localeList";
import ExportTab from "../ExportTab";

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
            children: <ExportTab />,
        },
    ];

    const defaultTabName = "events";

    return (
        <div className="content">
            <Breadcrumb
                className="breadCrumb"
                items={[
                    { title: "Home" },
                    { title: currentTab ? currentTab.label : "" },
                ]}
            />

            <Tabs
                className="tabs"
                defaultActiveKey={defaultTabName}
                tabPosition="left"
                items={tabItems}
            />
        </div>
    );
};

export default HomeView;
