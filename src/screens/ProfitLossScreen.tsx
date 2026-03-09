import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import ScreenHeader from "../components/common/ScreenHeader";
import { useData } from "../context/DataContext";
import useThemePalette from "../hooks/useThemePalette";

const { width } = Dimensions.get("window");

const ProfitLossScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const { pnlSummary, pnlCategories, loading, refreshing, refresh } = useData();

    const summary = pnlSummary;
    const categoryStats = pnlCategories;

    const [selectedTimeFilter, setSelectedTimeFilter] = useState("Monthly");

    // Filter bottom sheet state
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);
    const [pendingTimeFilter, setPendingTimeFilter] = useState("Monthly");
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [pendingMonth, setPendingMonth] = useState("all");

    const availableMonths = useMemo(() => {
        const months = summary.map((item: any) => item.month).filter(Boolean) as string[];
        return [...new Set(months)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [summary]);

    const onRefresh = () => refresh();

    const filteredSummary = useMemo(() => {
        if (selectedMonth === "all") return summary;
        return summary.filter((item: any) => item.month === selectedMonth);
    }, [summary, selectedMonth]);

    const stats = useMemo(() => {
        const rev = filteredSummary.reduce((sum: number, item: any) => sum + (Number(item.total_revenue) || 0), 0);
        const exp = filteredSummary.reduce((sum: number, item: any) => sum + (Number(item.total_expense) || 0), 0);
        const profit = rev - exp;
        const margin = rev > 0 ? (profit / rev) * 100 : 0;

        return {
            totalRevenue: rev,
            totalExpenses: exp,
            netProfit: profit,
            profitMargin: margin.toFixed(1)
        };
    }, [filteredSummary]);

    const chartData = useMemo(() => {
        // Aggregate by month first (combine multiple PGs for the same month)
        const monthGroups: Record<string, { revenue: number; expense: number }> = {};

        summary.forEach(item => {
            if (!item.month) return;
            const mKey = item.month; // e.g. "2026-03-01"
            if (!monthGroups[mKey]) {
                monthGroups[mKey] = { revenue: 0, expense: 0 };
            }
            monthGroups[mKey].revenue += (Number(item.total_revenue) || 0);
            monthGroups[mKey].expense += (Number(item.total_expense) || 0);
        });

        // Convert to array and sort
        const aggregated = Object.entries(monthGroups).map(([month, data]) => ({
            month,
            ...data
        })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        // Take last 6 months
        const recent = aggregated.slice(-6);

        return recent.map(item => ({
            month: new Date(item.month).toLocaleDateString(undefined, { month: 'short' }),
            revenue: item.revenue,
            expense: item.expense
        }));
    }, [summary]);

    const pieData = useMemo(() => {
        const categories: { [key: string]: number } = {};
        categoryStats.forEach(item => {
            // Mapping fix: backend returns { name: string, value: number }
            const cat = item.name || item.category || "Other";
            const val = Number(item.value || item.amount || 0);
            categories[cat] = (categories[cat] || 0) + val;
        });

        return Object.keys(categories).map(key => ({
            x: key,
            y: categories[key]
        })).filter(c => c.y > 0).sort((a, b) => b.y - a.y).slice(0, 5); // Top 5 categories
    }, [categoryStats]);

    const giftedPieData = useMemo(() => {
        const pieColors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, '#8884d8'];
        return pieData.map((item, idx) => ({
            value: item.y,
            color: pieColors[idx % 5],
            text: `${item.x}\n₹${(item.y / 1000).toFixed(1)}k`,
            textColor: COLORS.text,
            shiftTextX: -10,
        }));
    }, [pieData, COLORS]);

    const giftedBarData = useMemo(() => {
        const data: any[] = [];
        chartData.forEach((item, index) => {
            data.push({
                value: item.revenue,
                frontColor: COLORS.success,
                label: item.month,
                spacing: 4,
                labelTextStyle: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
            });
            data.push({
                value: item.expense,
                frontColor: COLORS.danger,
                spacing: index === chartData.length - 1 ? 0 : 24,
            });
        });
        return data;
    }, [chartData, COLORS]);

    const BreakdownCard = ({ item }: { item: any }) => (
        <View style={styles.breakdownCard}>
            <View style={styles.breakdownHeader}>
                <View>
                    <Text style={styles.breakdownMonth}>
                        {new Date(item.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </Text>
                    <Text style={styles.breakdownProperty}>{item.pgs?.name || "All Properties"}</Text>
                </View>
                <View style={[styles.profitBadge, { backgroundColor: item.net_profit >= 0 ? COLORS.success + "12" : COLORS.danger + "12" }]}>
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
            <ScreenHeader
                title="Profit & Loss"
                onLeftPress={() => navigation.openDrawer()}
                rightElement={
                    <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                        <Feather name="refresh-cw" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Analytics Summary */}
                <View style={styles.summarySection}>
                    {/* Primary Dominant Card */}
                    <View style={styles.mainProfitCard}>
                        <View>
                            <Text style={styles.mainLabel}>NET PROFIT</Text>
                            <Text style={[styles.mainValue, { color: stats.netProfit >= 0 ? COLORS.success : COLORS.danger }]}>
                                ₹{Number(stats.netProfit || 0).toLocaleString()}
                            </Text>
                        </View>
                        <View style={[styles.mainIcon, { backgroundColor: (stats.netProfit >= 0 ? COLORS.success : COLORS.danger) + '10' }]}>
                            <MaterialCommunityIcons
                                name={stats.netProfit >= 0 ? "trending-up" : "trending-down"}
                                size={24}
                                color={stats.netProfit >= 0 ? COLORS.success : COLORS.danger}
                            />
                        </View>
                    </View>

                    {/* Secondary Compact Grid */}
                    <View style={styles.statGrid}>
                        <View style={styles.statCell}>
                            <Text style={styles.statLabel}>REVENUE</Text>
                            <Text style={[styles.statValue, { color: COLORS.success }]}>₹{Number(stats.totalRevenue || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.statCell}>
                            <Text style={styles.statLabel}>EXPENSES</Text>
                            <Text style={[styles.statValue, { color: COLORS.danger }]}>₹{Number(stats.totalExpenses || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.statCell}>
                            <Text style={styles.statLabel}>MARGIN</Text>
                            <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.profitMargin}%</Text>
                        </View>
                    </View>
                </View>

                {/* Section Header with Filter aligned right */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Performance Analytics</Text>
                    <TouchableOpacity
                        style={styles.filterTrigger}
                        onPress={() => {
                            setPendingTimeFilter(selectedTimeFilter);
                            setPendingMonth(selectedMonth);
                            setFilterSheetVisible(true);
                        }}
                    >
                        <Text style={styles.filterTriggerText}>
                            {selectedMonth === "all" ? selectedTimeFilter : new Date(selectedMonth).toLocaleDateString(undefined, { month: 'short' })}
                        </Text>
                        <Feather name="chevron-down" size={14} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Monthly Performance Chart */}
                <View style={styles.chartCard}>
                    {chartData.length > 0 ? (
                        <BarChart
                            data={giftedBarData}
                            barWidth={20}
                            spacing={24}
                            roundedTop
                            hideRules
                            xAxisThickness={1}
                            yAxisThickness={1}
                            xAxisColor={COLORS.border}
                            yAxisColor={COLORS.border}
                            yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10, fontWeight: '700' }}
                            noOfSections={4}
                            yAxisLabelPrefix="₹"
                            formatYLabel={(label: string) => `${Number(label) / 1000}k`}
                            width={width - 80}
                            height={180}
                        />
                    ) : (
                        <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="chart-bar" size={48} color={COLORS.textMuted + "20"} />
                            <Text style={{ color: COLORS.textMuted, marginTop: 10, fontWeight: '700' }}>No Data Available</Text>
                        </View>
                    )}
                </View>

                {/* Expense Distribution */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Expense Breakup</Text>
                </View>
                <View style={styles.chartCard}>
                    {pieData.length > 0 ? (
                        <PieChart
                            data={giftedPieData}
                            donut
                            innerRadius={60}
                            radius={100}
                            showText
                            textColor={COLORS.text}
                            textSize={10}
                            fontWeight="bold"
                            textBackgroundRadius={14}
                            centerLabelComponent={() => {
                                return (
                                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: '600' }}>Expenses</Text>
                                    </View>
                                );
                            }}
                        />
                    ) : (
                        <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: COLORS.textMuted }}>No Categorized Data</Text>
                        </View>
                    )}
                </View>

                {/* Detailed Breakdown */}
                <View style={styles.breakdownSection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Monthly History</Text>
                    </View>
                    {filteredSummary.length > 0 ? (
                        filteredSummary.map((item: any, index: number) => (
                            <BreakdownCard key={index} item={item} />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="finance" size={48} color={COLORS.textMuted + "20"} />
                            <Text style={styles.emptyTitle}>No History Available</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="Analytics Filters"
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
                    <View style={styles.sheetChipsRow}>
                        {["All Time", "Monthly", "Yearly"].map(filter => (
                            <TouchableOpacity
                                key={filter}
                                style={[styles.sheetChip, pendingTimeFilter === filter && styles.sheetChipActive]}
                                onPress={() => setPendingTimeFilter(filter)}
                            >
                                <Text style={[styles.sheetChipText, pendingTimeFilter === filter && styles.sheetChipTextActive]}>{filter}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {availableMonths.length > 0 && (
                    <View style={styles.sheetSection}>
                        <Text style={styles.sheetLabel}>Select Month</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sheetChipsRow}>
                            <TouchableOpacity
                                style={[styles.sheetChip, pendingMonth === "all" && styles.sheetChipActive]}
                                onPress={() => setPendingMonth("all")}
                            >
                                <Text style={[styles.sheetChipText, pendingMonth === "all" && styles.sheetChipTextActive]}>All Time</Text>
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

const createStyles = (COLORS: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },

        appBarButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

        // Summary Section
        summarySection: { padding: 16 },
        mainProfitCard: {
            backgroundColor: COLORS.card,
            borderRadius: 14,
            padding: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.primary + '20',
            marginBottom: 12,
            elevation: 2,
        },
        mainLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
        mainValue: { fontSize: 28, fontWeight: '900', marginTop: 4 },
        mainIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

        statGrid: { flexDirection: 'row', gap: 10 },
        statCell: {
            flex: 1,
            backgroundColor: COLORS.card,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: 'center',
        },
        statLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 4 },
        statValue: { fontSize: 15, fontWeight: '800' },

        // Section Headers
        sectionHeaderRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            marginBottom: 12,
        },
        sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
        filterTrigger: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.card,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 6,
        },
        filterTriggerText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

        // Charts
        chartCard: {
            backgroundColor: COLORS.card,
            borderRadius: 16,
            marginHorizontal: 16,
            marginBottom: 24,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: 'center',
        },
        chartWrapper: { alignItems: 'center' },
        legendRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
        legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        legendDot: { width: 8, height: 8, borderRadius: 4 },
        legendText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },

        pieWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-around' },
        pieLegend: { flex: 1, gap: 10, marginLeft: 10 },
        pieLegendItem: { flexDirection: 'row', alignItems: 'center' },
        pieLegendText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, flex: 1, marginLeft: 8 },
        pieValueText: { fontSize: 11, fontWeight: '800', color: COLORS.text },

        // Detailed Breakdown
        breakdownSection: { paddingBottom: 20 },
        breakdownCard: {
            backgroundColor: COLORS.card,
            borderRadius: 14,
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
        breakdownMonth: { fontSize: 15, fontWeight: '800', color: COLORS.text },
        breakdownProperty: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
        profitBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
        profitBadgeText: { fontSize: 9, fontWeight: '900' },

        breakdownGrid: { flexDirection: 'row', justifyContent: 'space-between' },
        gridItem: { flex: 1 },
        gridLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, marginBottom: 4 },
        gridValue: { fontSize: 13, fontWeight: '800' },

        // Empty States
        emptyChart: { padding: 20, alignItems: 'center', justifyContent: 'center' },
        emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 12 },
        emptySubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
        emptyState: { alignItems: 'center', paddingVertical: 40 },

        // Bottom Sheet
        sheetSection: { marginBottom: 20 },
        sheetLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
        sheetChipsRow: { flexDirection: 'row', gap: 10 },
        sheetChip: {
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        sheetChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "10" },
        sheetChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
        sheetChipTextActive: { color: COLORS.primary }
    });

export default ProfitLossScreen;
