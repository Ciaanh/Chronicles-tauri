import React, { useState } from "react";
import { Select, Tag } from "antd";

interface TagSelectProps {
    label: string;
    options: { value: number; label: string }[];
    color?: string;
    placeholder?: string;
    onSearch?: (search: string) => void;
    value?: number[];
    onChange?: (value: number[]) => void;
}

const TagSelect: React.FC<TagSelectProps> = ({
    label,
    value = [],
    options,
    color = "blue",
    placeholder,
    onChange,
    onSearch,
}) => {
    const [searchValue, setSearchValue] = useState("");

    // Custom notFoundContent logic
    let notFoundContent = null;
    if (searchValue.trim() === "") {
        notFoundContent = <span>Type to search...</span>;
    } else if (options.length === 0) {
        notFoundContent = <span>No data</span>;
    }

    return (
        <div style={{ marginBottom: 16 }}>
            <span style={{ display: "block", marginBottom: 4 }}>{label}</span>
            <Select
                mode="multiple"
                tagRender={({ label, closable, onClose }) => (
                    <Tag
                        color={color}
                        closable={closable}
                        onClose={onClose}
                        style={{ marginRight: 3 }}
                    >
                        {label}
                    </Tag>
                )}
                value={value}
                options={options}
                placeholder={placeholder}
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                onChange={onChange}
                onSearch={val => {
                    setSearchValue(val);
                    onSearch && onSearch(val);
                }}
                notFoundContent={notFoundContent}
                style={{ width: '100%' }}
            />
        </div>
    );
};

export default TagSelect;
