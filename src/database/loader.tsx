import "../_style/loader.scss";

import { useContext, useEffect } from "react";
import { dbRepository } from "./dbcontext";
import { Alert, Button, Card, Flex, List, Space, Typography } from "antd";
import { useRecentFiles } from "../_utils/useRecentFiles";
import { FolderOpenOutlined, FileAddOutlined } from "@ant-design/icons";

function Loader() {
    const dbContext = useContext(dbRepository);
    const { recentFiles, addRecentFile, removeRecentFile } = useRecentFiles();

    // Record path in recent files whenever a DB is successfully opened
    useEffect(() => {
        if (dbContext.lastLoadedPath) {
            addRecentFile(dbContext.lastLoadedPath);
        }
    }, [dbContext.lastLoadedPath]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Card className="centeredCard">
            <Flex className="flexContainer" justify="center" align="center" vertical>
                <Typography.Title>Chronicles</Typography.Title>
                <Typography.Paragraph>
                    Welcome to the Chronicles database manager
                </Typography.Paragraph>
                <Space>
                    <Button
                        type="primary"
                        loading={dbContext.loading}
                        icon={<FolderOpenOutlined />}
                        onClick={() => dbContext.load()}
                    >
                        {dbContext.loading ? "Loading..." : "Open existing DB"}
                    </Button>
                    <Button
                        loading={dbContext.loading}
                        icon={<FileAddOutlined />}
                        onClick={() => dbContext.createNew()}
                    >
                        Create new DB
                    </Button>
                </Space>
                {dbContext.loadError && (
                    <Alert
                        type="error"
                        message="Failed to load database"
                        description={dbContext.loadError}
                        showIcon
                        style={{ marginTop: 16, textAlign: "left" }}
                    />
                )}
                {recentFiles.length > 0 && (
                    <div style={{ marginTop: 24, width: "100%", maxWidth: 480 }}>
                        <Typography.Text type="secondary">Recent files</Typography.Text>
                        <List
                            size="small"
                            style={{ marginTop: 8 }}
                            dataSource={recentFiles}
                            renderItem={(path) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="open"
                                            type="link"
                                            icon={<FolderOpenOutlined />}
                                            loading={dbContext.loading}
                                            onClick={() => dbContext.loadFromPath(path)}
                                        >
                                            Open
                                        </Button>,
                                        <Button
                                            key="remove"
                                            type="link"
                                            danger
                                            onClick={() => removeRecentFile(path)}
                                        >
                                            Remove
                                        </Button>,
                                    ]}
                                >
                                    <Typography.Text
                                        ellipsis
                                        style={{ maxWidth: 300 }}
                                        title={path}
                                    >
                                        {path}
                                    </Typography.Text>
                                </List.Item>
                            )}
                        />
                    </div>
                )}
            </Flex>
        </Card>
    );
}

export default Loader;
