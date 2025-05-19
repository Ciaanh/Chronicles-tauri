import { useState, useContext, useEffect } from "react";
import { dbRepository, tableNames } from "../../database/dbcontext";
import {
    DB_Chapter,
    DB_Character,
    DB_Event,
    DB_Faction,
    DB_Locale,
    Locale,
} from "../../database/models";
import { Button, Space, Table, TableProps } from "antd";
import { Filters } from "../filters";

import { DeleteOutlined, PlusCircleOutlined } from "@ant-design/icons";

interface LocaleListProps {
    filters: Filters;
}

const LocaleList: React.FC<LocaleListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [locales, setLocales] = useState<Locale[]>([]);
    const dbContext = useContext(dbRepository);

    async function fetchLocales() {
        setLoading(true);

        const localeList = await dbContext.getAll(tableNames.locales);

        const events = await dbContext.getAll(tableNames.events);
        const characters = await dbContext.getAll(tableNames.characters);
        const factions = await dbContext.getAll(tableNames.factions);

        // filter locales not referened by any other table
        const filteredLocales = localeList.filter((locale) => {
            const eventLocales = events.find((e) => {
                const event = e as DB_Event;
                return (
                    event.labelId === locale.id ||
                    event.chapters.find(
                        (chapter) =>
                            chapter.headerId === locale.id ||
                            chapter.pageIds.includes(locale.id)
                    )
                );
            });
            const characterLocales = characters.find((c) => {
                const character = c as DB_Character;
                return (
                    character.labelId === locale.id ||
                    character.biographyId === locale.id
                );
            });
            const factionLocales = factions.find((f) => {
                const faction = f as DB_Faction;
                return (
                    faction.labelId === locale.id ||
                    faction.descriptionId === locale.id
                );
            });
            return !eventLocales && !characterLocales && !factionLocales;
        });

        const mappedLocales = await dbContext.mappers.locales.mapFromDbArray(
            filteredLocales as DB_Locale[]
        );

        setLocales(sortedLocales(mappedLocales));
        setLoading(false);
    }

    useEffect(() => {
        fetchLocales();
    }, [filters.collection]);

    const reloadLocales = async () => {
        fetchLocales();
    };

    const cleanLocales = async () => {
        setLocales([]);
    };

    const columns: TableProps<Locale>["columns"] = [
        {
            title: "Name",
            dataIndex: "name",
            render: (name) => `${name}`,
        },
        {
            title: "",
            key: "action",
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteLocale(record.id)}
                    />
                </Space>
            ),
        },
    ];

    function sortedLocales(localeList: Locale[]) {
        return localeList
            .sort((a, b) => {
                // sort returns -1 if a is before b, 1 if a is after b, 0 if they are equal

                return 0;
            })
            .reverse();
    }

    async function deleteLocale(eventid: number) {
        await dbContext
            .remove(eventid, tableNames.events)
            .then(() => fetchLocales());
    }

    async function addLocale() {
        //dbContext.remove(eventid, tableNames.events).then(() => fetchEvents());
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
                <Button className="bp5-minimal" onClick={cleanLocales}>
                    Clean locales
                </Button>

                <Button
                    className="bp5-minimal"
                    onClick={reloadLocales}
                    loading={loading}
                >
                    Load locales from DB
                </Button>

                <Button icon={<PlusCircleOutlined />} onClick={addLocale} />
            </Space>

            <Table<Locale>
                rowKey="_id"
                columns={columns}
                dataSource={locales}
                pagination={false}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
                }}
            />
        </Space>
    );
};

export default LocaleList;
