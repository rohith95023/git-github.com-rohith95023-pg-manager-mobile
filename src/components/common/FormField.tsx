import React from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";
import useThemePalette from "../../hooks/useThemePalette";

interface FormFieldProps extends TextInputProps {
    label: string;
    icon?: keyof typeof Feather.glyphMap;
    error?: string;
    onIconPress?: () => void;
    rightElement?: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
    label,
    icon,
    error,
    onIconPress,
    rightElement,
    style,
    ...props
}) => {
    const COLORS = useThemePalette();

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: COLORS.textMuted }]}>{label.toUpperCase()}</Text>
            <View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: COLORS.card,
                        borderColor: error ? COLORS.danger : COLORS.border,
                    },
                ]}
            >
                {icon && (
                    <TouchableOpacity
                        onPress={onIconPress}
                        disabled={!onIconPress}
                        style={styles.iconContainer}
                    >
                        <Feather name={icon} size={18} color={error ? COLORS.danger : COLORS.textMuted} />
                    </TouchableOpacity>
                )}
                <TextInput
                    style={[styles.input, { color: COLORS.text }, style]}
                    placeholderTextColor={COLORS.textMuted + "80"}
                    {...props}
                />
                {rightElement}
            </View>
            {error ? (
                <Text style={[styles.errorText, { color: COLORS.danger }]}>{error}</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: "100%",
    },
    label: {
        fontSize: 10,
        fontWeight: "900",
        marginBottom: 8,
        letterSpacing: 1,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderRadius: 14,
        height: 52,
        paddingHorizontal: 12,
    },
    iconContainer: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: "600",
        height: "100%",
    },
    errorText: {
        fontSize: 10,
        fontWeight: "700",
        marginTop: 4,
        marginLeft: 4,
    },
});

export default FormField;
