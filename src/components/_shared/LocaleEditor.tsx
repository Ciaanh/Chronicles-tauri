import React, { useState } from "react";
import { Input, Form, Collapse } from "antd";
import { Locale } from "../../database/models";
import { Language } from "../../constants";
import { EnumDictionary } from "../../database/models/EnumDictionary";
import ReactCountryFlag from "react-country-flag";

const { Panel } = Collapse;

interface LocaleEditorProps {
    value?: Locale;
    onChange?: (value: Locale) => void;
}

const defaultTranslations: EnumDictionary<Language, string> = {
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
};

const languageNames: Record<Language, string> = {
    enUS: "English",
    deDE: "German",
    esES: "Spanish (EU)",
    esMX: "Spanish (MX)",
    frFR: "French",
    itIT: "Italian",
    ptBR: "Portuguese (BR)",
    ruRU: "Russian",
    koKR: "Korean",
    zhCN: "Chinese (CN)",
    zhTW: "Chinese (TW)",
};

const languageCountryCodes: Record<Language, string> = {
    enUS: "US",
    deDE: "DE",
    esES: "ES",
    esMX: "MX",
    frFR: "FR",
    itIT: "IT",
    ptBR: "BR",
    ruRU: "RU",
    koKR: "KR",
    zhCN: "CN",
    zhTW: "TW",
};

const LocaleEditor: React.FC<LocaleEditorProps> = ({ value, onChange }) => {
    // Ensure all required fields are present
    const safeValue: Locale = {
        id: value?.id ?? -1,
        ishtml: value?.ishtml ?? false,
        enUS: value?.enUS ?? "",
        translations: { ...defaultTranslations, ...(value?.translations || {}) },
    };

    // Track which field is focused for expansion
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleChange = (lang: Language, val: string) => {
        if (lang === Language.enUS) {
            const newValue: Locale = { ...safeValue, enUS: val };
            if (onChange) onChange(newValue);
        } else {
            const newTranslations = { ...safeValue.translations, [lang]: val };
            // Remove empty/null translations except enUS
            const cleanedTranslations = Object.fromEntries(
                Object.entries(newTranslations).filter(
                    ([key, value]) => key === 'enUS' || (value !== null && value !== undefined && value !== "")
                )
            ) as EnumDictionary<Language, string>;
            const newValue: Locale = { ...safeValue, translations: cleanedTranslations };
            if (onChange) onChange(newValue);
        }
    };

    return (
        <>
            <Form.Item label={<span><ReactCountryFlag countryCode={languageCountryCodes.enUS} svg style={{ width: '1.5em', height: '1.5em', marginRight: 6 }} /> English (enUS)</span>} required>
                <Input.TextArea
                    value={safeValue.enUS}
                    onChange={e => handleChange(Language.enUS, e.target.value)}
                    placeholder="Enter label in English"
                    autoSize={focusedField === 'enUS' ? { minRows: 6, maxRows: 12 } : { minRows: 1, maxRows: 1 }}
                    onFocus={() => setFocusedField('enUS')}
                    onBlur={() => setFocusedField(null)}
                    style={{ resize: 'vertical', whiteSpace: 'pre-line', overflow: 'hidden' }}
                />
            </Form.Item>
            <Collapse
                style={{ marginTop: 16 }}
                items={[{
                    key: 'translations',
                    label: 'Other Translations',
                    children: (
                        <div style={{ maxHeight: 350, overflowY: 'auto', paddingRight: 8 }}>
                            {Object.keys(defaultTranslations)
                                .filter(lang => lang !== 'enUS')
                                .map(lang => {
                                    const value = safeValue.translations[lang as Language];
                                    const isMissing = !value;
                                    const countryCode = languageCountryCodes[lang as Language];
                                    return (
                                        <Form.Item
                                            key={lang}
                                            label={<span><ReactCountryFlag countryCode={countryCode} svg style={{ width: '1.5em', height: '1.5em', marginRight: 6 }} /> {languageNames[lang as Language]} ({lang})</span>}
                                            validateStatus={isMissing ? "warning" : undefined}
                                            help={isMissing ? "Translation missing" : undefined}
                                        >
                                            <Input.TextArea
                                                value={value}
                                                onChange={e => handleChange(lang as Language, e.target.value)}
                                                placeholder={`Enter label in ${languageNames[lang as Language]}`}
                                                autoSize={focusedField === lang ? { minRows: 6, maxRows: 12 } : { minRows: 1, maxRows: 1 }}
                                                onFocus={() => setFocusedField(lang)}
                                                onBlur={() => setFocusedField(null)}
                                                style={{ resize: 'vertical', whiteSpace: 'pre-line', overflow: 'hidden' }}
                                            />
                                        </Form.Item>
                                    );
                                })}
                        </div>
                    )
                }]}
            />
        </>
    );
};

export default LocaleEditor;
