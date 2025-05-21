import React from "react";
import { Input, Form } from "antd";
import { Locale } from "../../database/models";
import { Language } from "../../constants";
import { EnumDictionary } from "../../database/models/EnumDictionary";

interface LabelEditorProps {
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

const LabelEditor: React.FC<LabelEditorProps> = ({ value, onChange }) => {
    // Ensure all required fields are present
    const safeValue: Locale = {
        id: value?.id ?? -1,
        ishtml: value?.ishtml ?? false,
        enUS: value?.enUS ?? "",
        translations: { ...defaultTranslations, ...(value?.translations || {}) },
    };

    const handleChange = (lang: Language, val: string) => {
        if (lang === Language.enUS) {
            const newValue: Locale = { ...safeValue, enUS: val };
            if (onChange) onChange(newValue);
        } else {
            const newTranslations = { ...safeValue.translations, [lang]: val };
            const newValue: Locale = { ...safeValue, translations: newTranslations };
            if (onChange) onChange(newValue);
        }
    };

    return (
        <>
            <Form.Item label="English (enUS)" required>
                <Input
                    value={safeValue.enUS}
                    onChange={e => handleChange(Language.enUS, e.target.value)}
                    placeholder="Enter label in English"
                />
            </Form.Item>
            {/* Example: Add more languages as needed */}
            {/* <Form.Item label="French (frFR)">
                <Input
                    value={safeValue.translations.frFR}
                    onChange={e => handleChange(Language.frFR, e.target.value)}
                    placeholder="Entrer le label en français"
                />
            </Form.Item> */}
        </>
    );
};

export default LabelEditor;
