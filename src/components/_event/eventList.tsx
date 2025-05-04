import { useState, useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Event, Event } from "../../database/models";
import { Button, Card, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import { Constants } from "../../constants";

import { DeleteOutlined, PlusCircleOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

interface EventListProps {
    filters: Filters;
}

const EventList: React.FC<EventListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);
    const dbContext = useContext(dbRepository);

    async function fetchEvents() {
        setLoading(true);

        const eventList = await dbContext.getAll(tableNames.events);

        const filteredEvents = eventList.filter((e) => {
            if (filters?.collection === null) return true;
            const event = e as DB_Event;
            return filters?.collection?._id === event.collectionId;
        });

        const mappedEvents = await dbContext.mappers.events.mapFromDbArray(
            filteredEvents as DB_Event[]
        );

        setEvents(sortedEvents(mappedEvents));
        setLoading(false);
    }

    useEffect(() => {
        fetchEvents();
    }, [filters.collection]);

    const reloadEvents = async () => {
        fetchEvents();
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
            return "Mythos";
        }

        if (period.yearStart === Constants.maxYear) {
            return "Future";
        }

        if (period.yearStart === period.yearEnd) {
            return `${period.yearStart}`;
        }

        return `${yearStart}${
            yearStart !== "" && yearEnd !== "" ? " / " : ""
        }${yearEnd}`;
    }

    const columns: TableProps<Event>["columns"] = [
        {
            title: "",
            dataIndex: "period",
            width: 20,
            render: (period) => formatPeriod(period),
        },
        {
            title: "Name",
            dataIndex: "name",
            width: 100,
            render: (name) => `${name}`,
        },
        {
            title: "",
            dataIndex: '',
            key: "action",
            fixed: 'right',
            width: 10,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteEvent(record._id)}
                    />
                </Space>
            ),
        },
    ];

    const selectedCollection = filters?.collection?.name
        ? `Displaying events for the collection : ${filters?.collection?.name}`
        : "";

    function sortedEvents(eventList: Event[]) {
        return eventList
            .sort((a, b) => {
                if (a.period === null || b.period === null) return 0;
                if (a.period.yearStart === null || b.period.yearStart === null)
                    return 0;

                if (a.period.yearStart === b.period.yearStart) {
                    if (a.order === b.order) return 0;
                    if (a.order > b.order) return 1;
                    if (a.order < b.order) return -1;
                }

                if (a.period.yearStart > b.period.yearStart) return 1;
                if (a.period.yearStart < b.period.yearStart) return -1;

                return 0;
            })
            .reverse();
    }

    async function deleteEvent(eventid: number) {
        console.log("Deleting event", eventid);
        // await dbContext
        //     .remove(eventid, tableNames.events)
        //     .then(() => fetchEvents());
    }

    async function addEvent() {
        //dbContext.remove(eventid, tableNames.events).then(() => fetchEvents());
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
                <Text strong>{selectedCollection}</Text>
            </Space>

            <Space>
                <Button className="bp5-minimal" onClick={cleanEvents}>
                    Clean events
                </Button>

                <Button
                    className="bp5-minimal"
                    onClick={reloadEvents}
                    loading={loading}
                >
                    Load events from DB
                </Button>

                <Button icon={<PlusCircleOutlined />} onClick={addEvent} />
            </Space>

            <Table<Event>
                rowKey="_id"
                columns={columns}
                dataSource={events}
                pagination={false}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
                }}
            />
        </Space>
    );
};

export default EventList;
