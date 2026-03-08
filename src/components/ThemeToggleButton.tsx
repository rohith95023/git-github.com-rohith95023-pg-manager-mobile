import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";

interface ThemeToggleButtonProps {
    style?: StyleProp<ViewStyle>;
}

const ThemeToggleButton = ({ style }: ThemeToggleButtonProps) => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.7}
            style={[
                styles.button,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                },
                style
            ]}
        >
            <Feather
                name={isDark ? "sun" : "moon"}
                size={20}
                color={isDark ? "#facc15" : "#475569"}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default ThemeToggleButton;
