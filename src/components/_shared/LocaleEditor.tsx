import React, { useState } from "react";
import { Input, Form, Collapse, Tabs, Typography, Checkbox, Space } from "antd";
import { Locale } from "../../database/models";
import { Language } from "../../constants";
import { EnumDictionary } from "../../database/models/EnumDictionary";
import ReactCountryFlag from "react-country-flag";
import { defaultTranslations, languageNames, languageCountryCodes } from "../../constants/language";
import { MarkdownConverter } from "../../_utils/markdownConverter";
import { EyeOutlined, EditOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Text } = Typography;

interface LocaleEditorProps {
  value?: Locale;
  onChange?: (value: Locale) => void;
}

const LocaleEditor: React.FC<LocaleEditorProps> = ({ value, onChange }) => {
  // Ensure all required fields are present
  const safeValue: Locale = {
    id: value?.id ?? -1,
    ishtml: value?.ishtml ?? false,
    enUS: value?.enUS ?? "",
    translations: {
      ...defaultTranslations,
      ...(value?.translations || {}),
    },
  };

  // Track which field is focused for expansion and markdown mode
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("edit");

  const handleChange = (lang: Language, val: string) => {
    const updatedLocale = { ...safeValue };
    
    if (lang === Language.enUS) {
      updatedLocale.enUS = val;
      // Auto-detect markdown and set ishtml flag
      updatedLocale.ishtml = isMarkdownMode || MarkdownConverter.isMarkdown({ ...updatedLocale, enUS: val });
    } else {
      const newTranslations = { ...safeValue.translations, [lang]: val };
      // Remove empty/null translations except enUS
      const cleanedTranslations = Object.fromEntries(
        Object.entries(newTranslations).filter(
          ([key, value]) =>
            key === "enUS" ||
            (value !== null && value !== undefined && value !== ""),
        ),
      ) as EnumDictionary<Language, string>;
      updatedLocale.translations = cleanedTranslations;
    }
    
    if (onChange) onChange(updatedLocale);
  };

  const getPreviewContent = () => {
    if (!safeValue.enUS) return "No content to preview";
    
    if (isMarkdownMode || MarkdownConverter.isMarkdown(safeValue)) {
      return MarkdownConverter.toHtml(safeValue.enUS);
    }
    
    return safeValue.enUS;
  };

  const isMarkdownContent = isMarkdownMode || MarkdownConverter.isMarkdown(safeValue);

  const renderMainEditor = () => {
    const tabItems = [
      {
        key: "edit",
        label: (
          <Space>
            <EditOutlined />
            Edit
          </Space>
        ),
        children: (
          <div>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Space>
                <Checkbox
                  checked={isMarkdownMode}
                  onChange={(e) => setIsMarkdownMode(e.target.checked)}
                >
                  Markdown Mode
                </Checkbox>
                {isMarkdownContent && (
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Markdown detected - content will be converted to WoW HTML
                  </Text>
                )}
              </Space>
              <TextArea
                value={safeValue.enUS}
                onChange={(e) => handleChange(Language.enUS, e.target.value)}
                placeholder={
                  isMarkdownMode
                    ? "Enter content in Markdown (supports **bold**, *italic*, # headers, - lists, `code`, [links](url), ![images](path), {star} raid icons, etc.)"
                    : "Enter label in English"
                }
                autoSize={
                  focusedField === "enUS"
                    ? { minRows: 6, maxRows: 12 }
                    : { minRows: 3, maxRows: 3 }
                }
                onFocus={() => setFocusedField("enUS")}
                onBlur={() => setFocusedField(null)}
                style={{
                  resize: "vertical",
                  whiteSpace: "pre-line",
                  overflowX: "hidden",
                  overflowY: "hidden",
                  fontFamily: isMarkdownMode ? "monospace" : "inherit",
                }}
              />
              {isMarkdownMode && (
                <div style={{ fontSize: "12px", color: "#666" }}>
                  <Text type="secondary">
                    Markdown features: <strong>**bold**</strong>, <em>*italic*</em>, 
                    <code># headers</code>, <code>- lists</code>, <code>`code`</code>, 
                    <code>[links](url)</code>, <code>![images](path)</code>, 
                    <code>{"{star}"}</code> raid icons
                  </Text>
                </div>
              )}
            </Space>
          </div>
        ),
      },
      {
        key: "preview",
        label: (
          <Space>
            <EyeOutlined />
            Preview
          </Space>
        ),
        disabled: !safeValue.enUS,
        children: (
          <div style={{ padding: "16px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
            <div style={{ marginBottom: "8px" }}>
              <Text strong>WoW HTML Output:</Text>
            </div>
            <div
              style={{
                padding: "12px",
                backgroundColor: "#fff",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {getPreviewContent()}
            </div>
            {isMarkdownContent && (
              <div style={{ marginTop: "8px", fontSize: "12px" }}>
                <Text type="secondary">
                  This HTML will be used in WoW's SimpleHTML frames. WoW color codes (|cff...|r) 
                  and textures (|T...|t) will render properly in-game.
                </Text>
              </div>
            )}
          </div>
        ),
      },
    ];

    return (
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        items={tabItems}
      />
    );
  };

  return (
    <>
      <Form.Item
        label={
          <span>
            <ReactCountryFlag
              countryCode={languageCountryCodes.enUS}
              svg
              style={{
                width: "1.5em",
                height: "1.5em",
                marginRight: 6,
              }}
            />{" "}
            English (enUS)
          </span>
        }
        required
      >
        {renderMainEditor()}
      </Form.Item>
      <Collapse
        style={{ marginTop: 16 }}
        items={[
          {
            key: "translations",
            label: "Other Translations",
            children: (
              <div
                style={{
                  maxHeight: 350,
                  overflowY: "auto",
                  paddingRight: 8,
                }}
              >
                {Object.keys(defaultTranslations)
                  .filter((lang) => lang !== "enUS")
                  .map((lang) => {
                    const value = safeValue.translations[lang as Language];
                    const isMissing = !value;
                    const countryCode = languageCountryCodes[lang as Language];
                    return (
                      <Form.Item
                        key={lang}
                        label={
                          <span>
                            <ReactCountryFlag
                              countryCode={countryCode}
                              svg
                              style={{
                                width: "1.5em",
                                height: "1.5em",
                                marginRight: 6,
                              }}
                            />{" "}
                            {languageNames[lang as Language]} ({lang})
                          </span>
                        }
                        validateStatus={isMissing ? "warning" : undefined}
                        help={isMissing ? "Translation missing" : undefined}
                      >
                        <Input.TextArea
                          value={value}
                          onChange={(e) =>
                            handleChange(lang as Language, e.target.value)
                          }
                          placeholder={`Enter label in ${
                            languageNames[lang as Language]
                          }`}
                          autoSize={
                            focusedField === lang
                              ? {
                                  minRows: 6,
                                  maxRows: 12,
                                }
                              : {
                                  minRows: 1,
                                  maxRows: 1,
                                }
                          }
                          onFocus={() => setFocusedField(lang)}
                          onBlur={() => setFocusedField(null)}
                          style={{
                            resize: "vertical",
                            whiteSpace: "pre-line",
                            overflowX: "hidden",
                            overflowY: "hidden",
                          }}
                        />
                      </Form.Item>
                    );
                  })}
              </div>
            ),
          },
        ]}
      />
    </>
  );
};

export default LocaleEditor;
