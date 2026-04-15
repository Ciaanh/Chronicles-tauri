import { useState, useCallback, PropsWithChildren } from "react";
import { ThemeContext } from "./ThemeContext";

export function ThemeProvider({ children }: PropsWithChildren) {
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        try {
            return localStorage.getItem("darkMode") === "true";
        } catch {
            return false;
        }
    });

    const toggleDarkMode = useCallback(() => {
        setDarkMode((prev) => {
            const next = !prev;
            try {
                localStorage.setItem("darkMode", String(next));
            } catch {
                // storage unavailable
            }
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
}
