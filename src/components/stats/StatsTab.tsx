import { useContext, useEffect, useState } from "react";
import { Card, Col, Progress, Row, Statistic, Table, Typography } from "antd";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { DB_Character, DB_Event, DB_Faction, DB_Locale } from "../../database/models";
import { Language } from "../../constants";
import { Filters } from "../filters";

const { Title } = Typography;

interface Stats {
    events: number;
    characters: number;
    factions: number;
    collections: number;
    locales: number;
    referencedLocales: number;
    coverage: { lang: string; count: number; total: number }[];
}

interface StatsTabProps {
    filters: Filters;
}

const StatsTab: React.FC<StatsTabProps> = ({ filters }) => {
    const dbContext = useContext(dbRepository);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [events, characters, factions, collections, locales] = await Promise.all([
                    dbContext.getAll(tableNames.events),
                    dbContext.getAll(tableNames.characters),
                    dbContext.getAll(tableNames.factions),
                    dbContext.getAll(tableNames.collections),
                    dbContext.getAll(tableNames.locales),
                ]);

                const collectionId = filters.collection?.id;
                const filteredEvents = collectionId
                    ? (events as DB_Event[]).filter((e) => e.collectionId === collectionId)
                    : (events as DB_Event[]);
                const filteredCharacters = collectionId
                    ? (characters as DB_Character[]).filter((c) => c.collectionId === collectionId)
                    : (characters as DB_Character[]);
                const filteredFactions = collectionId
                    ? (factions as DB_Faction[]).filter((f) => f.collectionId === collectionId)
                    : (factions as DB_Faction[]);

                const referencedIds = new Set<number>();
                filteredEvents.forEach((e) => {
                    referencedIds.add(e.labelId);
                    e.chapters?.forEach((c) => {
                        if (c.headerId) referencedIds.add(c.headerId);
                        c.pageIds?.forEach((id) => referencedIds.add(id));
                    });
                });
                filteredCharacters.forEach((c) => {
                    referencedIds.add(c.labelId);
                    c.chapters?.forEach((ch) => {
                        if (ch.headerId) referencedIds.add(ch.headerId);
                        ch.pageIds?.forEach((id) => referencedIds.add(id));
                    });
                });
                filteredFactions.forEach((f) => {
                    referencedIds.add(f.labelId);
                    f.chapters?.forEach((ch) => {
                        if (ch.headerId) referencedIds.add(ch.headerId);
                        ch.pageIds?.forEach((id) => referencedIds.add(id));
                    });
                });

                const localeCount = (locales as DB_Locale[]).length;
                const referencedCount = (locales as DB_Locale[]).filter((l) =>
                    referencedIds.has(l.id)
                ).length;

                const coverage = Object.values(Language).map((lang) => ({
                    lang,
                    count: (locales as DB_Locale[]).filter(
                        (l) => l.translations?.[lang]?.trim() !== ""
                    ).length,
                    total: localeCount,
                }));

                setStats({
                    events: filteredEvents.length,
                    characters: filteredCharacters.length,
                    factions: filteredFactions.length,
                    collections: collections.length,
                    locales: localeCount,
                    referencedLocales: referencedCount,
                    coverage,
                });
            } finally {
                setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.collection]);

    return (
        <div style={{ padding: "16px 0" }}>
            <Title level={4}>Database Statistics</Title>
            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Card loading={loading}>
                        <Statistic title="Events" value={stats?.events ?? 0} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card loading={loading}>
                        <Statistic title="Characters" value={stats?.characters ?? 0} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card loading={loading}>
                        <Statistic title="Factions" value={stats?.factions ?? 0} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card loading={loading}>
                        <Statistic title="Collections" value={stats?.collections ?? 0} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card loading={loading}>
                        <Statistic title="Locales (total)" value={stats?.locales ?? 0} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card loading={loading}>
                        <Statistic
                            title="Unreferenced locales"
                            value={stats != null ? stats.locales - stats.referencedLocales : 0}
                            valueStyle={
                                stats != null && stats.locales - stats.referencedLocales > 0
                                    ? { color: "#faad14" }
                                    : undefined
                            }
                        />
                    </Card>
                </Col>
            </Row>

            <Title level={4} style={{ marginTop: 24 }}>
                Translation Coverage
            </Title>
            <Table
                size="small"
                loading={loading}
                rowKey="lang"
                pagination={false}
                dataSource={stats?.coverage ?? []}
                columns={[
                    { title: "Language", dataIndex: "lang", width: 120 },
                    {
                        title: "Translated",
                        dataIndex: "count",
                        width: 100,
                        render: (count: number, row) => `${count} / ${row.total}`,
                    },
                    {
                        title: "Coverage",
                        key: "progress",
                        render: (_: unknown, row) => (
                            <Progress
                                percent={
                                    row.total === 0 ? 0 : Math.round((row.count / row.total) * 100)
                                }
                                size="small"
                                strokeColor={row.count === row.total ? "#52c41a" : undefined}
                            />
                        ),
                    },
                ]}
            />
        </div>
    );
};

export default StatsTab;
