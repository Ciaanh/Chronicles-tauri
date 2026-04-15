import { useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Event, Event } from "../../database/models";
import { App, Button, Popconfirm, Space, TableProps, Typography } from "antd";
import { Filters } from "../filters";
import { Constants } from "../../constants";
import EventModal, { EventModalFormValues } from "./EventModal";
import { LocaleUtils } from "../../_utils/localeUtils";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useEntityCrud } from "../_shared/useEntityCrud";
import { GenericEntityList } from "../_shared/GenericEntityList";

interface EventListProps {
    filters: Filters;
}

const EventList: React.FC<EventListProps> = ({ filters }) => {
    const dbContext = useContext(dbRepository);
    const { message } = App.useApp();

    function sortedEvents(eventList: Event[]): Event[] {
        return [...eventList]
            .sort((a, b) => {
                if (a.period === null || b.period === null) return 0;
                if (a.period.yearStart === null || b.period.yearStart === null) return 0;
                if (a.period.yearStart === b.period.yearStart) {
                    if (a.order > b.order) return 1;
                    if (a.order < b.order) return -1;
                    return 0;
                }
                if (a.period.yearStart > b.period.yearStart) return 1;
                if (a.period.yearStart < b.period.yearStart) return -1;
                return 0;
            })
            .reverse();
    }

    const {
        loading,
        setLoading,
        items: events,
        setItems: setEvents,
        isModalVisible,
        modalLoading,
        setModalLoading,
        editingItem: editingEvent,
        search,
        setSearch,
        openAdd,
        openEdit,
        closeModal,
        optimisticDelete,
    } = useEntityCrud<Event>({
        tableName: tableNames.events,
        entityLabel: "Event",
        sortItems: sortedEvents,
    });

    async function fetchEvents() {
        setLoading(true);
        const eventList = await dbContext.getAll(tableNames.events);
        const filteredEvents = eventList.filter((e) => {
            if (filters?.collection === null) return true;
            return filters?.collection?.id === (e as DB_Event).collectionId;
        });
        const mappedEvents = await dbContext.mappers.events.mapFromDbArray(
            filteredEvents as DB_Event[]
        );
        setEvents(sortedEvents(mappedEvents));
        setLoading(false);
    }

    useEffect(() => {
        fetchEvents();
    }, [filters.collection]); // eslint-disable-line react-hooks/exhaustive-deps

    function formatPeriod(period: { yearStart: number; yearEnd: number }): string {
        if (!period) return "";
        const { yearStart, yearEnd } = period;
        if (yearEnd === Constants.minYear) return "Mythos";
        if (yearStart === Constants.maxYear) return "Future";
        const start = yearStart !== null ? String(yearStart) : "";
        const end =
            yearEnd !== null && yearEnd !== Constants.maxYear && yearEnd !== Constants.minYear
                ? String(yearEnd)
                : "";
        if (!start && !end) return "";
        if (start === end || !end) return start;
        if (!start) return end;
        return `${start} / ${end}`;
    }

    const columns: TableProps<Event>["columns"] = [
        {
            title: "Period",
            dataIndex: "period",
            width: 100,
            render: (period) => formatPeriod(period),
            sorter: (a, b) => {
                const aY = a.period?.yearStart ?? 0;
                const bY = b.period?.yearStart ?? 0;
                if (aY !== bY) return aY - bY;
                return (a.order ?? 0) - (b.order ?? 0);
            },
            defaultSortOrder: "descend",
        },
        {
            title: "Name",
            dataIndex: "name",
            width: 180,
            render: (name: string) => (
                <Typography.Text ellipsis style={{ maxWidth: 220, display: "block" }}>
                    {name}
                </Typography.Text>
            ),
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: "",
            key: "action",
            fixed: "right",
            width: 20,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<EditOutlined />}
                        aria-label="Edit event"
                        title="Edit event"
                        onClick={() => openEdit(record)}
                    />
                    <Popconfirm
                        title="Delete event"
                        description={`Are you sure you want to delete "${record.name}"?`}
                        onConfirm={() => optimisticDelete(record)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancel"
                    >
                        <Button
                            type="dashed"
                            shape="circle"
                            danger
                            icon={<DeleteOutlined />}
                            aria-label="Delete event"
                            title="Delete event"
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const handleModalOk = async (values: EventModalFormValues) => {
        setModalLoading(true);
        try {
            await dbContext.transaction(async (tx) => {
                const label = await LocaleUtils.createOrUpdateLocale(values.label, tx);
                const chapters = Array.isArray(values.chapters) ? values.chapters : [];
                for (let i = 0; i < chapters.length; i++) {
                    chapters[i] = await LocaleUtils.processChapterLocales(chapters[i], tx);
                }

                if (editingEvent) {
                    await tx.update(
                        dbContext.mappers.events.map({
                            ...editingEvent,
                            name: values.name,
                            period: {
                                yearStart: values.yearStart,
                                yearEnd: values.yearEnd ?? null,
                            },
                            order: values.order,
                            eventType: values.eventType,
                            timeline: values.timeline,
                            link: values.link ?? "",
                            label,
                            collection: values.collection,
                            factions: values.factions || [],
                            characters: values.characters || [],
                            chapters,
                        }),
                        tableNames.events
                    );
                } else {
                    await tx.add(
                        dbContext.mappers.events.map({
                            id: -1,
                            name: values.name,
                            period: {
                                yearStart: values.yearStart,
                                yearEnd: values.yearEnd ?? null,
                            },
                            order: values.order,
                            eventType: values.eventType,
                            timeline: values.timeline,
                            link: values.link ?? "",
                            label,
                            collection: values.collection,
                            factions: values.factions || [],
                            characters: values.characters || [],
                            chapters,
                        }),
                        tableNames.events
                    );
                }
            });
            closeModal();
            fetchEvents();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            message.error(`Failed to save event: ${msg}`);
        } finally {
            setModalLoading(false);
        }
    };

    return (
        <GenericEntityList<Event>
            items={events}
            loading={loading}
            search={search}
            filters={filters}
            columns={columns}
            entityLabel="Event"
            onSearch={setSearch}
            onAdd={openAdd}
            onReload={fetchEvents}
            onClean={() => setEvents([])}
            modal={
                <EventModal
                    visible={isModalVisible}
                    onOk={handleModalOk}
                    onCancel={closeModal}
                    confirmLoading={modalLoading}
                    eventToEdit={editingEvent ?? undefined}
                    defaultCollectionId={filters.collection?.id}
                />
            }
        />
    );
};

export default EventList;
