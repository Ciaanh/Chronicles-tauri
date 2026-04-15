import { useContext } from "react";
import { Table, Tag, Typography } from "antd";
import { dbRepository } from "../../database/dbcontext";
import type { HistoryEntry, HistoryAction } from "../../database/dbcontext";

const { Title } = Typography;

const ACTION_COLOR: Record<HistoryAction, string> = {
    add: "green",
    update: "blue",
    remove: "red",
};

const HistoryTab: React.FC = () => {
    const dbContext = useContext(dbRepository);

    return (
        <div style={{ padding: "16px 0" }}>
            <Title level={4}>Modification History</Title>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                Last 100 write operations this session. Cleared when a new database is loaded.
            </Typography.Text>
            <Table<HistoryEntry>
                rowKey={(r) => `${r.timestamp.getTime()}-${r.id}`}
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: true }}
                dataSource={dbContext.history}
                locale={{ emptyText: "No modifications yet." }}
                columns={[
                    {
                        title: "Time",
                        dataIndex: "timestamp",
                        width: 180,
                        render: (ts: Date) =>
                            ts.toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            }),
                    },
                    {
                        title: "Action",
                        dataIndex: "action",
                        width: 90,
                        render: (action: HistoryAction) => (
                            <Tag color={ACTION_COLOR[action]}>
                                {action.toUpperCase()}
                            </Tag>
                        ),
                    },
                    {
                        title: "Table",
                        dataIndex: "table",
                        width: 120,
                    },
                    {
                        title: "ID",
                        dataIndex: "id",
                        width: 80,
                    },
                ]}
            />
        </div>
    );
};

export default HistoryTab;
