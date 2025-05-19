import React from "react";
import { Input, Button, Space, Card } from "antd";
import { Chapter } from "../../database/models/appObjects/Chapter";
import { Locale } from "../../database/models/appObjects/Locale";
import { EnumDictionary } from "../../database/models/EnumDictionary";
import { Language } from "../../constants";

interface ChaptersEditorProps {
    value?: Chapter[];
    onChange?: (chapters: Chapter[]) => void;
}

const emptyTranslations = (): EnumDictionary<Language, string> => ({
    enUS: "",
    deDE: "",
    esES: "",
    esMX: "",
    frFR: "",
    itIT: "",
    ptBR: "",
    ruRU: "",
    koKR: "",
    zhCN: "",
    zhTW: "",
});

const emptyLocale = (): Locale => ({ id: -1, enUS: "", ishtml: false, translations: emptyTranslations() });

export const ChaptersEditor: React.FC<ChaptersEditorProps> = ({ value = [], onChange }) => {
    const [chapters, setChapters] = React.useState<Chapter[]>(value);

    // Fix: ensure chapters are initialized from value on mount and when value changes
    React.useEffect(() => {
        // Only update local state if value is different from current chapters
        if (JSON.stringify(value) !== JSON.stringify(chapters)) {
            setChapters(value || []);
        }
    }, [value]);

    const triggerChange = (chs: Chapter[]) => {
        setChapters(chs);
        onChange?.(chs);
    };

    const updateChapter = (idx: number, chapter: Chapter) => {
        const newChapters = [...chapters];
        newChapters[idx] = chapter;
        triggerChange(newChapters);
    };

    return (
        <div>
            {chapters.map((chapter, idx) => (
                <Card
                    key={idx}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={`Chapter ${idx + 1}`}
                    extra={
                        <Space>
                            <Button size="small" onClick={() => {
                                if (idx > 0) {
                                    const newChapters = [...chapters];
                                    [newChapters[idx - 1], newChapters[idx]] = [newChapters[idx], newChapters[idx - 1]];
                                    triggerChange(newChapters);
                                }
                            }} disabled={idx === 0}>↑</Button>
                            <Button size="small" onClick={() => {
                                if (idx < chapters.length - 1) {
                                    const newChapters = [...chapters];
                                    [newChapters[idx], newChapters[idx + 1]] = [newChapters[idx + 1], newChapters[idx]];
                                    triggerChange(newChapters);
                                }
                            }} disabled={idx === chapters.length - 1}>↓</Button>
                            <Button size="small" danger onClick={() => {
                                triggerChange(chapters.filter((_, i) => i !== idx));
                            }}>Remove</Button>
                        </Space>
                    }
                >
                    <div style={{ marginBottom: 8 }}>
                        <b>Header (enUS):</b>
                        <Input
                            value={chapter.header?.enUS || ""}
                            placeholder="Header (enUS)"
                            onChange={e => {
                                updateChapter(idx, {
                                    ...chapter,
                                    header: { ...chapter.header, enUS: e.target.value, ishtml: false, translations: emptyTranslations(), id: chapter.header?.id ?? -1 }
                                });
                            }}
                        />
                    </div>
                    <div>
                        <b>Pages:</b>
                        {chapter.pages.map((page, pidx) => (
                            <Space key={pidx} style={{ display: "flex", marginBottom: 4 }}>
                                <Input
                                    value={page.enUS}
                                    placeholder={`Page ${pidx + 1} (enUS)`}
                                    onChange={e => {
                                        const newPages = [...chapter.pages];
                                        newPages[pidx] = { ...page, enUS: e.target.value, ishtml: false, translations: emptyTranslations(), id: page.id ?? -1 };
                                        updateChapter(idx, { ...chapter, pages: newPages });
                                    }}
                                />
                                <Button size="small" danger onClick={() => {
                                    const newPages = chapter.pages.filter((_, i) => i !== pidx);
                                    updateChapter(idx, { ...chapter, pages: newPages });
                                }}>Remove</Button>
                            </Space>
                        ))}
                        <Button size="small" onClick={() => {
                            updateChapter(idx, { ...chapter, pages: [...chapter.pages, emptyLocale()] });
                        }}>Add Page</Button>
                    </div>
                </Card>
            ))}
            <Button type="dashed" block onClick={() => triggerChange([...chapters, { header: emptyLocale(), pages: [] }])}>
                Add Chapter
            </Button>
        </div>
    );
};

export default ChaptersEditor;
