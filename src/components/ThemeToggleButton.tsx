import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";

interface ThemeToggleButtonProps {
    style?: StyleProp<ViewStyle>;
}

const ThemeToggleButton = ({ style }: ThemeToggleButtonProps) => {
    const { isDark, toggleTheme } = useTheme();

    const anim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: isDark ? 1 : 0,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [isDark]);

    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 22], // Track(48) - Thumb(24) - padding(2)
    });

    const trackBg = isDark ? "#334155" : "#e2e8f0";

    return (
        <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.85}
            style={[styles.track, { backgroundColor: trackBg }, style]}
            accessibilityLabel="Toggle theme"
            accessibilityRole="switch"
        >
            <Animated.View
                style={[
                    styles.thumb,
                    {
                        transform: [{ translateX }],
                        backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    },
                ]}
            >
                <Feather
                    name={isDark ? "moon" : "sun"}
                    size={13}
                    color={isDark ? "#94a3b8" : "#f59e0b"}
                />
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    track: {
        width: 48,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        overflow: "hidden",
    },
    thumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
});

export default ThemeToggleButton;
