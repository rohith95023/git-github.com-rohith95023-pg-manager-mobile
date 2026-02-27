import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { pnlAPI } from "../services/api";
import { Feather } from "@expo/vector-icons";

const ProfitLossScreen = () => {
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<any[]>([]);
    const [totals, setTotals] = useState({ revenue: 0, expense: 0, profit: 0 });

    const fetchData = useCallback(async () => {
        try {
            const response: any = await pnlAPI.getSummary();
            const data = response.data || [];
            setSummary(data);

            const rev = data.reduce((sum: number, item: any) => sum + (Number(item.total_revenue) || 0), 0);
            const exp = data.reduce((sum: number, item: any) => sum + (Number(item.total_expense) || 0), 0);
            const pro = data.reduce((sum: number, item: any) => sum + (Number(item.net_profit) || 0), 0);

            setTotals({ revenue: rev, expense: exp, profit: pro });
        } catch (error) {
            console.error("Failed to fetch P&L summary:", error);
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

    const StatCard = ({ label, value, color, icon, sub }: any) => (
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statHeader}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <Feather name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>₹{value.toLocaleString()}</Text>
            {sub && <Text style={[styles.statSub, { color: color }]}>{sub}</Text>}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Profit & Loss</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* Main Highlights */}
                    <View style={styles.highlights}>
                        <StatCard
                            label="TOTAL REVENUE"
                            value={totals.revenue}
                            color="#10b981"
                            icon="trending-up"
                        />
                        <StatCard
                            label="TOTAL EXPENSES"
                            value={totals.expense}
                            color="#ef4444"
                            icon="trending-down"
                        />
                        <StatCard
                            label="NET PROFIT"
                            value={totals.profit}
                            color={colors.primary}
                            icon="pie-chart"
                            sub={`${((totals.profit / (totals.revenue || 1)) * 100).toFixed(1)}% margin`}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Breakdown</Text>

                    {summary.map((item, index) => (
                        <View key={index} style={[styles.monthRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.monthHeader}>
                                <Text style={[styles.monthText, { color: colors.text }]}>
                                    {new Date(item.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                </Text>
                                <Text style={[styles.pgText, { color: colors.primary }]}>{item.pgs?.name || 'All Properties'}</Text>
                            </View>

                            <View style={styles.rowDetails}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>REVENUE</Text>
                                    <Text style={[styles.detailValue, { color: '#10b981' }]}>₹{Number(item.total_revenue).toLocaleString()}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>EXPENSE</Text>
                                    <Text style={[styles.detailValue, { color: '#ef4444' }]}>₹{Number(item.total_expense).toLocaleString()}</Text>
                                </View>
                                <View style={[styles.detailItem, styles.lastDetail]}>
                                    <Text style={styles.detailLabel}>PROFIT</Text>
                                    <Text style={[styles.detailValue, { color: colors.text, fontWeight: '900' }]}>₹{Number(item.net_profit).toLocaleString()}</Text>
                                </View>
                            </View>
                        </View>
                    ))}

                    {summary.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Feather name="bar-chart-2" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No financial data available yet</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingBottom: 10 },
    title: { fontSize: 26, fontWeight: "900", letterSpacing: -1 },
    scrollContent: { padding: 20 },
    highlights: { gap: 16, marginBottom: 24 },
    statCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    statHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
    statLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
    statValue: { fontSize: 28, fontWeight: "900" },
    statSub: { fontSize: 13, fontWeight: "700", marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16, marginTop: 8 },
    monthRow: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12
    },
    monthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    monthText: { fontSize: 15, fontWeight: "800" },
    pgText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
    rowDetails: { flexDirection: "row", justifyContent: "space-between" },
    detailItem: { flex: 1 },
    lastDetail: { alignItems: "flex-end" },
    detailLabel: { fontSize: 9, fontWeight: "800", color: "#64748b", marginBottom: 4 },
    detailValue: { fontSize: 14, fontWeight: "700" },
    emptyContainer: { alignItems: "center", marginTop: 40, gap: 12 },
    emptyText: { fontSize: 14, fontWeight: "600" }
});

export default ProfitLossScreen;
