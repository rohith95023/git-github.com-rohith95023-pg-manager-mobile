import React from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import useThemePalette from "../../hooks/useThemePalette";

interface FormModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    loading?: boolean;
    submitLabel?: string;
    headerRight?: React.ReactNode;
}

const FormModal: React.FC<FormModalProps> = ({
    visible,
    onClose,
    onSubmit,
    title,
    subtitle,
    children,
    loading = false,
    submitLabel = "Save Changes",
    headerRight,
}) => {
    const COLORS = useThemePalette();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.bg }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ flex: 1 }}
                    >
                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.title, { color: COLORS.text }]}>{title}</Text>
                                {subtitle ? (
                                    <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>{subtitle}</Text>
                                ) : null}
                            </View>
                            <View style={styles.headerActions}>
                                {headerRight}
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <Feather name="x" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Content */}
                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {children}
                        </ScrollView>

                        {/* Footer */}
                        <View style={[styles.footer, { borderTopColor: COLORS.border, backgroundColor: COLORS.bg }]}>
                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: COLORS.primary }]}
                                onPress={onSubmit}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.submitBtnText}>{submitLabel}</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.cancelLink}
                                onPress={onClose}
                                disabled={loading}
                            >
                                <Text style={[styles.cancelLinkText, { color: COLORS.textMuted }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    safeArea: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 11,
        fontWeight: "700",
        marginTop: 1,
        textTransform: "uppercase",
        opacity: 0.6,
    },
    closeBtn: {
        padding: 4,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    footer: {
        padding: 24,
        paddingTop: 16,
        paddingBottom: Platform.OS === "ios" ? 10 : 20,
        borderTopWidth: 1,
        gap: 8,
    },
    submitBtn: {
        width: "100%",
        height: 56,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    submitBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
    },
    cancelLink: {
        height: 48,
        justifyContent: "center",
        alignItems: "center",
    },
    cancelLinkText: {
        fontSize: 14,
        fontWeight: "700",
    },
});

export default FormModal;
