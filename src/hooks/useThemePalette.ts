import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";

export interface ThemePalette {
    bg: string;
    card: string;
    primary: string;
    success: string;
    warning: string;
    danger: string;
    text: string;
    textMuted: string;
    border: string;
}

const STATIC_ACCENTS = {
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
};

const useThemePalette = (): ThemePalette => {
    const { colors } = useTheme();

    return useMemo(
        () => ({
            ...STATIC_ACCENTS,
            bg: colors.background,
            card: colors.card,
            primary: colors.primary,
            text: colors.text,
            textMuted: colors.textSecondary,
            border: colors.border,
        }),
        [colors]
    );
};

export default useThemePalette;
