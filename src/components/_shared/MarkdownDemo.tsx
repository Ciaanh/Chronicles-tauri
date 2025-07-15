import React, { useState } from "react";
import { Card, Input, Typography, Space, Divider, Tabs, Checkbox } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import { MarkdownConverter } from "../../_utils/markdownConverter";
import { EyeOutlined, EditOutlined, SettingOutlined } from "@ant-design/icons";
import { defaultTranslations } from "../../constants/language";

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

const demoMarkdown = `# LibMarkdown Demo

This is a demonstration of Markdown that produces HTML suitable for *World of Warcraft*'s **SimpleHTML**.

## Features Supported

### Headers
Support for multiple header levels:

# Header 1
## Header 2  
### Header 3

Alternative syntax:
Header 1
========

Header 2
--------

### Text Formatting
*Italic text* and **bold text** are supported.

### Lists

Unordered lists:
* Item one
+ Item two  
- Item three

Ordered lists:
1. First item
2. Second item
3. Third item

Roman numerals (LibMarkdown extension):
i. First
ii. Second  
iii. Third

Letter lists (LibMarkdown extension):
a) Alpha
b) Beta
c) Gamma

### Code

Inline \`code\` is supported.

Code blocks with triple backticks:
\`\`\`
local function example()
    print("Hello World!")
end
\`\`\`

Or indented code blocks:

    local indented = "code block"
    print(indented)

### Links and Images

[Link to Wowhead](https://www.wowhead.com)

![Sap Icon](Interface\\\\ICONS\\\\ABILITY_SAP.PNG "Sap ability icon" 32x32 center)

### Blockquotes

> This is a blockquote.
> It can span multiple lines.

### WoW Raid Targeting Icons

Use raid targeting icons in your text:
{star} {circle} {diamond} {triangle} {moon} {square} {cross} {skull}

You can also use aliases:
{Star} {Coin} {Diamond} {Triangle} {Moon} {Square} {X} {Skull}

### HTML Entities

Non-breaking spaces: word&nbsp;word
Em space: word&emsp;word
En space: word&ensp;word
Thin space: word&thinsp;word

### List Separators

Use a caret on its own line to separate consecutive lists:

1. First list item
2. Second list item
^

a) Different list item
b) Another different item
`;

const demoHtml = `<html><body>
<h1>Pre-formatted HTML Example</h1>
<p>This content is already in WoW HTML format and will be exported as-is.</p>

<h2>Color Codes</h2>
<p>You can use |cffff0000red text|r and |cff00ff00green text|r directly.</p>

<h3>Textures and Icons</h3>
<p>Raid targeting: |TInterface\\TARGETINGFRAME\\UI-RAIDTARGETINGICON_1.PNG:0|t Star Icon</p>
<p>Custom spacing: word|TInterface\\Store\\ServicesAtlas:0:0.25:0:0:1024:1024:1023:1024:1023:1024|tword</p>

<h2>Paragraphs and Breaks</h2>
<p>First paragraph with some content.</p><br />
<p>Second paragraph after a break.</p>

<h3>Lists (Pseudo)</h3>
<p>|cff00dddd*|r First item<br />|cff00dddd*|r Second item<br />|cff00dddd*|r Third item</p><br />

<h2>Links</h2>
<p>Visit <a href="https://www.wowhead.com">Wowhead</a> for more information.</p>

<h3>Images</h3>
<img src="Interface\\ICONS\\ABILITY_SAP.PNG" width="32" height="32" alt="Sap" />

</body></html>`;

