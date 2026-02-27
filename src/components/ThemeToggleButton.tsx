import React, { useRef } from "react";
import { TouchableOpacity, StyleProp, ViewStyle, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface ThemeToggleButtonProps {
    style?: StyleProp<ViewStyle>;
}

const ThemeToggleButton = ({ style }: ThemeToggleButtonProps) => {
    const { isDark, toggleTheme, colors } = useTheme();
    const ripple = useRef(new Animated.Value(0)).current;
    const baseStyle = {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
        position: "relative" as const,
        overflow: "hidden" as const,
    };

    const rippleStyle = {
        position: "absolute" as const,
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: isDark ? "rgba(248,250,252,0.25)" : "rgba(15,23,42,0.25)",
        transform: [
            {
                scale: ripple.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.01, 1],
                }),
            },
        ],
        opacity: ripple.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 0],
        }),
    };

    const triggerToggle = () => {
        Animated.sequence([
            Animated.timing(ripple, {
                toValue: 1,
                duration: 260,
                useNativeDriver: true,
            }),
            Animated.timing(ripple, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
        toggleTheme();
    };

    return (
        <TouchableOpacity
            style={[baseStyle, style]}
            onPress={triggerToggle}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Theme toggle"
            accessibilityHint={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
            <Animated.View style={rippleStyle} pointerEvents="none" />
            <Feather name={isDark ? "sun" : "moon"} size={22} color={colors.text} />
        </TouchableOpacity>
    );
};

export default ThemeToggleButton;
