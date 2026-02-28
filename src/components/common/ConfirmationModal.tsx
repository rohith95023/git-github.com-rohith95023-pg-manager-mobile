import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    TouchableWithoutFeedback,
    TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useThemePalette from "../../hooks/useThemePalette";

interface ConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    subtitle?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info" | "success";
    loading?: boolean;
    confirmDisabled?: boolean;
    disableOutsideTap?: boolean;
    singleButton?: boolean;
    needsInput?: boolean;
    inputValue?: string;
    onInputChange?: (val: string) => void;
    inputPlaceholder?: string;
    inputLabel?: string;
    inputError?: string;
    secondaryText?: string;
    onSecondary?: () => void;
}

const ConfirmationModal = ({
    visible,
    onClose,
    onConfirm,
    title,
    subtitle,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "info",
    loading = false,
    confirmDisabled = false,
    disableOutsideTap = false,
    singleButton = false,
    needsInput = false,
    inputValue = "",
    onInputChange,
    inputPlaceholder = "Type here...",
    inputLabel = "Confirmation",
    inputError = "",
    secondaryText,
    onSecondary,
}: ConfirmationModalProps) => {
    const COLORS = useThemePalette();

    const getIconConfig = () => {
        switch (type) {
            case "danger":
                return { name: "close-outline", color: COLORS.danger, bg: COLORS.danger + "15" };
            case "warning":
                return { name: "alert-circle-outline", color: COLORS.warning, bg: COLORS.warning + "15" };
            case "success":
                return { name: "checkmark-circle-outline", color: COLORS.success, bg: COLORS.success + "15" };
            default:
                return { name: "help-circle-outline", color: COLORS.primary, bg: COLORS.primary + "15" };
        }
    };

    const iconConfig = getIconConfig();

    const shouldPreventDismiss = disableOutsideTap || type === "danger";

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={shouldPreventDismiss ? undefined : onClose}>
            <TouchableWithoutFeedback onPress={shouldPreventDismiss ? undefined : onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={[styles.modalCard, { backgroundColor: COLORS.card }]}>
                            <View style={styles.content}>
                                {/* Icon Box */}
                                <View style={[styles.iconBox, { backgroundColor: iconConfig.bg, borderColor: iconConfig.color + "20" }]}>
                                    <Ionicons name={iconConfig.name as any} size={32} color={iconConfig.color} />
                                </View>

                                {/* Title & Subtitle */}
                                <Text style={[styles.title, { color: COLORS.text }]}>{title}</Text>
                                {!!subtitle && <Text style={[styles.subtitle, { color: COLORS.primary }]}>{subtitle.toUpperCase()}</Text>}

                                {/* Message */}
                                <Text style={[styles.message, { color: COLORS.textMuted }]}>{message}</Text>

                                {/* Input Section */}
                                {needsInput && (
                                    <View style={styles.inputContainer}>
                                        <View style={styles.codeDisplayWrapper}>
                                            <Text style={[styles.codeLabel, { color: COLORS.textMuted }]}>CONFIRMATION CODE</Text>
                                            <View style={[styles.codeBadge, { backgroundColor: COLORS.bg }]}>
                                                <Text style={[styles.codeText, { color: iconConfig.color }]}>
                                                    {inputPlaceholder.match(/"([^"]+)"/)?.[1] || "----"}
                                                </Text>
                                            </View>
                                        </View>
                                        {/* {!!inputLabel && <Text style={[styles.inputLabel, { color: COLORS.primary }]}>{inputLabel.toUpperCase()}</Text>} */}
                                        <TextInput
                                            style={[
                                                styles.input,
                                                { backgroundColor: COLORS.bg, color: COLORS.text, borderColor: COLORS.border, textAlign: 'center' },
                                                inputValue === inputPlaceholder.match(/"([^"]+)"/)?.[1] && { borderColor: COLORS.success, borderWidth: 2 }
                                            ]}
                                            placeholder="Enter Code"
                                            placeholderTextColor={COLORS.textMuted + "80"}
                                            value={inputValue}
                                            onChangeText={onInputChange}
                                            autoCapitalize="none"
                                            keyboardType="default"
                                        />
                                        {!!inputError ? <Text style={[styles.inputError, { color: COLORS.danger }]}>{inputError}</Text> : null}
                                    </View>
                                )}

                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.confirmButton,
                                            { backgroundColor: type === "danger" ? COLORS.danger : COLORS.primary },
                                            (loading || confirmDisabled) && styles.disabledButton,
                                        ]}
                                        onPress={onConfirm || onClose}
                                        disabled={loading || confirmDisabled}
                                        activeOpacity={0.8}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#FFF" size="small" />
                                        ) : (
                                            <Text style={styles.confirmText}>
                                                {(singleButton && cancelText !== "Cancel" && confirmText === "Confirm")
                                                    ? cancelText.toUpperCase()
                                                    : confirmText.toUpperCase()}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    {!!secondaryText && (
                                        <TouchableOpacity
                                            style={[styles.secondaryButton, { borderColor: COLORS.border, borderWidth: 1 }]}
                                            onPress={onSecondary}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.secondaryText, { color: COLORS.text }]}>{secondaryText.toUpperCase()}</Text>
                                        </TouchableOpacity>
                                    )}

                                    {!singleButton && (
                                        <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading} activeOpacity={0.7}>
                                            <Text style={[styles.cancelText, { color: COLORS.textMuted }]}>{cancelText.toUpperCase()}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback >
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalCard: {
        width: "100%",
        maxWidth: 400,
        borderRadius: 24,
        overflow: "hidden",
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    content: {
        padding: 32,
        alignItems: "center",
    },
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        borderWidth: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 12,
        letterSpacing: 1,
        opacity: 0.7,
    },
    message: {
        fontSize: 15,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
    },
    inputContainer: {
        width: "100%",
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: "800",
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 1,
    },
    input: {
        width: "100%",
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 15,
        fontWeight: "600",
    },
    inputError: {
        fontSize: 10,
        fontWeight: "700",
        marginTop: 6,
        marginLeft: 4,
    },
    buttonContainer: {
        width: "100%",
        gap: 12,
    },
    confirmButton: {
        width: "100%",
        height: 52,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    confirmText: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "800",
        letterSpacing: 1.5,
    },
    cancelButton: {
        width: "100%",
        paddingVertical: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    cancelText: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.5,
        opacity: 0.7,
    },
    disabledButton: {
        opacity: 0.6,
    },
    secondaryButton: {
        width: "100%",
        height: 52,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    secondaryText: {
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 1,
    },
    codeDisplayWrapper: {
        alignItems: "center",
        marginBottom: 16,
    },
    codeLabel: {
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 1,
        marginBottom: 6,
        opacity: 0.6,
    },
    codeBadge: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "rgba(0,0,0,0.05)",
        borderStyle: "dashed",
    },
    codeText: {
        fontSize: 24,
        fontWeight: "900",
        letterSpacing: 4,
    },
});

export default ConfirmationModal;
