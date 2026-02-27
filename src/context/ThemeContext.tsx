import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
    theme: ThemeMode;
    isDark: boolean;
    toggleTheme: () => void;
    colors: any;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const Colors = {
    light: {
        primary: "#2563eb",
        background: "#f8fafc",
        card: "#ffffff",
        text: "#0f172a",
        textSecondary: "#64748b",
        border: "#e2e8f0",
    },
    dark: {
        primary: "#3b82f6",
        background: "#0f172a",
        card: "#1e293b",
        text: "#f8fafc",
        textSecondary: "#94a3b8",
        border: "#334155",
    }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setTheme] = useState<ThemeMode>("light");

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem("theme");
            if (savedTheme) {
                setTheme(savedTheme as ThemeMode);
            } else if (systemColorScheme) {
                setTheme(systemColorScheme);
            }
        };
        loadTheme();
    }, [systemColorScheme]);

    const toggleTheme = async () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        await AsyncStorage.setItem("theme", newTheme);
    };

    const isDark = theme === "dark";

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors: Colors[theme] }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
};
