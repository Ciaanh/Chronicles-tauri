import { useState, useContext, useEffect, useRef } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Event, Event } from "../../database/models";
import { App, Button, Input, Popconfirm, Space, Table, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import { Constants } from "../../constants";
import EventModal from "./EventModal";
import { EventModalFormValues } from "./EventModal";
import { LocaleUtils } from "../../_utils/localeUtils";

import {
    DeleteOutlined,
    EditOutlined,
    PlusCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface EventListProps {
    filters: Filters;
}

const EventList: React.FC<EventListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [search, setSearch] = useState("");
    const dbContext = useContext(dbRepository);
    const { message } = App.useApp();
    const pendingDeletes = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

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

    useEffect(() => {
        const pending = pendingDeletes.current;
        return () => {
            pending.forEach((timeout) => clearTimeout(timeout));
        };
    }, []);

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
                    <Popconfirm
                        title="Delete event"
                        description={`Are you sure you want to delete "${record.name}"?`}
                        onConfirm={() => deleteEvent(record.id)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancel"
                    >
                        <Button
                            type="dashed"
                            shape="circle"
                            danger
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
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

    async function deleteEvent(eventId: number) {
        const toDelete = events.find((e) => e.id === eventId);
        if (!toDelete) return;
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        const timeout = setTimeout(async () => {
            pendingDeletes.current.delete(eventId);
            setLoading(true);
            try {
                await dbContext.remove(eventId, tableNames.events);
            } finally {
                setLoading(false);
            }
        }, 5000);
        pendingDeletes.current.set(eventId, timeout);
        message.open({
            key: `delete-event-${eventId}`,
            type: "success",
            duration: 5,
            content: (
                <span>
                    Event &ldquo;{toDelete.name}&rdquo; deleted.{" "}
                    <Button
                        type="link"
                        size="small"
                        onClick={() => undoDeleteEvent(eventId, toDelete)}
                    >
                        Undo
                    </Button>
                </span>
            ),
        });
    }

    function undoDeleteEvent(eventId: number, evt: Event) {
        const timeout = pendingDeletes.current.get(eventId);
        if (timeout) {
            clearTimeout(timeout);
            pendingDeletes.current.delete(eventId);
        }
        setEvents((prev) => sortedEvents([...prev, evt]));
        message.destroy(`delete-event-${eventId}`);
    }

    async function addEvent() {
        setEditingEvent(null);
        setIsModalVisible(true);
    }

    function handleEditEvent(event: Event) {
        setEditingEvent(event);
        setIsModalVisible(true);
    }

    const handleModalOk = async (values: EventModalFormValues) => {
        setModalLoading(true);
        try {
            // Use the centralized LocaleUtils to create or update the label
            const label = await LocaleUtils.createOrUpdateLocale(
                values.label,
                dbContext
            );
            let chapters = Array.isArray(values.chapters)
                ? values.chapters
                : [];

            // Process chapters with LocaleUtils
            for (let i = 0; i < chapters.length; i++) {
                // Use the processChapterLocales utility to handle all locale updates for this chapter
                chapters[i] = await LocaleUtils.processChapterLocales(
                    chapters[i],
                    dbContext
                );
            }

            if (editingEvent) {
                // Update existing event, ensure id is preserved and chapters are always included
                const updatedEvent = {
                    ...editingEvent,
                    id: editingEvent.id, // Ensure id is preserved
                    name: values.name,
                    period: {
                        yearStart: values.yearStart,
                            yearEnd: values.yearEnd ?? null,
                    },
                    order: values.order,
                    eventType: values.eventType,
                    timeline: values.timeline,
                        link: values.link ?? "",
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
                            yearEnd: values.yearEnd ?? null,
                    },
                    order: values.order,
                    eventType: values.eventType,
                    timeline: values.timeline,
                        link: values.link ?? "",
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
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            message.error(`Failed to save event: ${msg}`);
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
                <Button onClick={cleanEvents}>
                    Clean events
                </Button>

                <Button
                    onClick={reloadEvents}
                    loading={loading}
                >
                    Load events from DB
                </Button>

                <Input.Search
                    placeholder="Search events…"
                    allowClear
                    style={{ width: 240 }}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <Button icon={<PlusCircleOutlined />} onClick={addEvent} />
            </Space>

            <Table<Event>
                rowKey="id"
                columns={columns}
                dataSource={events.filter((e) =>
                    e.name.toLowerCase().includes(search.toLowerCase())
                )}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} events` }}
                scroll={{
                    scrollToFirstRowOnChange: false,
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
