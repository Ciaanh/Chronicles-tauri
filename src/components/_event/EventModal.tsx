import React from "react";
import { Modal, Form, Input, InputNumber, Select } from "antd";
import { EventTypes, Timelines } from "../../constants";

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

    React.useEffect(() => {
        if (visible) {
            form.setFieldsValue(initialValues || {});
        } else {
            form.resetFields();
        }
    }, [visible, initialValues, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            onOk(values);
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
            </Form>
        </Modal>
    );
};

export default EventModal;
