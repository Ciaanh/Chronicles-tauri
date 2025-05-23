import { useState, useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Event, Event } from "../../database/models";
import { Button, Card, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import { Constants } from "../../constants";
import EventModal from "./EventModal";
import { LocaleUtils } from "../../_utils/localeUtils";

import {
    DeleteOutlined,
    EditOutlined,
    PlusCircleOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

interface EventListProps {
    filters: Filters;
}

const EventList: React.FC<EventListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const dbContext = useContext(dbRepository);

    async function fetchEvents() {
        setLoading(true);

        const eventList = await dbContext.getAll(tableNames.events);

        const filteredEvents = eventList.filter((e) => {
            if (filters?.collection === null) return true;
            const event = e as DB_Event;
            return filters?.collection?.id === event.collectionId;
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
            width: 180,
            render: (name: string) => (
                <Typography.Text
                    ellipsis
                    style={{ maxWidth: 220, display: "block" }}
                >
                    {name}
                </Typography.Text>
            ),
        },
        {
            title: "",
            dataIndex: "",
            key: "action",
            fixed: "right",
            width: 20,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<EditOutlined />}
                        onClick={() => handleEditEvent(record)}
                    />
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteEvent(record.id)}
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
        setLoading(true);
        try {
            await dbContext.remove(eventid, tableNames.events);
            fetchEvents();
        } finally {
            setLoading(false);
        }
    }

    async function addEvent() {
        setEditingEvent(null);
        setIsModalVisible(true);
    }

    function handleEditEvent(event: Event) {
        setEditingEvent(event);
        setIsModalVisible(true);
    }    const handleModalOk = async (values: any) => {
        setModalLoading(true);
        try {
            // Use the centralized LocaleUtils to create or update the label
            const label = await LocaleUtils.createOrUpdateLocale(values.label, dbContext);            let chapters = Array.isArray(values.chapters)
                ? values.chapters
                : [];
                
            // Process chapters with LocaleUtils
            for (let i = 0; i < chapters.length; i++) {
                // Use the processChapterLocales utility to handle all locale updates for this chapter
                chapters[i] = await LocaleUtils.processChapterLocales(chapters[i], dbContext);
            }

            if (editingEvent) {
                // Update existing event, ensure id is preserved and chapters are always included
                const updatedEvent = {
                    ...editingEvent,
                    id: editingEvent.id, // Ensure id is preserved
                    name: values.name,
                    period: {
                        yearStart: values.yearStart,
                        yearEnd: values.yearEnd,
                    },
                    order: values.order,
                    eventType: values.eventType,
                    timeline: values.timeline,
                    link: values.link,
                    label: label,
                    collection: values.collection,
                    factions: values.factions || [],
                    characters: values.characters || [],
                    chapters: chapters, // Always include chapters
                };
                await dbContext.update(
                    dbContext.mappers.events.map(updatedEvent),
                    tableNames.events
                );
            } else {
                // Add new event
                const newEvent: Event = {
                    name: values.name,
                    period: {
                        yearStart: values.yearStart,
                        yearEnd: values.yearEnd,
                    },
                    order: values.order,
                    eventType: values.eventType,
                    timeline: values.timeline,
                    link: values.link,
                    label: label,
                    collection: values.collection,
                    factions: values.factions || [],
                    characters: values.characters || [],
                    chapters: chapters,
                    id: -1,
                };
                await dbContext.add(
                    dbContext.mappers.events.map(newEvent),
                    tableNames.events
                );
            }
            setIsModalVisible(false);
            setEditingEvent(null);
            fetchEvents();
        } finally {
            setModalLoading(false);
        }
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        setEditingEvent(null);
    };

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
                rowKey="id"
                columns={columns}
                dataSource={events}
                pagination={false}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
                }}
            />
            <EventModal
                visible={isModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                confirmLoading={modalLoading}
                eventToEdit={editingEvent ? editingEvent : undefined}
            />
        </Space>
    );
};

export default EventList;
