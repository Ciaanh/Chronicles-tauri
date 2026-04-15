import { useContext, useEffect, useState } from "react";
import { Input, Skeleton, Timeline, Typography } from "antd";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Event, Event } from "../../database/models";
import { Constants } from "../../constants";
import { Filters } from "../filters";
import EventModal, { EventModalFormValues } from "../_event/EventModal";
import { LocaleUtils } from "../../_utils/localeUtils";

const { Title } = Typography;

interface TimelineTabProps {
    filters: Filters;
}

const TimelineTab: React.FC<TimelineTabProps> = ({ filters }) => {
    const dbContext = useContext(dbRepository);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const all = await dbContext.getAll(tableNames.events);
                const mapped = await dbContext.mappers.events.mapFromDbArray(all as DB_Event[]);
                const sorted = [...mapped].sort((a, b) => {
                    const aY = a.period?.yearStart ?? 0;
                    const bY = b.period?.yearStart ?? 0;
                    return aY - bY;
                });
                const collectionFiltered = filters.collection
                    ? sorted.filter((e) => e.collection?.id === filters.collection?.id)
                    : sorted;
                setEvents(collectionFiltered);
            } finally {
                setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.collection]);

    function formatYear(year: number | null): string {
        if (year === null) return "";
        if (year === Constants.minYear) return "Mythos";
        if (year === Constants.maxYear) return "Future";
        return String(year);
    }

    function formatPeriod(event: Event): string {
        const start = event.period?.yearStart ?? null;
        const end = event.period?.yearEnd ?? null;
        const startStr = formatYear(start);
        const endStr = formatYear(end);
        if (!startStr && !endStr) return "";
        if (startStr === endStr || !endStr) return startStr;
        if (!startStr) return endStr;
        return `${startStr} – ${endStr}`;
    }

    const handleEventSave = async (values: EventModalFormValues) => {
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
                }
            });
            setEditingEvent(null);
            // Refresh the timeline
            const all = await dbContext.getAll(tableNames.events);
            const mapped = await dbContext.mappers.events.mapFromDbArray(all as DB_Event[]);
            const sorted = [...mapped].sort(
                (a, b) => (a.period?.yearStart ?? 0) - (b.period?.yearStart ?? 0)
            );
            setEvents(
                filters.collection
                    ? sorted.filter((e) => e.collection?.id === filters.collection?.id)
                    : sorted
            );
        } finally {
            setModalLoading(false);
        }
    };

    const filtered = events.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ padding: "16px 0" }}>
            <Title level={4}>Chronological Timeline</Title>
            <Input.Search
                placeholder="Filter events…"
                allowClear
                style={{ width: 280, marginBottom: 16 }}
                onChange={(e) => setSearch(e.target.value)}
            />
            {loading ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
                <Timeline
                    mode="left"
                    items={filtered.map((e) => ({
                        label: (
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {formatPeriod(e)}
                            </Typography.Text>
                        ),
                        children: (
                            <Typography.Link
                                onClick={() => setEditingEvent(e)}
                                title="Click to edit"
                                style={{ cursor: "pointer" }}
                            >
                                <strong>{e.name}</strong>
                                {e.collection?.name ? ` — ${e.collection.name}` : ""}
                            </Typography.Link>
                        ),
                    }))}
                />
            )}
            <EventModal
                visible={editingEvent !== null}
                eventToEdit={editingEvent ?? undefined}
                onOk={handleEventSave}
                onCancel={() => setEditingEvent(null)}
                confirmLoading={modalLoading}
            />
        </div>
    );
};

export default TimelineTab;
