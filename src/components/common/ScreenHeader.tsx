import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import useThemePalette from "../../hooks/useThemePalette";
import ThemeToggleButton from "../ThemeToggleButton";

interface ScreenHeaderProps {
    title: string;
    onLeftPress?: () => void;
    leftIcon?: keyof typeof Feather.glyphMap;
    rightElement?: React.ReactNode;
    showThemeToggle?: boolean;
}

const ScreenHeader = ({
    title,
    onLeftPress,
    leftIcon = "menu",
    rightElement,
    showThemeToggle = true
}: ScreenHeaderProps) => {
    const COLORS = useThemePalette();

    return (
        <View style={[styles.container, { backgroundColor: COLORS.card, borderBottomColor: COLORS.border }]}>
            <View style={styles.leftRow}>
                {onLeftPress && (
                    <TouchableOpacity onPress={onLeftPress} style={styles.iconButton}>
                        <Feather name={leftIcon} size={22} color={COLORS.text} />
                    </TouchableOpacity>
                )}
                <Text style={[styles.title, { color: COLORS.text }]} numberOfLines={1}>
                    {title}
                </Text>
            </View>

            <View style={styles.rightRow}>
                {rightElement}
                {showThemeToggle && (
                    <ThemeToggleButton style={styles.toggle} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 60,
        borderBottomWidth: 1,
    },
    leftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rightRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    toggle: {
        marginLeft: 8,
    }
});

export default ScreenHeader;
