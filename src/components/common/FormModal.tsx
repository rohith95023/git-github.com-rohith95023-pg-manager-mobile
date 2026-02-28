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
                                    <View style={[styles.closeIconBg, { backgroundColor: COLORS.card }]}>
                                        <Feather name="x" size={20} color={COLORS.text} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Content */}
                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {children}
                        </ScrollView>

                        {/* Footer */}
                        <View style={[styles.footer, { borderTopColor: COLORS.border, backgroundColor: COLORS.bg }]}>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { borderColor: COLORS.border }]}
                                onPress={onClose}
                                disabled={loading}
                            >
                                <Text style={[styles.cancelBtnText, { color: COLORS.textMuted }]}>Cancel</Text>
                            </TouchableOpacity>
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
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
    },
    subtitle: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    closeIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    footer: {
        flexDirection: "row",
        padding: 20,
        paddingBottom: Platform.OS === "ios" ? 10 : 20, // SafeArea handled by outer View
        gap: 12,
        borderTopWidth: 1,
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: "700",
    },
    submitBtn: {
        flex: 2,
        height: 52,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "800",
    },
});

export default FormModal;
