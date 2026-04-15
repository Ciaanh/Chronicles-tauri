import { useContext, useEffect, useState } from "react";
import { Input, Timeline, Typography } from "antd";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Event, Event } from "../../database/models";
import { Constants } from "../../constants";

const { Title } = Typography;

const TimelineTab: React.FC = () => {
    const dbContext = useContext(dbRepository);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const all = await dbContext.getAll(tableNames.events);
                const mapped = await dbContext.mappers.events.mapFromDbArray(
                    all as DB_Event[]
                );
                // Sort chronologically oldest first
                const sorted = [...mapped].sort((a, b) => {
                    const aY = a.period?.yearStart ?? 0;
                    const bY = b.period?.yearStart ?? 0;
                    return aY - bY;
                });
                setEvents(sorted);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

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

    const filtered = events.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
    );

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
                <Typography.Text type="secondary">Loading…</Typography.Text>
            ) : (
                <Timeline
                    mode="left"
                    items={filtered.map((e) => ({
                        label: (
                            <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12 }}
                            >
                                {formatPeriod(e)}
                            </Typography.Text>
                        ),
                        children: (
                            <span>
                                <strong>{e.name}</strong>
                                {e.collection?.name
                                    ? ` — ${e.collection.name}`
                                    : ""}
                            </span>
                        ),
                    }))}
                />
            )}
        </div>
    );
};

export default TimelineTab;
