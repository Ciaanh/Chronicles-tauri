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
import {
    Button,
    Space,
    Table,
    TableProps,
    Modal,
    Typography,
    Switch,
} from "antd";
import { Filters } from "../filters";

import {
    DeleteOutlined,
    EditOutlined,
    PlusCircleOutlined,
} from "@ant-design/icons";
import LocaleEditor from "../_shared/LocaleEditor";

interface LocaleListProps {
    filters: Filters;
}

const LocaleList: React.FC<LocaleListProps> = ({ filters }) => {
    const [loading, setLoading] = useState(false);
    const [locales, setLocales] = useState<Locale[]>([]);
    const [editingLocale, setEditingLocale] = useState<Locale | null>(null);
    const [showOnlyUnreferenced, setShowOnlyUnreferenced] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{
        visible: boolean;
        localeId: number | null;
        referenced: boolean;
        title: string;
        content: string;
        okText: string;
    }>({
        visible: false,
        localeId: null,
        referenced: false,
        title: "",
        content: "",
        okText: "",
    });
    const dbContext = useContext(dbRepository);

    async function fetchLocales() {
        setLoading(true);

        const localeList = await dbContext.getAll(tableNames.locales);
        const events = await dbContext.getAll(tableNames.events);
        const characters = await dbContext.getAll(tableNames.characters);
        const factions = await dbContext.getAll(tableNames.factions);

        // Cast to correct types for property access
        const eventList = events as DB_Event[];
        const characterList = characters as DB_Character[];
        const factionList = factions as DB_Faction[];
        const dbLocaleList = localeList as DB_Locale[];

        // Defensive: ensure all IDs are numbers and not undefined/null
        const referencedIds = new Set<number>();
        eventList.forEach((e) => {
            if (typeof e.labelId === "number") referencedIds.add(e.labelId);
            e.chapters?.forEach((chapter: DB_Chapter) => {
                if (typeof chapter.headerId === "number")
                    referencedIds.add(chapter.headerId);
                if (Array.isArray(chapter.pageIds)) {
                    chapter.pageIds.forEach((pid) => {
                        if (typeof pid === "number") referencedIds.add(pid);
                    });
                }
            });
        });
        characterList.forEach((c) => {
            if (typeof c.labelId === "number") referencedIds.add(c.labelId);
            if (typeof c.biographyId === "number")
                referencedIds.add(c.biographyId);
        });
        factionList.forEach((f) => {
            if (typeof f.labelId === "number") referencedIds.add(f.labelId);
            if (typeof f.descriptionId === "number")
                referencedIds.add(f.descriptionId);
        });

        // Defensive: ensure locale.id is a number
        let filteredLocales = dbLocaleList;
        if (showOnlyUnreferenced) {
            filteredLocales = dbLocaleList.filter(
                (locale) =>
                    typeof locale.id === "number" &&
                    !referencedIds.has(locale.id)
            );
        }

        const mappedLocales = await dbContext.mappers.locales.mapFromDbArray(
            filteredLocales
        );

        setLocales(mappedLocales);
        setLoading(false);
    }

    useEffect(() => {
        fetchLocales();
    }, [filters.collection, showOnlyUnreferenced]);

    const reloadLocales = async () => {
        fetchLocales();
    };

    const cleanLocales = async () => {
        setLocales([]);
    };

    const columns: TableProps<Locale>["columns"] = [
        {
            title: "",
            dataIndex: "id",
            width: 20,
            render: (id: number) => (
                <Typography.Text
                    ellipsis
                    style={{ maxWidth: 60, display: "block", color: "#888" }}
                >
                    {id}
                </Typography.Text>
            ),
        },
        {
            title: "English (enUS)",
            dataIndex: "enUS",
            width: 180,
            render: (enUS: string) => (
                <Typography.Text
                    ellipsis
                    style={{ maxWidth: 220, display: "block" }}
                >
                    {enUS}
                </Typography.Text>
            ),
        },
        {
            title: "",
            key: "action",
            fixed: "right",
            width: 20,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        className="bp5-minimal"
                        type="default"
                        shape="circle"
                        icon={<EditOutlined />}
                        onClick={() => setEditingLocale(record)}
                        style={{ background: "transparent" }}
                        title="Edit Locale"
                    />
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

    async function isLocaleReferenced(localeId: number): Promise<boolean> {
        const events = await dbContext.getAll(tableNames.events);
        const characters = await dbContext.getAll(tableNames.characters);
        const factions = await dbContext.getAll(tableNames.factions);

        const referencedInEvents = events.some((e) => {
            const event = e as DB_Event;
            return (
                event.labelId === localeId ||
                event.chapters.some(
                    (chapter) =>
                        chapter.headerId === localeId ||
                        chapter.pageIds.includes(localeId)
                )
            );
        });
        const referencedInCharacters = characters.some((c) => {
            const character = c as DB_Character;
            return (
                character.labelId === localeId ||
                character.biographyId === localeId
            );
        });
        const referencedInFactions = factions.some((f) => {
            const faction = f as DB_Faction;
            return (
                faction.labelId === localeId ||
                faction.descriptionId === localeId
            );
        });

        return (
            referencedInEvents || referencedInCharacters || referencedInFactions
        );
    }

    async function deleteLocale(localeId: number) {
        const referenced = await isLocaleReferenced(localeId);
        setDeleteModal({
            visible: true,
            localeId,
            referenced,
            title: referenced
                ? "Locale is referenced elsewhere"
                : "Delete Locale?",
            content: referenced
                ? "This locale is referenced by other data. Its content will be wiped (emptied), but the record will remain. Proceed?"
                : "This locale is not referenced and will be permanently deleted. Proceed?",
            okText: referenced ? "Wipe Locale" : "Delete Locale",
        });
    }

    const handleDeleteModalOk = async () => {
        if (deleteModal.localeId == null) return;
        if (deleteModal.referenced) {
            // Wipe the locale's content but keep the record
            const locale = await dbContext.get(
                deleteModal.localeId,
                tableNames.locales
            );
            if (locale) {
                const wipedLocale = { ...locale, name: "", text: "" };
                await dbContext.update(wipedLocale, tableNames.locales);
            }
        } else {
            // Safe to delete
            await dbContext.remove(deleteModal.localeId, tableNames.locales);
        }
        setDeleteModal({ ...deleteModal, visible: false });
        fetchLocales();
    };

    const handleDeleteModalCancel = () => {
        setDeleteModal({ ...deleteModal, visible: false });
    };

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
                <Space align="center">
                    <Switch
                        checked={showOnlyUnreferenced}
                        onChange={() =>
                            setShowOnlyUnreferenced((prev) => !prev)
                        }
                    />
                    <span>
                        {showOnlyUnreferenced
                            ? "Show Only Unreferenced"
                            : "Show All"}
                    </span>
                </Space>
            </Space>

            <Table<Locale>
                rowKey="id"
                columns={columns}
                dataSource={locales}
                pagination={false}
                scroll={{
                    scrollToFirstRowOnChange: false,
                    y: 440,
                }}
            />
            <Modal
                open={deleteModal.visible}
                title={deleteModal.title}
                onOk={handleDeleteModalOk}
                onCancel={handleDeleteModalCancel}
                okText={deleteModal.okText}
                cancelText="Cancel"
            >
                {deleteModal.content}
            </Modal>
            {editingLocale && (
                <Modal
                    open={!!editingLocale}
                    title="Edit Locale"
                    onCancel={() => setEditingLocale(null)}
                    onOk={async () => {
                        setEditingLocale(null);
                        fetchLocales();
                    }}
                    footer={null}
                >
                    <LocaleEditor
                        value={editingLocale}
                        onChange={async (updated) => {
                            await dbContext.update(updated, tableNames.locales);
                            setEditingLocale(null);
                            fetchLocales();
                        }}
                    />
                </Modal>
            )}
        </Space>
    );
};

export default LocaleList;
