import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pnlAPI } from "../services/api";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
    VictoryBar,
    VictoryChart,
    VictoryAxis,
    VictoryGroup,
    VictoryLegend,
    VictoryPie,
    VictoryTooltip,
    VictoryLabel
} from "victory-native";
import useThemePalette from "../hooks/useThemePalette";
import FilterBottomSheet from "../components/common/FilterBottomSheet";

const { width } = Dimensions.get("window");

const ProfitLossScreen = () => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<any[]>([]);
    const [categoryStats, setCategoryStats] = useState<any[]>([]);
    const [selectedTimeFilter, setSelectedTimeFilter] = useState("Monthly");

    // Filter bottom sheet state
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);
    const [pendingTimeFilter, setPendingTimeFilter] = useState("Monthly");
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [pendingMonth, setPendingMonth] = useState("all");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [summaryRes, categoryRes]: any = await Promise.all([
                pnlAPI.getSummary(),
                pnlAPI.getCategoryStats()
            ]);

            setSummary(summaryRes.data || []);
            setCategoryStats(categoryRes.data || []);

            // Extract available months from summary data
            const months = (summaryRes.data || []).map((item: any) => item.month).filter(Boolean) as string[];
            const uniqueMonths = [...new Set(months)].sort((a, b) =>
                new Date(b).getTime() - new Date(a).getTime()
            );
            setAvailableMonths(uniqueMonths);
        } catch (error) {
            console.error("Failed to fetch P&L data:", error);
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

    const stats = useMemo(() => {
        const rev = summary.reduce((sum, item) => sum + (Number(item.total_revenue) || 0), 0);
        const exp = summary.reduce((sum, item) => sum + (Number(item.total_expense) || 0), 0);
        const profit = rev - exp;
        const margin = rev > 0 ? (profit / rev) * 100 : 0;

        return {
            totalRevenue: rev,
            totalExpenses: exp,
            netProfit: profit,
            profitMargin: margin.toFixed(1)
        };
    }, [summary]);

    const chartData = useMemo(() => {
        // Take last 6 months for chart
        const sorted = [...summary].sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
        const recent = sorted.slice(-6);

        return recent.map(item => ({
            month: new Date(item.month).toLocaleDateString(undefined, { month: 'short' }),
            revenue: Number(item.total_revenue),
            expense: Number(item.total_expense)
        }));
    }, [summary]);

    const pieData = useMemo(() => {
        const categories: { [key: string]: number } = {};
        categoryStats.forEach(item => {
            const cat = item.category || "Other";
            categories[cat] = (categories[cat] || 0) + (Number(item.amount) || 0);
        });

        return Object.keys(categories).map(key => ({
            x: key,
            y: categories[key]
        })).sort((a, b) => b.y - a.y).slice(0, 5); // Top 5 categories
    }, [categoryStats]);

    const StatCard = ({ title, value, icon, color, isPercent = false, style }: any) => (
        <View style={[styles.statCard, style, { borderColor: COLORS.border }]}>
            <View style={[styles.statIcon, { backgroundColor: color + "10" }]}>
                <MaterialCommunityIcons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statLabel}>{title}</Text>
            <Text style={[styles.statValue, { color: color }]}>
                {isPercent ? `${value}%` : `₹${Number(value).toLocaleString()}`}
            </Text>
        </View>
    );

    const BreakdownCard = ({ item }: { item: any }) => (
        <View style={styles.breakdownCard}>
            <View style={styles.breakdownHeader}>
                <View>
                    <Text style={styles.breakdownMonth}>
                        {new Date(item.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </Text>
                    <Text style={styles.breakdownProperty}>{item.pgs?.name || "All Properties"}</Text>
                </View>
                <View style={[styles.profitBadge, { backgroundColor: item.net_profit >= 0 ? COLORS.success + "15" : COLORS.danger + "15" }]}>
                    <Text style={[styles.profitBadgeText, { color: item.net_profit >= 0 ? COLORS.success : COLORS.danger }]}>
                        {item.net_profit >= 0 ? "PROFIT" : "LOSS"}
                    </Text>
                </View>
            </View>

            <View style={styles.breakdownGrid}>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>REVENUE</Text>
                    <Text style={[styles.gridValue, { color: COLORS.success }]}>₹{Number(item.total_revenue).toLocaleString()}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>EXPENSES</Text>
                    <Text style={[styles.gridValue, { color: COLORS.danger }]}>₹{Number(item.total_expense).toLocaleString()}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>NET PROFIT</Text>
                    <Text style={[styles.gridValue, { color: COLORS.text }]}>₹{Number(item.net_profit).toLocaleString()}</Text>
                </View>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Profit & Loss</Text>
                    <Text style={styles.subtitle}>Financial performance analysis</Text>
                </View>

                {/* KPI Cards */}
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiRow}>
                        <StatCard
                            title="TOTAL REVENUE"
                            value={stats.totalRevenue}
                            icon="cash-plus"
                            color={COLORS.success}
                        />
                        <StatCard title="TOTAL EXPENSES" value={stats.totalExpenses} icon="cash-minus" color={COLORS.danger} />
                    </View>
                    <View style={styles.kpiRow}>
                        <StatCard
                            title="NET PROFIT"
                            value={stats.netProfit}
                            icon="bank"
                            color={COLORS.primary}
                        />
                        <StatCard title="PROFIT MARGIN" value={stats.profitMargin} icon="percent" color={COLORS.warning} isPercent />
                    </View>
                </View>

                {/* Filters - now opens bottom sheet */}
                <View style={styles.filtersRow}>
                    <TouchableOpacity
                        style={styles.filterTrigger}
                        onPress={() => {
                            setPendingTimeFilter(selectedTimeFilter);
                            setPendingMonth(selectedMonth);
                            setFilterSheetVisible(true);
                        }}
                    >
                        <Feather name="sliders" size={16} color={COLORS.primary} />
                        <Text style={styles.filterTriggerText}>
                            {selectedMonth === "all" ? selectedTimeFilter : new Date(selectedMonth).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </Text>
                        <Feather name="chevron-down" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Monthly Performance Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Monthly Performance</Text>
                    <View style={styles.chartContainer}>
                        {chartData.length > 0 ? (
                            <VictoryChart
                                width={width - 40}
                                height={220}
                                domainPadding={{ x: 20 }}
                                padding={{ top: 20, bottom: 40, left: 50, right: 30 }}
                            >
                                <VictoryAxis
                                    style={{
                                        axis: { stroke: COLORS.border },
                                        tickLabels: { fill: COLORS.textMuted, fontSize: 10, fontWeight: "600" }
                                    }}
                                />
                                <VictoryAxis
                                    dependentAxis
                                    tickFormat={(t) => `₹${t >= 1000 ? (t / 1000).toFixed(1) + 'k' : t}`}
                                    style={{
                                        axis: { stroke: COLORS.border },
                                        grid: { stroke: COLORS.border, strokeDasharray: "4, 4" },
                                        tickLabels: { fill: COLORS.textMuted, fontSize: 8 }
                                    }}
                                />
                                <VictoryGroup offset={12}>
                                    <VictoryBar
                                        data={chartData}
                                        x="month"
                                        y="revenue"
                                        style={{ data: { fill: COLORS.success, width: 10, borderRadius: 5 } }}
                                        animate={{ duration: 500 }}
                                    />
                                    <VictoryBar
                                        data={chartData}
                                        x="month"
                                        y="expense"
                                        style={{ data: { fill: COLORS.danger, width: 10, borderRadius: 5 } }}
                                        animate={{ duration: 500 }}
                                    />
                                </VictoryGroup>
                            </VictoryChart>
                        ) : (
                            <View style={styles.emptyChart}>
                                <Text style={styles.emptyText}>Not enough data for chart</Text>
                            </View>
                        )}
                        <View style={styles.legendRow}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                                <Text style={styles.legendText}>Revenue</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
                                <Text style={styles.legendText}>Expenses</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Expense Distribution */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Expense Distribution</Text>
                    <View style={styles.donutContainer}>
                        {pieData.length > 0 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <VictoryPie
                                    data={pieData}
                                    innerRadius={70}
                                    width={width * 0.5}
                                    height={width * 0.5}
                                    padding={20}
                                    colorScale={[COLORS.primary, COLORS.warning, COLORS.success, "#8b5cf6", "#f97316"]}
                                    labels={() => null}
                                />
                                <View style={styles.pieLegend}>
                                    {pieData.map((item, i) => (
                                        <View key={i} style={styles.pieLegendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: [COLORS.primary, COLORS.warning, COLORS.success, "#8b5cf6", "#f97316"][i] }]} />
                                            <Text style={styles.pieLegendText} numberOfLines={1}>{item.x}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : (
                            <View style={styles.emptyChart}>
                                <Text style={styles.emptyText}>No expense categories found</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Detailed Breakdown */}
                <View style={styles.breakdownSection}>
                    <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
                    {summary.length > 0 ? (
                        summary.map((item, index) => (
                            <BreakdownCard key={index} item={item} />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="finance" size={64} color={COLORS.textMuted + "20"} />
                            <Text style={styles.emptyText}>No financial records found</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="P&L Filters"
                description="Filter by time period and month (matching web behavior)"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    setSelectedTimeFilter(pendingTimeFilter);
                    setSelectedMonth(pendingMonth);
                    setFilterSheetVisible(false);
                }}
                onReset={() => {
                    setSelectedTimeFilter("Monthly");
                    setSelectedMonth("all");
                    setPendingTimeFilter("Monthly");
                    setPendingMonth("all");
                    setFilterSheetVisible(false);
                }}
            >
                <View style={styles.sheetSection}>
                    <Text style={styles.sheetLabel}>Time Period</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sheetChipsRow}>
                        {["All Time", "Monthly", "Yearly"].map(filter => (
                            <TouchableOpacity
                                key={filter}
                                style={[styles.sheetChip, pendingTimeFilter === filter && styles.sheetChipActive]}
                                onPress={() => setPendingTimeFilter(filter)}
                            >
                                <Text style={[styles.sheetChipText, pendingTimeFilter === filter && styles.sheetChipTextActive]}>{filter}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {availableMonths.length > 0 && (
                    <View style={styles.sheetSection}>
                        <Text style={styles.sheetLabel}>Month</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sheetChipsRow}>
                            <TouchableOpacity
                                style={[styles.sheetChip, pendingMonth === "all" && styles.sheetChipActive]}
                                onPress={() => setPendingMonth("all")}
                            >
                                <Text style={[styles.sheetChipText, pendingMonth === "all" && styles.sheetChipTextActive]}>All Months</Text>
                            </TouchableOpacity>
                            {availableMonths.map(month => (
                                <TouchableOpacity
                                    key={month}
                                    style={[styles.sheetChip, pendingMonth === month && styles.sheetChipActive]}
                                    onPress={() => setPendingMonth(month)}
                                >
                                    <Text style={[styles.sheetChipText, pendingMonth === month && styles.sheetChipTextActive]}>
                                        {new Date(month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </FilterBottomSheet>
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        header: { padding: 20, paddingBottom: 10 },
        title: { fontSize: 26, fontWeight: "900", color: COLORS.text, letterSpacing: -1 },
        subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, fontWeight: "600" },

        kpiGrid: {
            paddingHorizontal: 20,
            paddingVertical: 8,
            gap: 8,
        },
        kpiRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 8,
            gap: 10,
        },
        statCard: {
            flexBasis: "48%",
            maxWidth: "48%",
            backgroundColor: COLORS.card,
            borderRadius: 18,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            minHeight: 90,
            justifyContent: "space-between",
            marginBottom: 10,
        },
        statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 },
        statLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, marginBottom: 4 },
        statValue: { fontSize: 15, fontWeight: "800" },

        filtersRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 20 },
        filterTrigger: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 8
        },
        filterTriggerText: { fontSize: 14, fontWeight: "700", color: COLORS.text },
        filterChip: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
        filterChipText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
        filterChipTextActive: { color: "#fff" },

        chartSection: { marginHorizontal: 20, marginBottom: 24 },
        sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 16 },
        chartContainer: {
            backgroundColor: COLORS.card,
            borderRadius: 24,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center"
        },
        legendRow: { flexDirection: "row", gap: 20, marginTop: -10, marginBottom: 10 },
        legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
        legendDot: { width: 8, height: 8, borderRadius: 4 },
        legendText: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted },

        donutContainer: {
            backgroundColor: COLORS.card,
            borderRadius: 24,
            padding: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        pieLegend: { flex: 1, gap: 10, paddingRight: 10 },
        pieLegendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
        pieLegendText: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, flex: 1 },

        breakdownSection: { paddingHorizontal: 20 },
        breakdownCard: {
            backgroundColor: COLORS.card,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        breakdownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
        breakdownMonth: { fontSize: 16, fontWeight: "800", color: COLORS.text },
        breakdownProperty: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontWeight: "600" },
        profitBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
        profitBadgeText: { fontSize: 9, fontWeight: "900" },

        breakdownGrid: { flexDirection: "row", justifyContent: "space-between" },
        gridItem: { flex: 1 },
        gridLabel: { fontSize: 9, fontWeight: "800", color: COLORS.textMuted, marginBottom: 6 },
        gridValue: { fontSize: 14, fontWeight: "800" },

        emptyChart: { height: 150, justifyContent: "center", alignItems: "center" },
        emptyState: { alignItems: "center", marginTop: 40, gap: 16 },
        emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "600" },

        // Bottom sheet styles
        sheetSection: { marginBottom: 20 },
        sheetLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
        sheetChipsRow: { flexDirection: "row", gap: 10 },
        sheetChip: {
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        sheetChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "10" },
        sheetChipText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
        sheetChipTextActive: { color: COLORS.primary }
    });

export default ProfitLossScreen;
