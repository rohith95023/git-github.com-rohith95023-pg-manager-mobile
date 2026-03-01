import React, { useMemo, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import useThemePalette from "../hooks/useThemePalette";
import ConfirmationModal from "../components/common/ConfirmationModal";

const { width } = Dimensions.get("window");

const ProfileScreen = () => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const { user, logout } = useAuth();
    const navigation = useNavigation<any>();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const InfoRow = ({ label, value, icon, isLast = false }: any) => (
        <View style={[styles.infoRow, !isLast && styles.rowDivider]}>
            <View style={styles.infoLeft}>
                <Feather name={icon} size={16} color={COLORS.textMuted} style={styles.infoIconStatic} />
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
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[styles.backButton, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
                    >
                        <Feather name="x" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                </View>

                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <View style={[styles.avatarCircle, { backgroundColor: COLORS.primary + '12' }]}>
                        <Text style={[styles.avatarText, { color: COLORS.primary }]}>
                            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View style={styles.userInfoCentered}>
                        <Text style={styles.userName}>{user?.full_name || "Manager Account"}</Text>
                        <Text style={styles.roleText}>{user?.role || "ADMIN"}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.editProfileBtn}
                        onPress={() => console.log("Edit Profile")}
                    >
                        <Feather name="edit-2" size={14} color={COLORS.primary} />
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

                {/* Account Settings */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>SETTINGS & SECURITY</Text>
                </View>
                <View style={styles.menuCard}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate("ChangePassword")}
                    >
                        <View style={styles.menuItemLeft}>
                            <Feather name="lock" size={18} color={COLORS.textMuted} />
                            <Text style={styles.menuItemText}>Change Password</Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
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
                <TouchableOpacity style={[styles.logoutButton, { backgroundColor: COLORS.danger + '10' }]} onPress={handleLogout}>
                    <Feather name="log-out" size={18} color={COLORS.danger} />
                    <Text style={[styles.logoutButtonText, { color: COLORS.danger }]}>Sign Out</Text>
                </TouchableOpacity>

                <ConfirmationModal
                    visible={showLogoutConfirm}
                    onClose={() => setShowLogoutConfirm(false)}
                    onConfirm={logout}
                    title="Sign Out"
                    message="Are you sure you want to sign out? You will need to login again to access your properties."
                    confirmText="Sign Out"
                    type="danger"
                />

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        scrollContent: { paddingBottom: 40 },
        header: {
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between"
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
        },
        title: { fontSize: 24, fontWeight: "900", color: COLORS.text, letterSpacing: -0.5 },

        avatarSection: {
            alignItems: 'center',
            paddingVertical: 32,
            gap: 12
        },
        avatarCircle: {
            width: 80,
            height: 80,
            borderRadius: 40,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 4
        },
        avatarText: { fontSize: 32, fontWeight: "900" },
        userInfoCentered: {
            alignItems: 'center',
            gap: 4
        },
        userName: { fontSize: 20, fontWeight: "800", color: COLORS.text },
        roleText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
        editProfileBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 25,
            backgroundColor: COLORS.primary + '10',
            marginTop: 8,
            borderWidth: 1,
            borderColor: COLORS.primary + '20'
        },
        editProfileBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },

        sectionCard: { marginHorizontal: 20, marginBottom: 20 },
        sectionHeaderRow: { marginHorizontal: 24, marginBottom: 12, marginTop: 10 },
        sectionHeader: { fontSize: 11, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1 },
        infoList: {
            backgroundColor: COLORS.card,
            borderRadius: 20,
            paddingVertical: 4,
            paddingHorizontal: 16,
        },
        infoRow: { paddingVertical: 14 },
        rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border + '50' },
        infoLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
        infoIconStatic: { width: 20, textAlign: 'center' },
        infoLabel: { fontSize: 10, fontWeight: "700", color: COLORS.textMuted, marginBottom: 2, textTransform: 'uppercase' },
        infoValue: { fontSize: 14, fontWeight: "600", color: COLORS.text },

        menuCard: {
            marginHorizontal: 20,
            backgroundColor: COLORS.card,
            borderRadius: 20,
            paddingHorizontal: 16,
            marginBottom: 24
        },
        menuItem: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 16
        },
        menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
        menuItemText: { fontSize: 14, fontWeight: "600", color: COLORS.text },

        logoutButton: {
            marginHorizontal: 20,
            height: 52,
            borderRadius: 16,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            marginTop: 10,
        },
        logoutButtonText: { fontSize: 14, fontWeight: "800" }
    });

export default ProfileScreen;
