import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import useThemePalette from "../../hooks/useThemePalette";

interface DatePickerFieldProps {
    label: string;
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    error?: string;
    icon?: keyof typeof Feather.glyphMap;
    mode?: "date" | "month"; // Specific for our use case
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
    label,
    value,
    onChange,
    error,
    icon = "calendar",
    mode = "date",
}) => {
    const COLORS = useThemePalette();
    const [show, setShow] = useState(false);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "Select Date";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "Select Date";

            if (mode === "month") {
                return date.toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                });
            }
            return date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch (e) {
            return "Select Date";
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShow(Platform.OS === 'ios'); // Keep open on iOS, close on Android
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            onChange(dateStr);
        }
    };

    const currentValue = value ? new Date(value) : new Date();

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: COLORS.textMuted }]}>{label.toUpperCase()}</Text>
            <TouchableOpacity
                activeOpacity={0.7}
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: COLORS.card,
                        borderColor: error ? COLORS.danger : COLORS.border,
                    },
                ]}
                onPress={() => setShow(true)}
            >
                <View style={styles.iconContainer}>
                    <Feather name={icon} size={18} color={error ? COLORS.danger : COLORS.textMuted} />
                </View>
                <Text style={[styles.valueText, { color: value ? COLORS.text : COLORS.textMuted + "80" }]}>
                    {formatDate(value)}
                </Text>
                <Feather name="chevron-down" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            {show && (
                <DateTimePicker
                    value={currentValue}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                />
            )}

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
    valueText: {
        flex: 1,
        fontSize: 15,
        fontWeight: "600",
    },
    errorText: {
        fontSize: 10,
        fontWeight: "700",
        marginTop: 4,
        marginLeft: 4,
    },
});

export default DatePickerField;
