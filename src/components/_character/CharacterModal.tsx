import React from "react";
import { Modal, Form, Input, Select, Divider, Row, Col } from "antd";
import { dbRepository, tableNames } from "../../database/dbcontext";
import { 
    Collection, 
    DB_Collection, 
    Character, 
    Faction, 
    Locale 
} from "../../database/models";
import { Timelines } from "../../constants";
import TagSelect from "../_shared/TagSelect";
import LocaleEditor from "../_shared/LocaleEditor";

export interface CharacterModalProps {
    visible: boolean;
    characterToEdit?: Character;
    onOk: (values: any) => void;
    onCancel: () => void;
    confirmLoading?: boolean;
}

export interface EditableCharacter {
    id: number;
    name: string;
    biography: Locale;
    label: Locale;
    timeline: number;
    factions: number[];
    collection?: number;
}

const CharacterModal: React.FC<CharacterModalProps> = ({
    visible,
    characterToEdit,
    onOk,
    onCancel,
    confirmLoading = false,
}) => {
    const [form] = Form.useForm();
    const dbContext = React.useContext(dbRepository);
    const [collections, setCollections] = React.useState<Collection[]>([]);
    const [factions, setFactions] = React.useState<Faction[]>([]);
    const [factionOptions, setFactionOptions] = React.useState<
        { value: number; label: string }[]
    >([]);
    const [editableCharacterState, setEditableCharacterState] = 
        React.useState<any>(undefined);

    React.useEffect(() => {
        async function fetchCollections() {
            const collectionList = await dbContext.getAll(
                tableNames.collections
            );
            const mappedCollections =
                await dbContext.mappers.collections.mapFromDbArray(
                    collectionList as DB_Collection[]
                );
            setCollections(mappedCollections);
        }
        async function fetchFactions() {
            const factionList = await dbContext.getAll(tableNames.factions);
            const mappedFactions =
                await dbContext.mappers.factions.mapFromDbArray(
                    factionList as any[]
                );
            setFactions(mappedFactions);
        }
        fetchCollections();
        fetchFactions();
    }, [dbContext]);

    React.useEffect(() => {        let editableCharacter: EditableCharacter | undefined = characterToEdit
            ? {
                  id: characterToEdit.id,
                  name: characterToEdit.name ?? "",
                  biography: characterToEdit.biography ?? {},
                  label: characterToEdit.label ?? {},
                  timeline: characterToEdit.timeline ?? undefined,
                  collection:
                      characterToEdit.collection && characterToEdit.collection.id
                          ? characterToEdit.collection.id
                          : undefined,
                  factions: Array.isArray(characterToEdit.factions)
                      ? characterToEdit.factions.map((f: any) =>
                            typeof f === "object" && f !== null ? f.id : f
                        )
                      : [],
              }
            : undefined;

        setEditableCharacterState(editableCharacter);
    }, [characterToEdit]);

    React.useEffect(() => {
        if (visible) {
            form.setFieldsValue(editableCharacterState || {});

            if (editableCharacterState?.factions && factions.length > 0) {
                setFactionOptions(
                    factions
                        .filter((f) =>
                            editableCharacterState.factions.includes(f.id)
                        )
                        .map((f) => ({ value: f.id, label: f.name }))
                );
            }
        }
    }, [editableCharacterState, visible, factions]);

    const handleFactionSearch = async (search: string) => {
        if (!search) {
            setFactionOptions([]);
            return;
        }
        const factionList = await dbContext.getAll(tableNames.factions);
        const mappedFactions = await dbContext.mappers.factions.mapFromDbArray(
            factionList as any[]
        );
        setFactionOptions(
            mappedFactions
                .filter((f) =>
                    f.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((f) => ({ value: f.id, label: f.name }))
        );
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            // Set the full collection object for parent
            let selectedCollection = values.collection;
            if (typeof selectedCollection === "number") {
                selectedCollection = collections.find(
                    (c) => c.id === selectedCollection
                );
            } else if (selectedCollection && selectedCollection.id) {
                selectedCollection = collections.find(
                    (c) => c.id === selectedCollection.id
                );
            }
            
            // Map selected ids to full objects for factions
            const selectedFactions = (values.factions || [])
                .map((id: number) => factions.find((f) => f.id === id))
                .filter(Boolean);
                
            onOk({
                ...values,
                collection: selectedCollection,
                factions: selectedFactions,
            });
        } catch (err) {
            // Validation failed
        }
    };

    return (
        <Modal
            title={characterToEdit ? "Edit Character" : "Add New Character"}
            open={visible}
            onOk={handleOk}
            onCancel={onCancel}
            okText={characterToEdit ? "Save" : "Create"}
            cancelText="Cancel"
            confirmLoading={confirmLoading}
            width={700}
            styles={{ body: { padding: 32 } }}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={editableCharacterState}
            >
                <Divider
                    orientation="left"
                    style={{ fontSize: 18, marginBottom: 24 }}
                >
                    Basic Info
                </Divider>                <Row gutter={24} style={{ marginBottom: 12 }}>
                    <Col span={24}>
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[
                                {
                                    required: true,
                                    message: "Please input the character name!",
                                },
                            ]}
                        >
                            <Input
                                placeholder="Character name"
                                allowClear
                                size="large"
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={24} style={{ marginBottom: 12 }}>
                    <Col span={24}>
                        <Form.Item
                            label="Timeline"
                            name="timeline"
                            rules={[
                                {
                                    required: true,
                                    message: "Please input the timeline!",
                                },
                            ]}
                        >
                            <Select
                                options={Timelines.map((tl) => ({
                                    value: tl.id,
                                    label: tl.name,
                                }))}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    label="Collection"
                    name="collection"
                    style={{ marginBottom: 24 }}
                >
                    <Select
                        showSearch
                        placeholder="Select collection"
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                            (option?.label ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase())
                        }
                        options={collections.map((c) => ({
                            value: c.id,
                            label: c.name,
                        }))}
                        size="large"
                    />
                </Form.Item>
                <Divider
                    orientation="left"
                    style={{ fontSize: 18, margin: "32px 0 24px 0" }}
                >
                    Associations
                </Divider>
                <Row gutter={24} style={{ marginBottom: 12 }}>
                    <Col span={24}>
                        <Form.Item
                            name="factions"
                            valuePropName="value"
                            trigger="onChange"
                        >
                            <TagSelect
                                label="Factions"
                                options={factionOptions}
                                color="blue"
                                placeholder="Select factions"
                                onSearch={handleFactionSearch}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Divider
                    orientation="left"
                    style={{ fontSize: 18, margin: "32px 0 24px 0" }}
                >
                    Label
                </Divider>                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item
                            label="Label"
                            name="label"
                            rules={[
                                {
                                    required: true,
                                    message: "Please input the label!",
                                },
                            ]}
                            valuePropName="value"
                            trigger="onChange"
                        >
                            <LocaleEditor />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="Biography"
                            name="biography"
                            valuePropName="value"
                            trigger="onChange"
                        >
                            <LocaleEditor />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default CharacterModal;
