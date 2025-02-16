import { useState, useContext, useEffect } from "react";
import { dbcontext, tableNames } from "../../database/dbcontext";
import { DB_Event, Event } from "../../database/models";
import { Button, Card, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import { Constants } from "../../constants";

const { Text, Title } = Typography;

interface EventListProps {
    filters: Filters;
}

const EventList: React.FC<EventListProps> = ({ filters }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const contextValue = useContext(dbcontext);

    useEffect(() => {
        async function fetchEvents() {
            const events = await contextValue.getAll(tableNames.events);

            const filteredEvents = events.filter((e) => {
                if (filters?.collection === null) return true;
                const event = e as DB_Event;
                return filters?.collection?._id === event.collectionId;
            });

            const mappedEvents =
                await contextValue.mappers.events.mapFromDbArray(
                    filteredEvents as DB_Event[]
                );
            setEvents(mappedEvents);
        }
        fetchEvents();
    }, [filters.collection]);

    const reloadEvents = async () => {
        const events = await contextValue.getAll(tableNames.events);
        const mappedEvents = await contextValue.mappers.events.mapFromDbArray(
            events as DB_Event[]
        );
        setEvents(mappedEvents);
    };

    const cleanEvents = async () => {
        setEvents([]);
    };

    function formatPeriod(period: {
        yearStart: number;
        yearEnd: number;
    }): string {
        if (period === null) {
            return "";
        }

        if (period.yearStart === null) {
            return `${period.yearEnd}`;
        }

        if (period.yearEnd === null) {
            return `${period.yearStart}`;
        }

        if (period.yearStart === period.yearEnd) {
            return `${period.yearStart}`;
        }

        let yearStart = "";
        if (
            period.yearStart !== Constants.minYear &&
            period.yearStart !== Constants.maxYear
        ) {
            yearStart = `${period.yearStart}`;
        }

        let yearEnd = "";
        if (
            period.yearEnd !== Constants.maxYear &&
            period.yearEnd !== Constants.minYear
        ) {
            yearEnd = `${period.yearEnd}`;
        }

        if (period.yearEnd === Constants.minYear) {
            yearEnd = "Mythos";
        }

        if (period.yearStart === Constants.maxYear) {
            yearStart = "Future";
        }

        return `${yearStart}${
            yearStart !== "" && yearEnd !== "" ? " / " : ""
        }${yearEnd}`;
    }

    const columns: TableProps<Event>["columns"] = [
        {
            title: "",
            dataIndex: "period",
            render: (period) => formatPeriod(period),
        },
        {
            title: "Name",
            dataIndex: "name",
            render: (name) => `${name}`,
        },
    ];

    const selectedCollection = filters?.collection?.name ? `Displaying events for the collection : ${filters?.collection?.name}` : "";

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Text strong>{selectedCollection}</Text>
            <Button className="bp5-minimal" onClick={cleanEvents}>
                Clean events
            </Button>
            <Button className="bp5-minimal" onClick={reloadEvents}>
                Reload events
            </Button>

            <Table<Event>
                rowKey="_id"
                columns={columns}
                dataSource={events}
                pagination={false}
                loading={events.length === 0}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
                }}
            />
        </Space>
    );
};

export default EventList;
