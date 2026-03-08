import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import SegmentedControl from "../components/common/SegmentedControl";
import { useData } from "../context/DataContext";
import useThemePalette from "../hooks/useThemePalette";
import NotificationService from "../services/NotificationService";

const SEGMENTS = [
    { label: "Overdue Alerts", value: "overdue" },
    { label: "Scheduled", value: "scheduled" },
];

const NotificationsScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const isFocused = useIsFocused();
    const [loadingScheduled, setLoadingScheduled] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [scheduledNotifs, setScheduledNotifs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("overdue");

    // Pull live overdue/upcoming data from context
    const { dashboardStats, invoices, tenants, loading: dataLoading, refresh: refreshData } = useData();

    const fetchScheduled = useCallback(async () => {
        try {
            setLoadingScheduled(true);
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            setScheduledNotifs(scheduled);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoadingScheduled(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            fetchScheduled();
        }
    }, [fetchScheduled, isFocused]);

    const onRefresh = () => {
        setRefreshing(true);
        refreshData();
        fetchScheduled();
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
                        fetchScheduled();
                    }
                }
            ]
        );
    };

    // Build tenant lookup map from context tenants
    const tenantMap = useMemo(() => {
        const m: Record<string, any> = {};
        tenants.forEach((t: any) => { m[t.id] = t; });
        return m;
    }, [tenants]);

    // Build overdue alerts from invoices, cross-referencing tenant names
    const overdueAlerts = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const unpaid = invoices.filter((inv: any) =>
            inv.status === "UNPAID" || inv.status === "PARTIAL" ||
            inv.status === "unpaid" || inv.status === "partial"
        );

        return unpaid
            .map((inv: any) => {
                const endDate = inv.billing_period_end ? new Date(inv.billing_period_end) : null;
                if (!endDate) return null;
                endDate.setHours(0, 0, 0, 0);
                const daysOverdue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
                const balanceDue = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
                if (balanceDue <= 0) return null;
                // Resolve tenant: try nested first, then context map
                const tenant = inv.tenants || tenantMap[inv.tenant_id] || null;
                const pg = inv.pgs || (tenant?.pgs) || null;
                return {
                    id: inv.id,
                    tenantName: tenant?.full_name || inv.tenant_name || "Unknown Resident",
                    pgName: pg?.name || inv.pg_name || (tenant?.pgs?.name) || "—",
                    type: inv.type || "RENT",
                    amount: balanceDue,
                    dueDate: endDate,
                    daysOverdue,
                    isOverdue: endDate < now,
                    isUpcoming: endDate >= now,
                };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);
    }, [invoices, tenantMap]);

    const getTypeIcon = (type: string) => {
        switch ((type || "").toUpperCase()) {
            case "RENT": return "home-currency-usd";
            case "DEPOSIT": return "bank-outline";
            case "OPENING_BALANCE": return "scale-balance";
            case "MAINTENANCE": return "wrench-outline";
            default: return "file-document-outline";
        }
    };

    const renderOverdueItem = ({ item }: { item: any }) => {
        const isOverdue = item.isOverdue;
        const accentColor = isOverdue ? COLORS.danger : COLORS.warning;
        const daysText = isOverdue
            ? item.daysOverdue === 0 ? "Due today" : `${item.daysOverdue}d overdue`
            : `Due in ${Math.abs(item.daysOverdue)}d`;

        return (
            <View style={[styles.alertCard, { borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
                <View style={[styles.alertIconBox, { backgroundColor: accentColor + "15" }]}>
                    <MaterialCommunityIcons name={getTypeIcon(item.type) as any} size={22} color={accentColor} />
                </View>
                <View style={styles.alertBody}>
                    <Text style={styles.alertTitle} numberOfLines={1}>{item.tenantName}</Text>
                    <Text style={styles.alertSub} numberOfLines={1}>
                        {item.pgName} • {(item.type || "RENT").charAt(0) + (item.type || "RENT").slice(1).toLowerCase()}
                    </Text>
                    <View style={styles.alertFooter}>
                        <View style={[styles.daysBadge, { backgroundColor: accentColor + "12" }]}>
                            <Feather name="clock" size={10} color={accentColor} />
                            <Text style={[styles.daysBadgeText, { color: accentColor }]}>{daysText}</Text>
                        </View>
                        <Text style={[styles.alertAmount, { color: accentColor }]}>
                            ₹{Number(item.amount).toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderScheduledItem = ({ item }: { item: any }) => {
        const type = item.content.data?.type;
        const iconName = type === 'RENT_DUE' ? 'home-currency-usd' : 'package-variant-closed-check';
        const color = type === 'RENT_DUE' ? COLORS.primary : COLORS.warning;

        return (
            <View style={[styles.alertCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
                <View style={[styles.alertIconBox, { backgroundColor: color + "15" }]}>
                    <MaterialCommunityIcons name={iconName as any} size={22} color={color} />
                </View>
                <View style={styles.alertBody}>
                    <Text style={styles.alertTitle}>{item.content.title}</Text>
                    <Text style={styles.alertSub}>{item.content.body}</Text>
                    <View style={styles.alertFooter}>
                        <View style={[styles.daysBadge, { backgroundColor: color + "12" }]}>
                            <Feather name="clock" size={10} color={color} />
                            <Text style={[styles.daysBadgeText, { color }]}>
                                {item.trigger.type === 'date'
                                    ? `Scheduled: ${new Date(item.trigger.timestamp).toLocaleDateString()}`
                                    : 'Recurring'}
                            </Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={async () => {
                        await NotificationService.cancelNotification(item.identifier);
                        fetchScheduled();
                    }}
                >
                    <Feather name="x" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>
        );
    };

    const overdueCount = overdueAlerts.filter((a: any) => a.isOverdue).length;
    const upcomingCount = overdueAlerts.filter((a: any) => a.isUpcoming).length;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.appBarButton}>
                    <Feather name="menu" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Notifications</Text>
                {activeTab === "scheduled" ? (
                    <TouchableOpacity onPress={handleClearAll} style={styles.appBarButton}>
                        <Feather name="trash-2" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                        <Feather name="refresh-cw" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Summary pills for overdue tab */}
            {activeTab === "overdue" && (
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryPill, { borderColor: COLORS.danger + "40" }]}>
                        <View style={[styles.pillDot, { backgroundColor: COLORS.danger }]} />
                        <Text style={styles.pillLabel}>Overdue</Text>
                        <Text style={[styles.pillValue, { color: COLORS.danger }]}>{overdueCount}</Text>
                    </View>
                    <View style={[styles.summaryPill, { borderColor: COLORS.warning + "40" }]}>
                        <View style={[styles.pillDot, { backgroundColor: COLORS.warning }]} />
                        <Text style={styles.pillLabel}>Upcoming</Text>
                        <Text style={[styles.pillValue, { color: COLORS.warning }]}>{upcomingCount}</Text>
                    </View>
                    <View style={[styles.summaryPill, { borderColor: COLORS.border }]}>
                        <MaterialCommunityIcons name="bell-ring-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.pillLabel}>Reminders</Text>
                        <Text style={[styles.pillValue, { color: COLORS.primary }]}>{scheduledNotifs.length}</Text>
                    </View>
                </View>
            )}

            {/* Segment */}
            <View style={styles.segmentWrap}>
                <SegmentedControl
                    options={SEGMENTS}
                    value={activeTab}
                    onChange={setActiveTab}
                />
            </View>

            {activeTab === "overdue" ? (
                dataLoading && !refreshing ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator color={COLORS.primary} size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={overdueAlerts as any[]}
                        keyExtractor={(item: any) => item.id}
                        renderItem={renderOverdueItem as any}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="check-circle-outline" size={64} color={COLORS.success} />
                                <Text style={styles.emptyTitle}>All Clear!</Text>
                                <Text style={styles.emptySubtitle}>No outstanding or overdue invoices found.</Text>
                            </View>
                        }
                    />
                )
            ) : (
                loadingScheduled && !refreshing ? (
                    <View style={styles.loaderWrap}>
                        <ActivityIndicator color={COLORS.primary} size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={scheduledNotifs}
                        keyExtractor={(item) => item.identifier}
                        renderItem={renderScheduledItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Feather name="bell-off" size={64} color={COLORS.textMuted} />
                                <Text style={styles.emptyTitle}>No scheduled reminders</Text>
                                <Text style={styles.emptySubtitle}>
                                    Automated rent and checkout alerts will appear here when configured.
                                </Text>
                            </View>
                        }
                    />
                )
            )}
        </SafeAreaView>
    );
};

const createStyles = (COLORS: any) =>
    StyleSheet.create({
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

        summaryRow: {
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 16,
            paddingTop: 14,
        },
        summaryPill: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: COLORS.card,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 10,
            borderWidth: 1,
        },
        pillDot: { width: 6, height: 6, borderRadius: 3 },
        pillLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, flex: 1 },
        pillValue: { fontSize: 14, fontWeight: '900' },

        segmentWrap: { padding: 16, paddingBottom: 8 },

        loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        listContent: { padding: 16, paddingBottom: 100 },

        alertCard: {
            backgroundColor: COLORS.card,
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 2,
        },
        alertIconBox: {
            width: 44,
            height: 44,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        alertBody: { flex: 1 },
        alertTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
        alertSub: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 8 },
        alertFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        alertAmount: { fontSize: 14, fontWeight: '900' },
        daysBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
        },
        daysBadgeText: { fontSize: 10, fontWeight: '800' },
        dismissBtn: { padding: 8 },

        emptyContainer: {
            marginTop: 80,
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

export default NotificationsScreen;
