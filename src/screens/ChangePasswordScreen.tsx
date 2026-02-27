import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import useThemePalette from "../hooks/useThemePalette";

const ChangePasswordScreen = () => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const handleUpdate = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            Alert.alert("Error", "All fields are required");
            return;
        }

        if (passwords.new !== passwords.confirm) {
            Alert.alert("Error", "New passwords do not match");
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            Alert.alert("Success", "Password updated successfully", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        }, 1500);
    };

    const PasswordInput = ({ label, value, field, show, toggleShow }: any) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    secureTextEntry={!show}
                    value={value}
                    onChangeText={(val) => setPasswords(prev => ({ ...prev, [field]: val }))}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor={COLORS.textMuted}
                />
                <TouchableOpacity onPress={toggleShow} style={styles.eyeIcon}>
                    <Feather name={show ? "eye-off" : "eye"} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Update Password</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.infoCard}>
                    <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.primary} style={{ marginBottom: 16 }} />
                    <Text style={styles.infoTitle}>Secure Your Account</Text>
                    <Text style={styles.infoSubtitle}>
                        Ensure your new password is at least 8 characters long and includes numbers and special symbols.
                    </Text>
                </View>

                <View style={styles.formCard}>
                    <PasswordInput
                        label="Current Password"
                        value={passwords.current}
                        field="current"
                        show={showPassword.current}
                        toggleShow={() => setShowPassword(p => ({ ...p, current: !p.current }))}
                    />

                    <View style={styles.divider} />

                    <PasswordInput
                        label="New Password"
                        value={passwords.new}
                        field="new"
                        show={showPassword.new}
                        toggleShow={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                    />

                    <PasswordInput
                        label="Confirm New Password"
                        value={passwords.confirm}
                        field="confirm"
                        show={showPassword.confirm}
                        toggleShow={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.updateBtn, loading && styles.updateBtnDisabled]}
                    onPress={handleUpdate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.updateBtnText}>Update Password</Text>
                            <Feather name="check" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border
    },
    title: { fontSize: 20, fontWeight: "800", color: COLORS.text },
    scrollContent: { padding: 20, paddingBottom: 40 },

    infoCard: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    infoTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
    infoSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },

    formCard: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: "800", color: COLORS.textMuted, marginBottom: 10, marginLeft: 4 },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        height: 56,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: "600" },
    eyeIcon: { padding: 8 },
    divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 20 },

    updateBtn: {
        height: 60,
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    updateBtnDisabled: { opacity: 0.7 },
    updateBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" }
});

export default ChangePasswordScreen;
