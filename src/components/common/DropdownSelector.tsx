import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import useThemePalette from "../../hooks/useThemePalette";

interface DropdownOption {
    label: string;
    value: string;
    disabled?: boolean;
}

interface DropdownSelectorProps {
    label: string;
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    highlight?: boolean;
    error?: string;
    onDisabledPress?: () => void;
}

const DropdownSelector: React.FC<DropdownSelectorProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = "Select...",
    disabled = false,
    highlight = false,
    error,
    onDisabledPress
}) => {
    const COLORS = useThemePalette();
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: COLORS.textMuted }]}>{label}</Text>
            <TouchableOpacity
                style={[
                    styles.selector,
                    { borderColor: error ? COLORS.danger : COLORS.border, backgroundColor: COLORS.card },
                    disabled && styles.selectorDisabled,
                    highlight && { borderColor: COLORS.primary, borderWidth: 2 }
                ]}
                onPress={() => {
                    if (disabled) {
                        onDisabledPress?.();
                    } else {
                        setIsOpen(true);
                    }
                }}
                disabled={false}
            >
                <Text style={[
                    styles.selectorText,
                    { color: selectedOption ? COLORS.text : COLORS.textMuted },
                    disabled && { color: COLORS.textMuted }
                ]}>
                    {disabled ? placeholder : (selectedOption?.label || placeholder)}
                </Text>
                {!disabled && <Feather name="chevron-down" size={18} color={COLORS.textMuted} />}
                {disabled && <Feather name="lock" size={18} color={COLORS.textMuted} />}
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <SafeAreaView style={[styles.modalContent, { backgroundColor: COLORS.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}>
                            <Text style={[styles.modalTitle, { color: COLORS.text }]}>{label}</Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Feather name="x" size={20} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        { borderBottomColor: COLORS.border },
                                        item.value === value && { backgroundColor: COLORS.primary + "15" },
                                        item.disabled && { opacity: 0.5 }
                                    ]}
                                    onPress={() => !item.disabled && handleSelect(item.value)}
                                    disabled={item.disabled}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        { color: COLORS.text },
                                        item.value === value && { color: COLORS.primary, fontWeight: "700" }
                                    ]}>
                                        {item.label}
                                    </Text>
                                    {item.value === value && (
                                        <Feather name="check" size={18} color={COLORS.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                            style={styles.optionsList}
                        />
                    </SafeAreaView>
                </TouchableOpacity>
            </Modal>
            {error ? (
                <Text style={[styles.errorText, { color: COLORS.danger }]}>{error}</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 8,
    },
    selector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    selectorDisabled: {
        opacity: 0.5,
    },
    selectorText: {
        fontSize: 14,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    modalContent: {
        borderRadius: 16,
        maxHeight: "70%",
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "700",
    },
    optionsList: {
        maxHeight: 300,
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    optionText: {
        fontSize: 15,
    },
    errorText: {
        fontSize: 10,
        fontWeight: "700",
        marginTop: 4,
        marginLeft: 4,
    },
});

export default DropdownSelector;
