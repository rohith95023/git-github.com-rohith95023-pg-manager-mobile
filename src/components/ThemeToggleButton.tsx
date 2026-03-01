import React, { useRef, useEffect } from "react";
import { TouchableOpacity, StyleProp, ViewStyle, Animated, StyleSheet, View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface ThemeToggleButtonProps {
    style?: StyleProp<ViewStyle>;
}

const ThemeToggleButton = ({ style }: ThemeToggleButtonProps) => {
    const { isDark, toggleTheme, colors } = useTheme();

    // Animation value (0 = Light, 1 = Dark)
    const anim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: isDark ? 1 : 0,
            useNativeDriver: true,
            friction: 9,
            tension: 50
        }).start();
    }, [isDark]);

    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [4, 78], // TrackWidth(114) - ThumbWidth(32) - Padding(4) = 78
    });

    const lightTextOpacity = anim.interpolate({
        inputRange: [0, 0.3],
        outputRange: [1, 0],
    });

    const darkTextOpacity = anim.interpolate({
        inputRange: [0.7, 1],
        outputRange: [0, 1],
    });

    // Neumorphic colors matching the image
    const trackColor = isDark ? "#23293e" : "#edeff5";
    const thumbColor = isDark ? "#38415a" : "#ffffff";
    const textColor = isDark ? "#818ba4" : "#748ba7";

    return (
        <TouchableOpacity
            style={[
                styles.track,
                { backgroundColor: trackColor, borderColor: isDark ? "#1a2135" : "#d1d9e6" },
                style
            ]}
            onPress={toggleTheme}
            activeOpacity={0.9}
        >
            {/* Background Labels - Properly Spaced */}
            <View style={styles.labelsContainer}>
                <Animated.View style={[styles.labelWrapper, { opacity: darkTextOpacity, left: 16 }]}>
                    <Text style={[styles.labelText, { color: textColor }]}>DARK MODE</Text>
                </Animated.View>
                <Animated.View style={[styles.labelWrapper, { opacity: lightTextOpacity, right: 16 }]}>
                    <Text style={[styles.labelText, { color: textColor }]}>LIGHT MODE</Text>
                </Animated.View>
            </View>

            {/* Sliding Thumb */}
            <Animated.View
                style={[
                    styles.thumb,
                    {
                        transform: [{ translateX }],
                        backgroundColor: thumbColor,
                        shadowColor: "#000",
                        elevation: 5
                    }
                ]}
            >
                <Animated.View style={[StyleSheet.absoluteFill, styles.iconBox, { opacity: lightTextOpacity }]}>
                    <Feather name="sun" size={16} color="#f59e0b" />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, styles.iconBox, { opacity: darkTextOpacity }]}>
                    <Feather name="moon" size={16} color="#d1d5db" />
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    track: {
        width: 114,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        borderWidth: 1.5,
        position: 'relative',
        overflow: 'hidden'
    },
    labelsContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
        justifyContent: 'center',
    },
    labelWrapper: {
        position: 'absolute',
        height: '100%',
        justifyContent: 'center',
    },
    labelText: {
        fontSize: 8,
        fontWeight: "900",
        letterSpacing: 0.8,
    },
    thumb: {
        width: 32,
        height: 32,
        borderRadius: 16,
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    iconBox: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default ThemeToggleButton;
