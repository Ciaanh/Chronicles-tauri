import React from "react";
import { Modal, Form, Input, InputNumber, Select } from "antd";
import { EventTypes, Timelines } from "../../constants";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { Collection, DB_Collection, Character, Faction } from "../../database/models";
import TagSelect from "../_shared/TagSelect";
import ChaptersEditor from "../_shared/ChaptersEditor";

export interface EventModalProps {
    visible: boolean;
    initialValues?: any;
    onOk: (values: any) => void;
    onCancel: () => void;
    confirmLoading?: boolean;
}

const EventModal: React.FC<EventModalProps> = ({
    visible,
    initialValues,
    onOk,
    onCancel,
    confirmLoading = false,
}) => {
    const [form] = Form.useForm();
    const dbContext = React.useContext(dbRepository);
    const [collections, setCollections] = React.useState<Collection[]>([]);
    const [characters, setCharacters] = React.useState<Character[]>([]);
    const [factions, setFactions] = React.useState<Faction[]>([]);
    const [characterOptions, setCharacterOptions] = React.useState<{ value: number; label: string }[]>([]);
    const [factionOptions, setFactionOptions] = React.useState<{ value: number; label: string }[]>([]);

    React.useEffect(() => {
        async function fetchCollections() {
            const collectionList = await dbContext.getAll(tableNames.collections);
            const mappedCollections = await dbContext.mappers.collections.mapFromDbArray(collectionList as DB_Collection[]);
            setCollections(mappedCollections);
        }
        async function fetchCharacters() {
            const characterList = await dbContext.getAll(tableNames.characters);
            const mappedCharacters = await dbContext.mappers.characters.mapFromDbArray(characterList as any[]);
            setCharacters(mappedCharacters);
        }
        async function fetchFactions() {
            const factionList = await dbContext.getAll(tableNames.factions);
            const mappedFactions = await dbContext.mappers.factions.mapFromDbArray(factionList as any[]);
            setFactions(mappedFactions);
        }
        fetchCollections();
        fetchCharacters();
        fetchFactions();
    }, [dbContext]);

    React.useEffect(() => {
        if (visible) {
            // Patch initialValues to set collection.id for Select
            const patchedValues = { ...initialValues };
            if (initialValues && initialValues.collection && initialValues.collection.id) {
                patchedValues.collection = { id: initialValues.collection.id };
            }
            form.setFieldsValue(patchedValues || {});
        } else {
            form.resetFields();
        }
    }, [visible, initialValues, form]);

    const handleCharacterSearch = async (search: string) => {
        if (!search) {
            setCharacterOptions([]);
            return;
        }
        const characterList = await dbContext.getAll(tableNames.characters);
        const mappedCharacters = await dbContext.mappers.characters.mapFromDbArray(characterList as any[]);
        setCharacterOptions(
            mappedCharacters
                .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
                .map(c => ({ value: c.id, label: c.name }))
        );
    };

    const handleFactionSearch = async (search: string) => {
        if (!search) {
            setFactionOptions([]);
            return;
        }
        const factionList = await dbContext.getAll(tableNames.factions);
        const mappedFactions = await dbContext.mappers.factions.mapFromDbArray(factionList as any[]);
        setFactionOptions(
            mappedFactions
                .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
                .map(f => ({ value: f.id, label: f.name }))
        );
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            // Set the full collection object for parent
            let selectedCollection = values.collection;
            if (typeof selectedCollection === 'number') {
                selectedCollection = collections.find(c => c.id === selectedCollection);
            } else if (selectedCollection && selectedCollection.id) {
                selectedCollection = collections.find(c => c.id === selectedCollection.id);
            }
            // Map selected ids to full objects for characters and factions
            const selectedFactions = (values.factions || []).map((id: number) => factions.find(f => f.id === id)).filter(Boolean);
            const selectedCharacters = (values.characters || []).map((id: number) => characters.find(c => c.id === id)).filter(Boolean);
            onOk({ ...values, collection: selectedCollection, factions: selectedFactions, characters: selectedCharacters });
        } catch (err) {
            // Validation failed
        }
    };

    return (
        <Modal
            title={initialValues ? "Edit Event" : "Add New Event"}
            open={visible}
            onOk={handleOk}
            onCancel={onCancel}
            okText={initialValues ? "Save" : "Create"}
            cancelText="Cancel"
            confirmLoading={confirmLoading}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label="Name"
                    name="name"
                    rules={[{ required: true, message: 'Please input the event name!' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="Year Start"
                    name="yearStart"
                    rules={[{ required: true, message: 'Please input the start year!' }]}
                >
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                    label="Year End"
                    name="yearEnd"
                    rules={[{ required: true, message: 'Please input the end year!' }]}
                >
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                    label="Order"
                    name="order"
                    rules={[{ required: true, message: 'Please input the order!' }]}
                >
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                    label="Event Type"
                    name="eventType"
                    rules={[{ required: true, message: 'Please input the event type!' }]}
                >
                    <Select
                        options={EventTypes.map(type => ({ value: type.id, label: type.name }))}
                    />
                </Form.Item>
                <Form.Item
                    label="Timeline"
                    name="timeline"
                    rules={[{ required: true, message: 'Please input the timeline!' }]}
                >
                    <Select
                        options={Timelines.map(tl => ({ value: tl.id, label: tl.name }))}
                    />
                </Form.Item>
                <Form.Item
                    label="Collection"
                    name={["collection", "id"]}
                    rules={[{ required: true, message: 'Please select a collection!' }]}
                >
                    <Select
                        options={collections.map(c => ({ value: c.id, label: c.name }))}
                        showSearch
                        placeholder="Select a collection"
                        optionFilterProp="label"
                    />
                </Form.Item>
                <Form.Item label="Factions" name="factions">
                    <TagSelect
                        label="Factions"
                        value={form.getFieldValue("factions") || []}
                        options={factionOptions}
                        color="blue"
                        placeholder="Select factions"
                        onChange={val => form.setFieldsValue({ factions: val })}
                        onSearch={handleFactionSearch}
                    />
                </Form.Item>
                <Form.Item label="Characters" name="characters">
                    <TagSelect
                        label="Characters"
                        value={form.getFieldValue("characters") || []}
                        options={characterOptions}
                        color="purple"
                        placeholder="Select characters"
                        onChange={val => form.setFieldsValue({ characters: val })}
                        onSearch={handleCharacterSearch}
                    />
                </Form.Item>
                <Form.Item
                    label="Link"
                    name="link"
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="Label (enUS)"
                    name={["label", "enUS"]}
                    rules={[{ required: true, message: 'Please input the label (enUS)!' }]}
                >
                    <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item label="Chapters" required>
                    <ChaptersEditor
                        value={form.getFieldValue("chapters") || []}
                        onChange={chs => form.setFieldsValue({ chapters: chs })}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default EventModal;
