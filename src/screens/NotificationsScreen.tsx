import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useThemePalette from "../hooks/useThemePalette";
import NotificationService from "../services/NotificationService";

const NotificationsScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const isFocused = useIsFocused();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            // This fetches scheduled (pending) notifications
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            setNotifications(scheduled);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            fetchNotifications();
        }
    }, [fetchNotifications, isFocused]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleClearAll = () => {
        Alert.alert(
            "Clear All?",
            "This will cancel all scheduled rent and checkout reminders. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        await NotificationService.cancelAllNotifications();
                        fetchNotifications();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        const type = item.content.data?.type;
        const iconName = type === 'RENT_DUE' ? 'home-currency' : 'package-variant-closed-check';
        const color = type === 'RENT_DUE' ? COLORS.primary : COLORS.warning;

        return (
            <View style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <MaterialCommunityIcons name={iconName as any} size={24} color={color} />
                </View>
                <View style={styles.contentBox}>
                    <Text style={styles.title}>{item.content.title}</Text>
                    <Text style={styles.body}>{item.content.body}</Text>
                    <View style={styles.footer}>
                        <Feather name="clock" size={12} color={COLORS.textMuted} />
                        <Text style={styles.footerText}>
                            {item.trigger.type === 'date'
                                ? `Scheduled for: ${new Date(item.trigger.timestamp).toLocaleDateString()}`
                                : 'Recurring Reminder'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={async () => {
                        await NotificationService.cancelNotification(item.identifier);
                        fetchNotifications();
                    }}
                >
                    <Feather name="x" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>
        );
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        appBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            height: 60,
            backgroundColor: COLORS.card,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
        },
        appBarButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
        appBarTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

        listContent: { padding: 16, paddingBottom: 100 },
        card: {
            backgroundColor: COLORS.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        iconBox: {
            width: 48,
            height: 48,
            borderRadius: 14,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
        },
        contentBox: { flex: 1 },
        title: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
        body: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 8 },
        footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        footerText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
        cancelBtn: { padding: 8, marginLeft: 8 },

        emptyContainer: {
            marginTop: 100,
            alignItems: 'center',
            justifyContent: 'center',
        },
        emptyTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: COLORS.text,
            marginTop: 16,
        },
        emptySubtitle: {
            fontSize: 14,
            color: COLORS.textMuted,
            marginTop: 8,
            textAlign: 'center',
            paddingHorizontal: 40,
        },
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.appBarButton}>
                    <Feather name="menu" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Scheduled Reminders</Text>
                <TouchableOpacity onPress={handleClearAll} style={styles.appBarButton}>
                    <Feather name="trash-2" size={18} color={COLORS.danger} />
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.identifier}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="bell-off" size={64} color={COLORS.textMuted} />
                            <Text style={styles.emptyTitle}>No scheduled reminders</Text>
                            <Text style={styles.emptySubtitle}>Automated rent and checkout alerts will appear here when configured for tenants.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default NotificationsScreen;
