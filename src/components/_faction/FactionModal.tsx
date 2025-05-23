import React from "react";
import { Modal, Form, Input, Select, Divider, Row, Col } from "antd";
import { dbRepository, tableNames } from "../../database/dbcontext";
import {
    Collection,
    DB_Collection,
    Faction,
    Locale,
    Chapter,
} from "../../database/models";
import { Timelines } from "../../constants";
import LocaleEditor from "../_shared/LocaleEditor";
import ChaptersEditor from "../_shared/ChaptersEditor";

export interface FactionModalProps {
    visible: boolean;
    factionToEdit?: Faction;
    onOk: (values: any) => void;
    onCancel: () => void;
    confirmLoading?: boolean;
}

export interface EditableFaction {
    id: number;
    name: string;
    // description: Locale; // Replaced with chapters
    chapters: Chapter[];
    label: Locale;
    timeline: number;
    collection?: number;
}

const FactionModal: React.FC<FactionModalProps> = ({
    visible,
    factionToEdit,
    onOk,
    onCancel,
    confirmLoading = false,
}) => {
    const [form] = Form.useForm();
    const dbContext = React.useContext(dbRepository);
    const [collections, setCollections] = React.useState<Collection[]>([]);
    const [editableFactionState, setEditableFactionState] =
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
        fetchCollections();
    }, [dbContext]);
    React.useEffect(() => {
        let editableFaction: EditableFaction | undefined = factionToEdit
            ? {
                  id: factionToEdit.id,
                  name: factionToEdit.name ?? "",
                  // description: factionToEdit.description ?? {}, // Replaced with chapters
                  chapters: factionToEdit.chapters ?? [],
                  label: factionToEdit.label ?? {},
                  timeline: factionToEdit.timeline ?? undefined,
                  collection:
                      factionToEdit.collection && factionToEdit.collection.id
                          ? factionToEdit.collection.id
                          : undefined,
              }
            : undefined;

        setEditableFactionState(editableFaction);
    }, [factionToEdit]);

    React.useEffect(() => {
        if (visible) {
            form.setFieldsValue(editableFactionState || {});
        }
    }, [editableFactionState, visible]);

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

            onOk({
                ...values,
                collection: selectedCollection,
            });
        } catch (err) {
            // Validation failed
        }
    };

    return (
        <Modal
            title={factionToEdit ? "Edit Faction" : "Add New Faction"}
            open={visible}
            onOk={handleOk}
            onCancel={onCancel}
            okText={factionToEdit ? "Save" : "Create"}
            cancelText="Cancel"
            confirmLoading={confirmLoading}
            width={700}
            styles={{ body: { padding: 32 } }}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={editableFactionState}
            >
                <Divider
                    orientation="left"
                    style={{ fontSize: 18, marginBottom: 24 }}
                >
                    Basic Info
                </Divider>{" "}
                <Row gutter={24} style={{ marginBottom: 12 }}>
                    <Col span={24}>
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[
                                {
                                    required: true,
                                    message: "Please input the faction name!",
                                },
                            ]}
                        >
                            <Input
                                placeholder="Faction name"
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
                    Label
                </Divider>{" "}
                <Row gutter={24}>
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
                    </Col>{" "}
                    <Col span={12}>
                        <Form.Item
                            label="Description"
                            name="chapters"
                            valuePropName="value"
                            trigger="onChange"
                        >
                            <ChaptersEditor />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default FactionModal;
