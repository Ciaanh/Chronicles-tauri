import { useCallback, useState } from "react";

const STORAGE_KEY = "chronicles_recent_files";
const MAX_RECENT = 5;

export function useRecentFiles() {
    const [recentFiles, setRecentFiles] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as string[]) : [];
        } catch {
            return [];
        }
    });

    const addRecentFile = useCallback((path: string) => {
        setRecentFiles((prev) => {
            const updated = [path, ...prev.filter((p) => p !== path)].slice(
                0,
                MAX_RECENT
            );
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {
                // localStorage unavailable (e.g. private mode) — silently skip
            }
            return updated;
        });
    }, []);

    const removeRecentFile = useCallback((path: string) => {
        setRecentFiles((prev) => {
            const updated = prev.filter((p) => p !== path);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {
                // no-op
            }
            return updated;
        });
    }, []);

    return { recentFiles, addRecentFile, removeRecentFile };
}
