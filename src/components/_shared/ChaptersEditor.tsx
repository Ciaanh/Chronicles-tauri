import React from "react";
import { Input, Button, Space, Card, Checkbox, Typography } from "antd";
import { Chapter } from "../../database/models/appObjects/Chapter";
import { Locale } from "../../database/models/appObjects/Locale";
import { EnumDictionary } from "../../database/models/EnumDictionary";
import { Language } from "../../constants";
import { defaultTranslations } from "../../constants/language";
import { MarkdownConverter } from "../../_utils/markdownConverter";

const { TextArea } = Input;
const { Text } = Typography;

interface ChaptersEditorProps {
  value?: Chapter[];
  onChange?: (chapters: Chapter[]) => void;
}

const emptyTranslations = (): EnumDictionary<Language, string> => ({
  ...defaultTranslations,
});

const emptyLocale = (): Locale => ({
  id: -1,
  enUS: "",
  ishtml: false,
  translations: emptyTranslations(),
});

export const ChaptersEditor: React.FC<ChaptersEditorProps> = ({
  value = [],
  onChange,
}) => {
  const [chapters, setChapters] = React.useState<Chapter[]>(value);
  const [markdownMode, setMarkdownMode] = React.useState<{ [key: string]: boolean }>({});
  const [htmlMode, setHtmlMode] = React.useState<{ [key: string]: boolean }>({});

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

  const updateLocaleContent = (locale: Locale | null, content: string, isMarkdown: boolean, isHtml: boolean): Locale => {
    const baseLocale = locale || emptyLocale();
    const updatedLocale: Locale = {
      id: baseLocale.id,
      enUS: content,
      ishtml: isHtml || isMarkdown || MarkdownConverter.isMarkdown({ 
        ...baseLocale, 
        enUS: content,
        ishtml: false
      }) || MarkdownConverter.isHtml(content),
      translations: baseLocale.translations,
    };
    return updatedLocale;
  };

  const toggleMarkdownMode = (key: string) => {
    setMarkdownMode(prev => ({ ...prev, [key]: !prev[key] }));
    // If enabling markdown, disable HTML mode
    if (!markdownMode[key]) {
      setHtmlMode(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleHtmlMode = (key: string) => {
    setHtmlMode(prev => ({ ...prev, [key]: !prev[key] }));
    // If enabling HTML, disable markdown mode
    if (!htmlMode[key]) {
      setMarkdownMode(prev => ({ ...prev, [key]: false }));
    }
  };

  const getContentMode = (locale: Locale | null, key: string): 'text' | 'markdown' | 'html' => {
    if (htmlMode[key] || (locale?.ishtml && !markdownMode[key] && MarkdownConverter.isHtml(locale.enUS))) {
      return 'html';
    }
    if (markdownMode[key] || (locale && MarkdownConverter.isMarkdown(locale))) {
      return 'markdown';
    }
    return 'text';
  };

  const isMarkdownContent = (locale: Locale | null, key: string): boolean => {
    return getContentMode(locale, key) === 'markdown';
  };

  const isHtmlContent = (locale: Locale | null, key: string): boolean => {
    return getContentMode(locale, key) === 'html';
  };

  const renderPageEditor = (page: Locale, pageIndex: number, chapterIndex: number) => {
    const pageKey = `chapter-${chapterIndex}-page-${pageIndex}`;
    const contentMode = getContentMode(page, pageKey);
    const isMarkdown = contentMode === 'markdown';
    const isHtml = contentMode === 'html';
    
    return (
      <Card 
        key={page.id ?? pageIndex} 
        size="small" 
        style={{ marginBottom: 8, backgroundColor: "#fafafa" }}
        title={
          <Space>
            <Text strong>Page {pageIndex + 1}</Text>
            <Checkbox
              checked={markdownMode[pageKey] || false}
              onChange={() => toggleMarkdownMode(pageKey)}
            >
              Markdown
            </Checkbox>
            <Checkbox
              checked={htmlMode[pageKey] || false}
              onChange={() => toggleHtmlMode(pageKey)}
            >
              HTML
            </Checkbox>
            {isMarkdown && (
              <Text type="secondary" style={{ fontSize: "11px", color: "#1890ff" }}>
                MD
              </Text>
            )}
            {isHtml && (
              <Text type="secondary" style={{ fontSize: "11px", color: "#52c41a" }}>
                HTML
              </Text>
            )}
          </Space>
        }
        extra={
          <Button
            size="small"
            danger
            onClick={() => {
              const newPages = chapters[chapterIndex].pages.filter((_, i) => i !== pageIndex);
              updateChapter(chapterIndex, { ...chapters[chapterIndex], pages: newPages });
            }}
          >
            Remove
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <TextArea
            value={page.enUS}
            onChange={(e) => {
              const newPages = [...chapters[chapterIndex].pages];
              const isMarkdown = markdownMode[pageKey] || false;
              const isHtml = htmlMode[pageKey] || false;
              newPages[pageIndex] = updateLocaleContent(page, e.target.value, isMarkdown, isHtml);
              updateChapter(chapterIndex, { ...chapters[chapterIndex], pages: newPages });
            }}
            placeholder={
              isMarkdown
                ? "Enter content in Markdown (supports **bold**, *italic*, # headers, - lists, `code`, [links](url), {star} raid icons, etc.)"
                : isHtml
                ? "Enter WoW HTML (supports <h1>, <p>, <br>, |cffRRGGBB color codes, |TTexture:size|t icons, etc.)"
                : `Page ${pageIndex + 1} content (enUS)`
            }
            autoSize={{ minRows: 3, maxRows: 8 }}
            style={{
              fontFamily: (isMarkdown || isHtml) ? "monospace" : "inherit",
            }}
          />
          
          {(isMarkdown || isHtml) && page.enUS && (
            <Card size="small" title={isMarkdown ? "Markdown Preview" : "HTML Preview"}>
              <div style={{
                background: "#f5f5f5",
                padding: "12px",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "11px",
                whiteSpace: "pre-wrap",
                maxHeight: "200px",
                overflow: "auto"
              }}>
                {isMarkdown ? MarkdownConverter.toHtml(page.enUS) : page.enUS}
              </div>
            </Card>
          )}
          
          {isMarkdown && (
            <Text type="secondary" style={{ fontSize: "11px" }}>
              Markdown features: **bold**, *italic*, # headers, - lists, `code`, [links](url), ![images](path), &#123;star&#125; icons
            </Text>
          )}
          
          {isHtml && (
            <Text type="secondary" style={{ fontSize: "11px" }}>
              WoW HTML: &lt;h1-h3&gt;, &lt;p&gt;, &lt;br&gt;, &lt;a&gt;, &lt;img&gt;, |cffRRGGBB colors, |TTexture:size|t icons
            </Text>
          )}
        </Space>
      </Card>
    );
  };

  return (
    <div>
      {chapters.map((chapter, idx) => (
        <Card
          key={chapter.header?.id ?? idx}
          size="small"
          style={{ marginBottom: 12 }}
          title={`Chapter ${idx + 1}`}
          extra={
            <Space>
              <Button
                size="small"
                onClick={() => {
                  if (idx > 0) {
                    const newChapters = [...chapters];
                    [newChapters[idx - 1], newChapters[idx]] = [
                      newChapters[idx],
                      newChapters[idx - 1],
                    ];
                    triggerChange(newChapters);
                  }
                }}
                disabled={idx === 0}
              >
                ↑
              </Button>
              <Button
                size="small"
                onClick={() => {
                  if (idx < chapters.length - 1) {
                    const newChapters = [...chapters];
                    [newChapters[idx], newChapters[idx + 1]] = [
                      newChapters[idx + 1],
                      newChapters[idx],
                    ];
                    triggerChange(newChapters);
                  }
                }}
                disabled={idx === chapters.length - 1}
              >
                ↓
              </Button>
              <Button
                size="small"
                danger
                onClick={() => {
                  triggerChange(chapters.filter((_, i) => i !== idx));
                }}
              >
                Remove
              </Button>
            </Space>
          }
        >
          <div style={{ marginBottom: 8 }}>
            <Space>
              <Text strong>Header (enUS):</Text>
              <Checkbox
                checked={markdownMode[`chapter-${idx}-header`] || false}
                onChange={() => toggleMarkdownMode(`chapter-${idx}-header`)}
              >
                Markdown
              </Checkbox>
              <Checkbox
                checked={htmlMode[`chapter-${idx}-header`] || false}
                onChange={() => toggleHtmlMode(`chapter-${idx}-header`)}
              >
                HTML
              </Checkbox>
            </Space>
            <TextArea
              value={chapter.header?.enUS || ""}
              placeholder={
                isMarkdownContent(chapter.header, `chapter-${idx}-header`)
                  ? "Enter header in Markdown (supports **bold**, *italic*, # headers, etc.)"
                  : isHtmlContent(chapter.header, `chapter-${idx}-header`)
                  ? "Enter header in WoW HTML (supports <h1>, |cffRRGGBB colors, etc.)"
                  : "Header (enUS)"
              }
              onChange={(e) => {
                const isMarkdown = markdownMode[`chapter-${idx}-header`] || false;
                const isHtml = htmlMode[`chapter-${idx}-header`] || false;
                updateChapter(idx, {
                  ...chapter,
                  header: updateLocaleContent(chapter.header, e.target.value, isMarkdown, isHtml),
                });
              }}
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{
                fontFamily: (isMarkdownContent(chapter.header, `chapter-${idx}-header`) || isHtmlContent(chapter.header, `chapter-${idx}-header`)) ? "monospace" : "inherit",
              }}
            />
            {isMarkdownContent(chapter.header, `chapter-${idx}-header`) && chapter.header?.enUS && (
              <div style={{ 
                marginTop: 4, 
                padding: "8px", 
                background: "#f5f5f5", 
                borderRadius: "4px",
                fontSize: "11px"
              }}>
                <Text type="secondary">Markdown Preview: </Text>
                <Text code>{MarkdownConverter.toHtml(chapter.header.enUS)}</Text>
              </div>
            )}
            {isHtmlContent(chapter.header, `chapter-${idx}-header`) && chapter.header?.enUS && (
              <div style={{ 
                marginTop: 4, 
                padding: "8px", 
                background: "#e6f7ff", 
                borderRadius: "4px",
                fontSize: "11px"
              }}>
                <Text type="secondary">HTML Content: </Text>
                <Text code>{chapter.header.enUS}</Text>
              </div>
            )}
          </div>
          <div>
            <Text strong>Pages:</Text>
            {chapter.pages.map((page, pidx) => renderPageEditor(page, pidx, idx))}
            <Button
              size="small"
              onClick={() => {
                updateChapter(idx, {
                  ...chapter,
                  pages: [...chapter.pages, emptyLocale()],
                });
              }}
              style={{ marginTop: 8 }}
            >
              Add Page
            </Button>
          </div>
        </Card>
      ))}
      <Button
        type="dashed"
        block
        onClick={() =>
          triggerChange([...chapters, { header: emptyLocale(), pages: [] }])
        }
      >
        Add Chapter
      </Button>
    </div>
  );
};

export default ChaptersEditor;
