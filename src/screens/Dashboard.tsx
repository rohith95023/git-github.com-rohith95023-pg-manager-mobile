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
            // Balance reconciliation (optional but ensures accuracy like web sync)
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

    const KPICard = ({ title, value, icon, iconType = "Feather", color = COLORS.primary }: any) => {
        const IconComponent = iconType === "Material" ? MaterialCommunityIcons : Feather;
        return (
            <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: color + "15" }]}>
                    <IconComponent name={icon as any} size={20} color={color} />
                </View>
                <Text style={styles.kpiValue}>{value}</Text>
                <Text style={styles.kpiTitle}>{title}</Text>
            </View>
        );
    };

    const SectionHeader = ({ title, onSeeAll }: any) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {onSeeAll && (
                <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
                    <Text style={styles.seeAllText}>View All</Text>
                    <Feather name="arrow-right" size={12} color={COLORS.primary} />
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Header Info */}
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeSubtitle}>Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</Text>
                    <Text style={styles.dateText}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                </View>

                {/* KPI Grid */}
                <View style={styles.kpiGrid}>
                    <KPICard title="Total PGs" value={stats?.totalPGs || 0} icon="home" />
                    <KPICard title="Active Rooms" value={stats?.activeRooms || 0} icon="door-open" iconType="Material" color={COLORS.success} />
                    <KPICard title="Residents" value={stats?.totalTenants || 0} icon="users" color={COLORS.warning} />
                    <KPICard title="Active Beds" value={(stats?.totalBeds || 0) - (stats?.maintenanceBeds || 0)} icon="bed" iconType="Material" color={COLORS.primary} />
                    <KPICard title="Available" value={stats?.availableBeds || 0} icon="bed-outline" iconType="Material" color={COLORS.success} />
                    <KPICard title="Occupancy" value={`${stats?.occupancyRate || 0}%`} icon="percent" color="#8884d8" />
                    <KPICard title="Daily Stays" value={stats?.dailyActiveTenants || 0} icon="clock" color={COLORS.primary} />
                    <KPICard title="Monthly Stays" value={stats?.monthlyActiveTenants || 0} icon="calendar" color={COLORS.success} />
                </View>

                {/* Financial Summary Grouped Card */}
                <View style={styles.financeCard}>
                    <View style={styles.financeHeader}>
                        <Text style={styles.financeTitle}>Financial Summary</Text>
                        <Feather name="trending-up" size={18} color={COLORS.success} />
                    </View>
                    <View style={styles.financeGrid}>
                        <View style={styles.financeItem}>
                            <Text style={styles.financeLabel}>Monthly Revenue</Text>
                            <Text style={[styles.financeValue, { color: COLORS.success }]}>₹{(stats?.monthlyRevenue || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.financeItem}>
                            <Text style={styles.financeLabel}>Net Profit</Text>
                            <Text style={[styles.financeValue, { color: COLORS.primary }]}>₹{(stats?.netProfit || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.financeItem}>
                            <Text style={styles.financeLabel}>All-time Revenue</Text>
                            <Text style={styles.financeValue}>₹{(stats?.totalRevenue || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.financeItem}>
                            <Text style={styles.financeLabel}>Pending Dues</Text>
                            <Text style={[styles.financeValue, { color: COLORS.danger }]}>₹{(stats?.pendingDues || 0).toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Daily Stay Tenants */}
                <SectionHeader title="Daily Stay Tenants" onSeeAll={() => navigation.navigate("Residents")} />
                {dailyTenants.length > 0 ? (
                    <View style={styles.listContainer}>
                        {dailyTenants.map((t: any) => {
                            const daily = Array.isArray(t.daily_stay_details) ? t.daily_stay_details[0] : t.daily_stay_details;
                            const moveIn = t.move_in_date || daily?.move_in_date;
                            const vacate = t.vacate_date || daily?.vacate_date;
                            const rentPerDay = daily?.rent_per_day || t.rent_per_day || 0;
                            const maintenance = daily?.maintenance_amount || t.maintenance_amount || 0;
                            const paid = Number(daily?.paid_amount || t.paid_amount || 0);

                            let balance = 0;
                            if (moveIn && vacate) {
                                const start = new Date(moveIn);
                                const end = new Date(vacate);
                                let diffDays = 1;
                                if (end > start) {
                                    diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                }
                                const totalRentCount = (diffDays * Number(rentPerDay)) + Number(maintenance);
                                balance = Math.max(0, totalRentCount - paid);
                            }

                            return (
                                <TouchableOpacity key={t.id} style={styles.listItem} activeOpacity={0.7} onPress={() => navigation.navigate("ResidentDetail", { tenant: t })}>
                                    <View style={styles.listIcon}>
                                        <View style={[styles.avatar, { backgroundColor: COLORS.warning + "20" }]}>
                                            <Text style={[styles.avatarText, { color: COLORS.warning }]}>{t.full_name[0]}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.listMain}>
                                        <Text style={styles.listTitle}>{t.full_name}</Text>
                                        <Text style={styles.listSubTitle}>Room {t.rooms?.room_number || "N/A"} • {t.pgs?.name || "N/A"}</Text>
                                        {balance > 0 && (
                                            <View style={[styles.dueBadge, { marginTop: 4, alignSelf: 'flex-start' }]}>
                                                <Text style={styles.dueBadgeText}>DUE: ₹{balance.toLocaleString()}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.listRight}>
                                        <Text style={styles.listPrice}>₹{rentPerDay}/d</Text>
                                        {vacate && (
                                            <Text style={styles.listDate}>Ends: {new Date(vacate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Feather name="clock" size={24} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No active daily stays</Text>
                    </View>
                )}

                {/* Recent Residents */}
                <SectionHeader title="Recent Residents" onSeeAll={() => navigation.navigate("Residents")} />
                {stats?.recentResidents?.length > 0 ? (
                    <View style={styles.listContainer}>
                        {stats.recentResidents.map((r: any) => (
                            <TouchableOpacity key={r.id} style={styles.listItem} activeOpacity={0.7}>
                                <View style={styles.listIcon}>
                                    <View style={[styles.avatar, { backgroundColor: COLORS.primary + "20" }]}>
                                        <Text style={[styles.avatarText, { color: COLORS.primary }]}>{r.full_name[0]}</Text>
                                    </View>
                                </View>
                                <View style={styles.listMain}>
                                    <Text style={styles.listTitle}>{r.full_name}</Text>
                                    <Text style={styles.listSubTitle}>{r.pgs?.name || "N/A"}</Text>
                                </View>
                                <View style={styles.listRight}>
                                    <Text style={styles.listDate}>{new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Feather name="users" size={24} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No recent movement</Text>
                    </View>
                )}

                {/* Recent Payments */}
                <SectionHeader title="Recent Payments" onSeeAll={() => navigation.navigate("Finance")} />
                {recentPayments.length > 0 ? (
                    <View style={styles.listContainer}>
                        {recentPayments.map((p: any) => (
                            <TouchableOpacity key={p.id} style={styles.listItem} activeOpacity={0.7}>
                                <View style={styles.listIcon}>
                                    <View style={[styles.avatar, { backgroundColor: COLORS.success + "20" }]}>
                                        <Feather name="dollar-sign" size={16} color={COLORS.success} />
                                    </View>
                                </View>
                                <View style={styles.listMain}>
                                    <Text style={styles.listTitle} numberOfLines={1}>{p.tenants?.full_name || "Unknown"}</Text>
                                    <Text style={styles.listSubTitle}>{p.pgs?.name || "N/A"} • {p.type} • {p.payment_method}</Text>
                                </View>
                                <View style={styles.listRight}>
                                    <Text style={styles.paymentAmount}>₹{p.amount?.toLocaleString()}</Text>
                                    <Text style={styles.listDate}>{p.payment_date || "Today"}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Feather name="credit-card" size={24} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No recent payments</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        scrollContent: { padding: 20 },
        welcomeSection: { marginBottom: 24, marginTop: 8 },
        welcomeSubtitle: { fontSize: 20, fontWeight: "800", color: COLORS.text, letterSpacing: -0.5 },
        dateText: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, fontWeight: "600" },
        kpiGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            marginBottom: 24
        },
        kpiCard: {
            width: "48%",
            backgroundColor: COLORS.card,
            padding: 16,
            borderRadius: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        kpiIconBox: {
            width: 36,
            height: 36,
            borderRadius: 10,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12
        },
        kpiValue: { fontSize: 20, fontWeight: "800", color: COLORS.text, marginBottom: 2 },
        kpiTitle: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", textTransform: "uppercase" },

        financeCard: {
            backgroundColor: COLORS.card,
            borderRadius: 24,
            padding: 20,
            marginBottom: 28,
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10
        },
        financeHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border
        },
        financeTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
        financeGrid: { flexDirection: "row", flexWrap: "wrap" },
        financeItem: { width: "50%", marginBottom: 16 },
        financeLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
        financeValue: { fontSize: 16, fontWeight: "900", color: COLORS.text },

        sectionHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            marginTop: 8
        },
        sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
        seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
        seeAllText: { fontSize: 13, color: COLORS.primary, fontWeight: "700" },

        listContainer: { gap: 12, marginBottom: 20 },
        listItem: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            padding: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        listIcon: { marginRight: 12 },
        avatar: {
            width: 44,
            height: 44,
            borderRadius: 14,
            justifyContent: "center",
            alignItems: "center"
        },
        avatarText: { fontSize: 18, fontWeight: "800" },
        listMain: { flex: 1 },
        listTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
        listSubTitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
        listRight: { alignItems: "flex-end" },
        listPrice: { fontSize: 14, fontWeight: "800", color: COLORS.warning },
        listDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
        paymentAmount: { fontSize: 15, fontWeight: "900", color: COLORS.success },
        dueBadge: {
            backgroundColor: "rgba(255, 71, 87, 0.15)",
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        dueBadgeText: {
            color: "#ff4757",
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.2,
        },

        emptyCard: {
            backgroundColor: COLORS.card,
            borderRadius: 20,
            padding: 24,
            alignItems: "center",
            gap: 12,
            borderStyle: "dashed",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            marginBottom: 20
        },
        emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "600" }
    });

export default Dashboard;
