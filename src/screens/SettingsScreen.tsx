import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Feather } from "@expo/vector-icons";

const SettingsScreen = () => {
    const { colors, isDark, toggleTheme } = useTheme();
    const { user, logout } = useAuth();

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

    const SettingItem = ({ icon, label, value, onPress, type = 'chevron', color }: any) => (
        <TouchableOpacity
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: (color || colors.primary) + '15' }]}>
                    <Feather name={icon} size={18} color={color || colors.primary} />
                </View>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{label}</Text>
            </View>
            <View style={styles.itemRight}>
                {type === 'switch' ? (
                    <Switch value={value} onValueChange={onPress} />
                ) : type === 'value' ? (
                    <Text style={[styles.itemValue, { color: colors.textSecondary }]}>{value}</Text>
                ) : (
                    <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarText}>{user?.full_name?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: colors.text }]}>{user?.full_name || "Manager Account"}</Text>
                        <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MY PROFILE</Text>
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SettingItem
                        icon="phone"
                        label="Phone"
                        type="value"
                        value={user?.phone || "Not Set"}
                    />
                    <SettingItem
                        icon="user"
                        label="Gender"
                        type="value"
                        value={user?.gender || "Not Set"}
                    />
                    <SettingItem
                        icon="calendar"
                        label="Date of Birth"
                        type="value"
                        value={user?.dob || "Not Set"}
                    />
                    <SettingItem
                        icon="shield"
                        label="Role"
                        type="value"
                        value={user?.role}
                    />
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SettingItem
                        icon="moon"
                        label="Dark Mode"
                        type="switch"
                        value={isDark}
                        onPress={toggleTheme}
                    />
                    <SettingItem
                        icon="bell"
                        label="Notifications"
                        type="chevron"
                        onPress={() => { }}
                    />
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SYSTEM</Text>
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SettingItem
                        icon="info"
                        label="App Version"
                        type="value"
                        value="1.0.0 (Expo)"
                    />
                    <SettingItem
                        icon="lock"
                        label="Privacy Policy"
                        onPress={() => { }}
                    />
                    <SettingItem
                        icon="help-circle"
                        label="Help & Support"
                        onPress={() => { }}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.logoutButton, { borderColor: '#ef4444' }]}
                    onPress={handleLogout}
                >
                    <Feather name="log-out" size={18} color="#ef4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingBottom: 10 },
    title: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
    scrollContent: { padding: 20 },
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center"
    },
    avatarText: { color: "#fff", fontSize: 24, fontWeight: "800" },
    profileInfo: { marginLeft: 16 },
    profileName: { fontSize: 18, fontWeight: "800" },
    profileEmail: { fontSize: 14, fontWeight: "600", marginTop: 2 },
    sectionTitle: { fontSize: 12, fontWeight: "800", marginLeft: 8, marginBottom: 8, letterSpacing: 1 },
    section: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: "hidden",
        marginBottom: 24
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1
    },
    itemLeft: { flexDirection: "row", alignItems: "center" },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center"
    },
    itemLabel: { fontSize: 15, fontWeight: "700", marginLeft: 12 },
    itemRight: {},
    itemValue: { fontSize: 14, fontWeight: "700" },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        marginTop: 12,
        gap: 10
    },
    logoutText: { color: '#ef4444', fontSize: 16, fontWeight: "800" }
});

export default SettingsScreen;
