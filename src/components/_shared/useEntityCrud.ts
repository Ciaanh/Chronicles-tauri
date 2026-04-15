import { useState, useRef, useEffect, useContext } from "react";
import { App } from "antd";
import React from "react";
import { dbRepository } from "../../database/dbcontext";

/**
 * Shared CRUD state and delete-with-undo logic for entity list components.
 * Each list component calls this hook once, then provides its own fetch logic,
 * column definitions, and modal submit handler.
 */
export function useEntityCrud<T extends { id: number; name: string }>(config: {
    tableName: string;
    entityLabel: string;
    sortItems: (items: T[]) => T[];
}) {
    const { tableName, entityLabel, sortItems } = config;
    const dbContext = useContext(dbRepository);
    const { message } = App.useApp();

    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<T[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [search, setSearch] = useState("");

    const pendingDeletes = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    // Cleanup pending deletes on unmount
    useEffect(() => {
        const pending = pendingDeletes.current;
        return () => {
            pending.forEach((timeout) => clearTimeout(timeout));
        };
    }, []);

    function openAdd() {
        setEditingItem(null);
        setIsModalVisible(true);
    }

    function openEdit(item: T) {
        setEditingItem(item);
        setIsModalVisible(true);
    }

    function closeModal() {
        setIsModalVisible(false);
        setEditingItem(null);
    }

    async function optimisticDelete(item: T) {
        const { id, name } = item;
        const messageKey = `delete-${tableName}-${id}`;

        setItems((prev) => prev.filter((i) => i.id !== id));

        const timeout = setTimeout(async () => {
            pendingDeletes.current.delete(id);
            setLoading(true);
            try {
                await dbContext.remove(id, tableName);
            } finally {
                setLoading(false);
            }
        }, 5000);
        pendingDeletes.current.set(id, timeout);

        message.open({
            key: messageKey,
            type: "success",
            duration: 5,
            content: React.createElement(
                "span",
                null,
                `${entityLabel} "${name}" deleted. `,
                React.createElement(
                    "button",
                    {
                        style: {
                            background: "none",
                            border: "none",
                            color: "#1677ff",
                            cursor: "pointer",
                            padding: 0,
                            font: "inherit",
                        },
                        onClick: () => undoDelete(item),
                    },
                    "Undo"
                )
            ),
        });
    }

    function undoDelete(item: T) {
        const { id } = item;
        const messageKey = `delete-${tableName}-${id}`;
        const timeout = pendingDeletes.current.get(id);
        if (timeout) {
            clearTimeout(timeout);
            pendingDeletes.current.delete(id);
        }
        setItems((prev) => sortItems([...prev, item]));
        message.destroy(messageKey);
    }

    return {
        loading,
        setLoading,
        items,
        setItems,
        isModalVisible,
        modalLoading,
        setModalLoading,
        editingItem,
        search,
        setSearch,
        openAdd,
        openEdit,
        closeModal,
        optimisticDelete,
        dbContext,
    };
}
