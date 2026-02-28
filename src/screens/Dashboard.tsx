import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    Pressable
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { statsAPI, paymentAPI, tenantAPI } from "../services/api";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import { useRefreshOnForeground } from "../hooks/useRefreshOnForeground";

const { width } = Dimensions.get("window");

const Dashboard = ({ navigation, route }: any) => {
    const { user } = useAuth();
    const isFocused = useIsFocused();
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [recentPayments, setRecentPayments] = useState<any[]>([]);
    const [dailyTenants, setDailyTenants] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        try {
            // Balance reconciliation
            try {
                await statsAPI.reconcileAllBalances();
            } catch (err) {
                console.warn("Auto-reconciliation failed:", err);
            }

            const [statsRes, paymentsRes, tenantsRes]: any = await Promise.all([
                statsAPI.getDashboardStats(),
                paymentAPI.getAll(),
                tenantAPI.getActive()
            ]);

            if (statsRes) setStats(statsRes.data || statsRes);
            setRecentPayments((paymentsRes?.data || paymentsRes || []).slice(0, 5));
            setDailyTenants((tenantsRes?.data || tenantsRes || []).filter((t: any) => t.stay_type === 'DAILY').slice(0, 5));
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        if (route.params?.refresh) {
            onRefresh();
        }
    }, [route.params?.refresh]);

    useRefreshOnForeground(fetchData, isFocused);

    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [fetchData, isFocused]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Top App Bar */}
            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.appBarButton}>
                    <Feather name="menu" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Overview</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                    <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Modernized Welcome Section */}
                <View style={styles.welcomeCard}>
                    <View>
                        <Text style={styles.welcomeTitle}>Hello{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : '!'}</Text>
                        <Text style={styles.dateLabel}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <View style={styles.mainKPIBox}>
                        <Text style={styles.mainKPIValue}>{stats?.occupancyRate || 0}%</Text>
                        <Text style={styles.mainKPILabel}>Occupancy</Text>
                    </View>
                </View>

                {/* Performance Highlights Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <View style={[styles.iconPill, { backgroundColor: COLORS.primary + "15" }]}>
                            <Feather name="home" size={14} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statValue}>{stats?.totalPGs || 0}</Text>
                        <Text style={styles.statLabel}>Properties</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconPill, { backgroundColor: COLORS.success + "15" }]}>
                            <Feather name="box" size={14} color={COLORS.success} />
                        </View>
                        <Text style={styles.statValue}>{stats?.activeRooms || 0}</Text>
                        <Text style={styles.statLabel}>Rooms</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconPill, { backgroundColor: COLORS.warning + "15" }]}>
                            <Feather name="users" size={14} color={COLORS.warning} />
                        </View>
                        <Text style={styles.statValue}>{stats?.totalTenants || 0}</Text>
                        <Text style={styles.statLabel}>Residents</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconPill, { backgroundColor: COLORS.danger + "15" }]}>
                            <Feather name="clock" size={14} color={COLORS.danger} />
                        </View>
                        <Text style={styles.statValue}>{stats?.dailyActiveTenants || 0}</Text>
                        <Text style={styles.statLabel}>Daily Stays</Text>
                    </View>
                </View>

                {/* Financial Overview Card */}
                <View style={styles.financialSummary}>
                    <Text style={styles.sectionTitle}>Financials</Text>
                    <View style={styles.financeGrid}>
                        <View style={styles.financeItem}>
                            <Text style={styles.financeLabel}>Revenue</Text>
                            <Text style={[styles.financeValue, { color: COLORS.success }]}>₹{(stats?.monthlyRevenue || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.financeItem}>
                            <Text style={styles.financeLabel}>Profit</Text>
                            <Text style={[styles.financeValue, { color: COLORS.primary }]}>₹{(stats?.netProfit || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.financeItem}>
                            <Text style={styles.financeLabel}>Due</Text>
                            <Text style={[styles.financeValue, { color: COLORS.danger }]}>₹{(stats?.pendingDues || 0).toLocaleString()}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.detailsBtn}
                            onPress={() => navigation.navigate("ProfitLoss")}
                        >
                            <Text style={styles.detailsBtnText}>Analysis</Text>
                            <Feather name="arrow-right" size={12} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Daily Stay Alerts (Simplified) */}
                {dailyTenants.length > 0 && (
                    <View style={styles.listSection}>
                        <View style={styles.listHeader}>
                            <Text style={styles.sectionTitle}>Daily Residents</Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Residents")}>
                                <Text style={styles.seeAllText}>See all</Text>
                            </TouchableOpacity>
                        </View>
                        {dailyTenants.map((t: any) => (
                            <TouchableOpacity
                                key={t.id}
                                style={styles.summaryItem}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate("ResidentDetail", { tenant: t })}
                            >
                                <View style={[styles.avatarMini, { backgroundColor: COLORS.warning + "20" }]}>
                                    <Text style={[styles.avatarText, { color: COLORS.warning }]}>{t.full_name[0]}</Text>
                                </View>
                                <View style={styles.itemMain}>
                                    <Text style={styles.itemTitle}>{t.full_name}</Text>
                                    <Text style={styles.itemSub}>{t.pgs?.name} • Room {t.rooms?.room_number}</Text>
                                </View>
                                <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Recent Payments (Modern density) */}
                <View style={styles.listSection}>
                    <View style={styles.listHeader}>
                        <Text style={styles.sectionTitle}>Recent Payments</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Finance")}>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    {recentPayments.map((p: any) => (
                        <TouchableOpacity
                            key={p.id}
                            style={styles.summaryItem}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.avatarMini, { backgroundColor: COLORS.success + "20" }]}>
                                <Feather name="check" size={12} color={COLORS.success} />
                            </View>
                            <View style={styles.itemMain}>
                                <Text style={styles.itemTitle} numberOfLines={1}>{p.tenants?.full_name}</Text>
                                <Text style={styles.itemSub}>{p.type} • {p.payment_method}</Text>
                            </View>
                            <Text style={styles.itemPrice}>+₹{p.amount?.toLocaleString()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (COLORS: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },

        // App Bar
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
        appBarTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },

        scrollContent: { padding: 16 },

        // Welcome Card
        welcomeCard: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 24,
            backgroundColor: COLORS.primary,
            borderRadius: 24,
            marginBottom: 20,
        },
        welcomeTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
        dateLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '600' },
        mainKPIBox: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
        mainKPIValue: { fontSize: 18, fontWeight: '900', color: '#fff' },
        mainKPILabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginTop: 2 },

        // Quick Stats
        statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
        statBox: {
            width: (width - 44) / 2,
            backgroundColor: COLORS.card,
            padding: 16,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        iconPill: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
        statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
        statLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },

        // Financials
        financialSummary: {
            backgroundColor: COLORS.card,
            padding: 20,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 24,
        },
        sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
        financeGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        financeItem: { flex: 1 },
        financeLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '800', textTransform: 'uppercase' },
        financeValue: { fontSize: 15, fontWeight: '900', color: COLORS.text, marginTop: 4 },
        detailsBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: COLORS.bg,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12
        },
        detailsBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },

        // List Sections
        listSection: { marginBottom: 24 },
        listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
        seeAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
        summaryItem: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.card,
            padding: 12,
            borderRadius: 16,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        avatarMini: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        avatarText: { fontSize: 14, fontWeight: '900' },
        itemMain: { flex: 1 },
        itemTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
        itemSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
        itemPrice: { fontSize: 14, fontWeight: '800', color: COLORS.success }
    });

export default Dashboard;
