import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const COLORS = {
    bg: "#0f172a",
    card: "#1e293b",
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    text: "#ffffff",
    textMuted: "#94a3b8",
    border: "rgba(255,255,255,0.05)"
};

const ProfileScreen = () => {
    const { colors } = useTheme();
    const { user, logout } = useAuth();
    const navigation = useNavigation<any>();

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: logout }
            ]
        );
    };

    const InfoRow = ({ label, value, icon, isLast = false }: any) => (
        <View style={[styles.infoRow, !isLast && styles.rowDivider]}>
            <View style={styles.infoLeft}>
                <View style={[styles.infoIcon, { backgroundColor: COLORS.primary + "10" }]}>
                    <Feather name={icon} size={16} color={COLORS.primary} />
                </View>
                <View>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue}>{value || "Not Set"}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Profile</Text>
                </View>

                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <View style={[styles.avatarCircle, { backgroundColor: COLORS.primary }]}>
                        <Text style={styles.avatarText}>{user?.full_name?.charAt(0).toUpperCase() || 'U'}</Text>
                        <TouchableOpacity style={styles.editAvatarBtn}>
                            <Feather name="camera" size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user?.full_name || "Manager Account"}</Text>
                    <View style={styles.roleBadge}>
                        <MaterialCommunityIcons name="shield-check" size={12} color={COLORS.primary} />
                        <Text style={styles.roleText}>{user?.role || "ADMIN"}</Text>
                    </View>
                    <TouchableOpacity style={styles.editProfileBtn}>
                        <Text style={styles.editProfileBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Personal Info Card */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>PERSONAL INFORMATION</Text>
                    <View style={styles.infoList}>
                        <InfoRow label="Full Name" value={user?.full_name} icon="user" />
                        <InfoRow label="Email Address" value={user?.email} icon="mail" />
                        <InfoRow label="Phone Number" value={user?.phone} icon="phone" />
                        <InfoRow label="Gender" value={user?.gender} icon="users" />
                        <InfoRow label="Date of Birth" value={user?.dob} icon="calendar" isLast />
                    </View>
                </View>

                {/* Account Info Card */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>ACCOUNT SECURITY</Text>
                    <View style={styles.infoList}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("ChangePassword")}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.infoIcon, { backgroundColor: COLORS.warning + "10" }]}>
                                    <Feather name="lock" size={16} color={COLORS.warning} />
                                </View>
                                <Text style={styles.menuItemText}>Change Password</Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Login Info */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>LOGIN ACTIVITY</Text>
                    <View style={styles.infoList}>
                        <InfoRow
                            label="Account Created"
                            value={user?.created_at ? new Date(user.created_at).toLocaleString() : "N/A"}
                            icon="clock"
                        />
                        <InfoRow
                            label="Last Login"
                            value={new Date().toLocaleString()} // Simulated last login
                            icon="log-in"
                            isLast
                        />
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Feather name="log-out" size={20} color="#fff" />
                    <Text style={styles.logoutButtonText}>Sign Out from Device</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scrollContent: { paddingBottom: 40 },
    header: { padding: 20, paddingBottom: 10 },
    title: { fontSize: 26, fontWeight: "900", color: COLORS.text, letterSpacing: -1 },

    avatarSection: { alignItems: "center", paddingVertical: 30 },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        position: "relative",
        elevation: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    avatarText: { color: "#fff", fontSize: 36, fontWeight: "900" },
    editAvatarBtn: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: COLORS.bg
    },
    userName: { fontSize: 20, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primary + "15",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
        marginBottom: 20
    },
    roleText: { color: COLORS.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    editProfileBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    editProfileBtnText: { color: COLORS.text, fontSize: 14, fontWeight: "700" },

    sectionCard: { marginHorizontal: 20, marginBottom: 24 },
    sectionHeader: { fontSize: 12, fontWeight: "800", color: COLORS.textMuted, marginBottom: 12, marginLeft: 4, letterSpacing: 1 },
    infoList: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    infoRow: { padding: 12 },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
    infoLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
    infoIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    infoLabel: { fontSize: 10, fontWeight: "800", color: COLORS.textMuted, marginBottom: 4 },
    infoValue: { fontSize: 14, fontWeight: "700", color: COLORS.text },

    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12
    },
    menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
    menuItemText: { fontSize: 15, fontWeight: "700", color: COLORS.text },

    logoutButton: {
        marginHorizontal: 20,
        height: 60,
        backgroundColor: COLORS.danger,
        borderRadius: 20,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        marginTop: 10,
        elevation: 4,
        shadowColor: COLORS.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
    },
    logoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" }
});

export default ProfileScreen;
