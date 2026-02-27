import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { statsAPI, paymentAPI, tenantAPI } from "../services/api";
import { Feather } from "@expo/vector-icons";

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20 },
    header: { marginBottom: 24 },
    welcomeText: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
    subtitle: { fontSize: 14, marginTop: 4, fontWeight: "500" },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
    statCard: { width: "48%", padding: 16, borderRadius: 20, marginBottom: 16, borderWidth: 1 },
    statIconContainer: { marginBottom: 12 },
    statValue: { fontSize: 20, fontWeight: "800", marginBottom: 2 },
    statTitle: { fontSize: 12, fontWeight: "600" },
    revenueCard: { padding: 24, borderRadius: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    revenueTitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600", marginBottom: 4 },
    revenueValue: { color: "#fff", fontSize: 28, fontWeight: "900" },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: "800" },
    listItem: { padding: 16, borderRadius: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderWidth: 1 },
    listInfo: { flex: 1 },
    listName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
    listSubtitle: { fontSize: 12, fontWeight: "500" },
    listMeta: { fontSize: 11, fontWeight: "600" },
    emptyText: { textAlign: "center", marginTop: 20, fontStyle: "italic" }
});

// Basic Stat Card Component
const MobileStatCard = ({ title, value, icon, colors, isDark }: any) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statIconContainer}>
            <Feather name={icon} size={20} color={colors.primary} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
);

const Dashboard = () => {
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

            setStats(statsRes.data);
            setRecentPayments((paymentsRes || []).slice(0, 5));
            setDailyTenants((tenantsRes || []).filter((t: any) => t.stay_type === 'DAILY').slice(0, 5));
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Stats Grid - 2 per row */}
                <View style={styles.statsGrid}>
                    <MobileStatCard title="Total PGs" value={stats?.totalPGs || 0} icon="home" colors={colors} isDark={isDark} />
                    <MobileStatCard title="Rooms" value={stats?.totalRooms || 0} icon="box" colors={colors} isDark={isDark} />
                    <MobileStatCard title="Residents" value={stats?.totalTenants || 0} icon="users" colors={colors} isDark={isDark} />
                    <MobileStatCard title="Occupancy" value={stats?.totalBeds > 0 ? `${Math.round((stats.occupiedBeds / stats.totalBeds) * 100)}%` : "0%"} icon="pie-chart" colors={colors} isDark={isDark} />
                </View>

                {/* Main Revenue Card */}
                <View style={[styles.revenueCard, { backgroundColor: colors.primary }]}>
                    <View>
                        <Text style={styles.revenueTitle}>Total Revenue</Text>
                        <Text style={styles.revenueValue}>₹{(stats?.totalRevenue || 0).toLocaleString()}</Text>
                    </View>
                    <Feather name="trending-up" size={40} color="rgba(255,255,255,0.3)" />
                </View>

                {/* Daily Stay Tenants Section */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Stay Tenants</Text>
                    <Feather name="clock" size={16} color={colors.primary} />
                </View>
                {dailyTenants.length > 0 ? (
                    dailyTenants.map((t: any) => (
                        <View key={t.id} style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.listInfo}>
                                <Text style={[styles.listName, { color: colors.text }]}>{t.full_name}</Text>
                                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>Room {t.rooms?.room_number || "N/A"}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '800' }}>₹{(t.daily_stay_details?.rent_per_day || 0)}/day</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Ends: {new Date(t.daily_stay_details?.vacate_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active daily stays</Text>
                )}

                {/* Recent Residents Section */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Residents</Text>
                    <Feather name="users" size={16} color={colors.primary} />
                </View>
                {stats?.recentResidents?.length > 0 ? (
                    stats.recentResidents.map((r: any) => (
                        <View key={r.id} style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.listInfo}>
                                <Text style={[styles.listName, { color: colors.text }]}>{r.full_name}</Text>
                                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{r.pgs?.name || "N/A"}</Text>
                            </View>
                            <Text style={[styles.listMeta, { color: colors.textSecondary }]}>
                                {new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent residents</Text>
                )}

                {/* Recent Payments Section */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Payments</Text>
                    <Feather name="credit-card" size={16} color={colors.primary} />
                </View>
                {recentPayments.length > 0 ? (
                    recentPayments.map((p: any) => (
                        <View key={p.id} style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.listInfo}>
                                <Text style={[styles.listName, { color: colors.text }]}>{p.tenants?.full_name || "Unknown"}</Text>
                                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{p.type} • {p.payment_method}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#10b981', fontSize: 15, fontWeight: '800' }}>₹{p.amount?.toLocaleString()}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{p.payment_date || "N/A"}</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent payments</Text>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

export default Dashboard;
