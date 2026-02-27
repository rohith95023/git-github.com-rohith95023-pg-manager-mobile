import React, { useState, useEffect, useCallback } from "react";
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
import { useTheme } from "../context/ThemeContext";
import { statsAPI, paymentAPI, tenantAPI } from "../services/api";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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

const Dashboard = ({ navigation, route }: any) => {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [recentPayments, setRecentPayments] = useState<any[]>([]);
    const [dailyTenants, setDailyTenants] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, paymentsRes, tenantsRes]: any = await Promise.all([
                statsAPI.getDashboardStats(),
                paymentAPI.getAll(),
                tenantAPI.getActive()
            ]);

            if (statsRes?.data) setStats(statsRes.data);
            setRecentPayments((paymentsRes || []).slice(0, 5));
            setDailyTenants((tenantsRes || []).filter((t: any) => t.stay_type === 'DAILY').slice(0, 5));
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
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }]}>
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
                    <KPICard title="Active Beds" value={stats?.occupiedBeds || 0} icon="bed" iconType="Material" color={COLORS.primary} />
                    <KPICard title="Available" value={stats?.availableBeds || 0} icon="bed-outline" iconType="Material" color={COLORS.success} />
                    <KPICard title="Occupancy" value={`${stats?.occupancyRate || 0}%`} icon="percent" color="#8884d8" />
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
                        {dailyTenants.map((t: any) => (
                            <TouchableOpacity key={t.id} style={styles.listItem} activeOpacity={0.7}>
                                <View style={styles.listIcon}>
                                    <View style={[styles.avatar, { backgroundColor: COLORS.warning + "20" }]}>
                                        <Text style={[styles.avatarText, { color: COLORS.warning }]}>{t.full_name[0]}</Text>
                                    </View>
                                </View>
                                <View style={styles.listMain}>
                                    <Text style={styles.listTitle}>{t.full_name}</Text>
                                    <Text style={styles.listSubTitle}>Room {t.rooms?.room_number || "N/A"}</Text>
                                </View>
                                <View style={styles.listRight}>
                                    <Text style={styles.listPrice}>₹{t.daily_stay_details?.rent_per_day}/d</Text>
                                    <Text style={styles.listDate}>Ends: {new Date(t.daily_stay_details?.vacate_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
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
                                    <Text style={styles.listSubTitle}>{p.type} • {p.payment_method}</Text>
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

const styles = StyleSheet.create({
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