export const MarkdownDemo: React.FC = () => {
  const [markdownText, setMarkdownText] = useState(demoMarkdown);
  const [htmlText, setHtmlText] = useState(demoHtml);
  const [activeTab, setActiveTab] = useState("demo");
  const [contentType, setContentType] = useState<'markdown' | 'html'>('markdown');

  const currentText = contentType === 'markdown' ? markdownText : htmlText;
  const convertedHtml = contentType === 'markdown' ? MarkdownConverter.toHtml(markdownText) : htmlText;
  const isMarkdown = contentType === 'markdown' && MarkdownConverter.isMarkdown({ 
    id: -1, 
    ishtml: false, 
    enUS: markdownText, 
    translations: defaultTranslations
  });
  const isHtml = contentType === 'html' || MarkdownConverter.isHtml(currentText);

  const tabItems = [
    {
      key: "demo",
      label: (
        <Space>
          <EyeOutlined />
          Demo
        </Space>
      ),        children: (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Card>
              <Title level={4}>Content Input</Title>
              <Space style={{ marginBottom: 16 }}>
                <Checkbox
                  checked={contentType === 'markdown'}
                  onChange={(e: CheckboxChangeEvent) => setContentType(e.target.checked ? 'markdown' : 'html')}
                >
                  Markdown Mode
                </Checkbox>
                <Checkbox
                  checked={contentType === 'html'}
                  onChange={(e: CheckboxChangeEvent) => setContentType(e.target.checked ? 'html' : 'markdown')}
                >
                  HTML Mode
                </Checkbox>
              </Space>
              <TextArea
                value={currentText}
                onChange={(e) => {
                  if (contentType === 'markdown') {
                    setMarkdownText(e.target.value);
                  } else {
                    setHtmlText(e.target.value);
                  }
                }}
                rows={20}
                style={{ fontFamily: "monospace" }}
                placeholder={
                  contentType === 'markdown'
                    ? "Enter Markdown content here..."
                    : "Enter WoW HTML content here..."
                }
              />
            </Card>
            
            <Card>
              <Title level={4}>
                {contentType === 'markdown' ? 'WoW HTML Output' : 'HTML Content'}
              </Title>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Space>
                  <Text type="secondary">
                    Content type: {contentType === 'markdown' ? 'Markdown' : 'HTML'}
                  </Text>
                  <Text type="secondary">
                    Markdown detected: {isMarkdown ? "Yes" : "No"}
                  </Text>
                  <Text type="secondary">
                    HTML detected: {isHtml ? "Yes" : "No"}
                  </Text>
                </Space>
                <div style={{ 
                  background: "#f5f5f5", 
                  padding: "16px", 
                  borderRadius: "6px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                  maxHeight: "400px",
                  overflow: "auto"
                }}>
                  {convertedHtml}
                </div>
              </Space>
            </Card>
          </Space>
        ),
    },
    {
      key: "config",
      label: (
        <Space>
          <SettingOutlined />
          Configuration
        </Space>
      ),
      children: (
        <Card>
          <Title level={4}>Current Configuration</Title>
          <Paragraph>
            <Text code style={{ whiteSpace: "pre-wrap" }}>
              {MarkdownConverter.showConfig()}
            </Text>
          </Paragraph>
        </Card>
      ),
    },
    {
      key: "usage",
      label: (
        <Space>
          <EditOutlined />
          Usage Guide
        </Space>
      ),
      children: (
        <Card>
          <Title level={4}>How to Use MarkdownConverter</Title>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Paragraph>
              <Title level={5}>Basic Conversion</Title>
              <Text code>
                const html = MarkdownConverter.toHtml(markdownText);
              </Text>
            </Paragraph>
            
            <Paragraph>
              <Title level={5}>Check if Content is Markdown</Title>
              <Text code>
                const isMarkdown = MarkdownConverter.isMarkdown(locale);
              </Text>
            </Paragraph>
            
            <Paragraph>
              <Title level={5}>Process Locale with Auto-Detection</Title>
              <Text code>
                const processedLocale = MarkdownConverter.processLocale(locale);
              </Text>
              <div style={{ marginTop: 8, fontSize: "12px" }}>
                <Text type="secondary">
                  Automatically detects content type and processes accordingly:
                  <br />• Markdown → converts to WoW HTML
                  <br />• HTML → preserves as-is 
                  <br />• Plain text → no conversion
                </Text>
              </div>
            </Paragraph>
            
            <Paragraph>
              <Title level={5}>Check Content Types</Title>
              <Text code>
                const isMarkdown = MarkdownConverter.isMarkdown(locale);<br />
                const isHtml = MarkdownConverter.isHtml(content);
              </Text>
            </Paragraph>
            
            <Paragraph>
              <Title level={5}>Process Chapters</Title>
              <Text code>
                const processedChapter = MarkdownConverter.processChapter(chapter);
              </Text>
            </Paragraph>
            
            <Divider />
            
            <Paragraph>
              <Title level={5}>Integration</Title>
              <Text>
                The MarkdownConverter is automatically integrated into the Chronicles system:
              </Text>
              <ul>
                <li>LocaleUtils.createOrUpdateLocale() processes markdown automatically</li>
                <li>The UI components detect markdown and show appropriate previews</li>
                <li>Database mappers handle conversion when saving/loading</li>
              </ul>
            </Paragraph>
          </Space>
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>Chronicles Markdown Converter Demo</Title>
      <Paragraph>
        This demo showcases the LibMarkdown-compatible markdown to HTML converter 
        for World of Warcraft's SimpleHTML system.
      </Paragraph>
      
      <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
    </div>
  );
};

export default MarkdownDemo;
