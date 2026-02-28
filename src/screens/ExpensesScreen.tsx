import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { expenseAPI, pgAPI } from "../services/api";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import DropdownSelector from "../components/common/DropdownSelector";

const { width } = Dimensions.get("window");

const CATEGORIES = ["ALL", "UTILITIES", "REPAIRS", "MAINTENANCE", "SALARY", "FOOD", "OTHER"];
const DEFAULT_EXPENSE_FILTERS = { category: "ALL" };

const ExpensesScreen = () => {
    const COLORS = useThemePalette();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [pgsCount, setPgsCount] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState(DEFAULT_EXPENSE_FILTERS);
    const [pendingFilters, setPendingFilters] = useState(DEFAULT_EXPENSE_FILTERS);
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);

    const fetchExpenses = useCallback(async () => {
        try {
            setLoading(true);
            const [expensesRes, pgsRes]: any = await Promise.all([
                expenseAPI.getAll(),
                pgAPI.getAll()
            ]);
            setExpenses(expensesRes || []);
            setPgsCount((pgsRes || []).length);
        } catch (error) {
            console.error("Failed to fetch expenses:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchExpenses();
    };

    const stats = useMemo(() => {
        const totalOutflow = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        return {
            totalOutflow,
            transactions: expenses.length,
            linkedProperties: pgsCount
        };
    }, [expenses, pgsCount]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const matchesSearch = (e.title || e.description || "").toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filters.category === "ALL" || e.category === filters.category;
            return matchesSearch && matchesCategory;
        });
    }, [expenses, searchTerm, filters]);

    const getCategoryColor = (category: string) => {
        switch (category?.toUpperCase()) {
            case 'UTILITIES': return COLORS.primary;
            case 'REPAIRS': return COLORS.warning;
            case 'MAINTENANCE': return COLORS.success;
            case 'SALARY': return "#8b5cf6";
            case 'FOOD': return "#f97316";
            default: return COLORS.textMuted;
        }
    };

    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    const SummaryCard = ({ title, value, icon, color }: any) => (
        <View style={[styles.summaryCard, { borderColor: COLORS.border }]}>
            <View style={[styles.summaryIcon, { backgroundColor: color + "10" }]}>
                <MaterialCommunityIcons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.summaryLabel}>{title}</Text>
            <Text style={[styles.summaryValue, { color: color }]}>
                {title === "TOTAL OUTFLOW" ? `₹${Number(value).toLocaleString()}` : value}
            </Text>
        </View>
    );

    const renderExpenseItem = ({ item }: { item: any }) => (
        <View style={styles.expenseCard}>
            <View style={styles.expenseHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.descriptionText} numberOfLines={1}>{item.title || item.description}</Text>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + "15" }]}>
                        <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>{item.category}</Text>
                    </View>
                </View>
                <Text style={styles.expenseAmount}>₹{Number(item.amount || 0).toLocaleString()}</Text>
            </View>

            <View style={styles.expenseBody}>
                <View style={styles.infoRow}>
                    <Feather name="calendar" size={12} color={COLORS.textMuted} />
                    <Text style={styles.infoText}>{item.date || "N/A"}</Text>
                    <View style={styles.dot} />
                    <Feather name="home" size={12} color={COLORS.textMuted} />
                    <Text style={styles.infoText} numberOfLines={1}>{item.pgs?.name || "Multiple PGs"}</Text>
                </View>

                {item.vendor_name && (
                    <View style={styles.vendorRow}>
                        <Feather name="shopping-bag" size={12} color={COLORS.textMuted} />
                        <Text style={styles.vendorText}>Vendor: {item.vendor_name}</Text>
                    </View>
                )}
            </View>

            <View style={styles.expenseFooter}>
                <TouchableOpacity style={styles.actionButton}>
                    <Feather name="edit-2" size={14} color={COLORS.primary} />
                    <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Feather name="trash-2" size={14} color={COLORS.danger} />
                    <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const ListHeader = () => (
        <View>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
                <SummaryCard title="TOTAL OUTFLOW" value={stats.totalOutflow} icon="cash-remove" color={COLORS.danger} />
                <SummaryCard title="TRANSACTIONS" value={stats.transactions} icon="swap-horizontal" color={COLORS.primary} />
                <SummaryCard title="LINKED PROPERTIES" value={stats.linkedProperties} icon="office-building" color={COLORS.success} />
            </View>

            {/* Filters */}
            <View style={styles.stickySection}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={18} color={COLORS.textMuted} />
                        <TextInput
                            placeholder="Search expenses..."
                            placeholderTextColor={COLORS.textMuted}
                            style={styles.searchInput}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        {searchTerm.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchTerm("")}>
                                <Feather name="x-circle" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => {
                            setPendingFilters(filters);
                            setFilterSheetVisible(true);
                        }}
                    >
                        <Feather name="sliders" size={18} color="#fff" />
                        <Text style={styles.filterButtonText}>Filter</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={filteredExpenses}
                keyExtractor={item => item.id}
                renderItem={renderExpenseItem}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="invoice-text-outline" size={64} color={COLORS.textMuted + "20"} />
                            <Text style={styles.emptyText}>No expenses logged yet</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={loading && !refreshing ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> : null}
            />

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="Expense Filters"
                description="Filter by category like the web view"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    const applied = { ...pendingFilters };
                    setFilters(applied);
                    setPendingFilters(applied);
                    setFilterSheetVisible(false);
                }}
                onReset={() => {
                    setFilters(DEFAULT_EXPENSE_FILTERS);
                    setPendingFilters(DEFAULT_EXPENSE_FILTERS);
                    setFilterSheetVisible(false);
                }}
            >
                <DropdownSelector
                    label="Category"
                    options={CATEGORIES.map(cat => ({
                        label: cat.charAt(0) + cat.slice(1).toLowerCase(),
                        value: cat
                    }))}
                    value={pendingFilters.category}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, category: value }))}
                    placeholder="Select category..."
                />
            </FilterBottomSheet>

            <TouchableOpacity style={styles.fab}>
                <Feather name="plus" size={24} color="#fff" />
                <Text style={styles.fabText}>Log Expense</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        summaryContainer: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 10,
            gap: 10,
        },
        summaryCard: {
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
        summaryIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", marginBottom: 8 },
        summaryLabel: { fontSize: 10, fontWeight: "700", color: COLORS.textMuted, marginBottom: 4 },
        summaryValue: { fontSize: 15, fontWeight: "800" },

        stickySection: { backgroundColor: COLORS.bg, paddingBottom: 10 },
        searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, gap: 10, marginBottom: 12 },
        searchBar: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderRadius: 14,
            paddingHorizontal: 16,
            height: 50,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        searchInput: { flex: 1, marginLeft: 12, color: COLORS.text, fontWeight: "600", fontSize: 14 },
        filterButton: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.primary,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
            gap: 6
        },
        filterButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },

        listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
        expenseCard: {
            backgroundColor: COLORS.card,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        expenseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 },
        headerLeft: { flex: 1, marginRight: 10 },
        descriptionText: { fontSize: 16, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
        categoryBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
        categoryText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
        expenseAmount: { fontSize: 18, fontWeight: "900", color: COLORS.danger },

        expenseBody: { marginBottom: 20 },
        infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
        infoText: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4, fontWeight: "600" },
        dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted, marginHorizontal: 8 },
        vendorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
        vendorText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },

        expenseFooter: {
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingTop: 15,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.05)",
            gap: 20
        },
        actionButton: { flexDirection: "row", alignItems: "center", gap: 6 },
        actionButtonText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },

        fab: {
            position: "absolute",
            bottom: 30,
            right: 20,
            flexDirection: "row",
            paddingHorizontal: 20,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.danger,
            justifyContent: "center",
            alignItems: "center",
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            gap: 10
        },
        fabText: { color: "#fff", fontWeight: "800", fontSize: 14 },
        emptyState: { alignItems: "center", marginTop: 60, gap: 16 },
        emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: "600" },
        sheetSection: { marginBottom: 18, paddingHorizontal: 20 },
        sheetLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
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
        sheetChipTextActive: { color: COLORS.primary },
        sheetSortRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
        sheetSortButton: {
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: COLORS.card
        },
        sheetSortButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "10" },
        sheetSortText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
        sheetSortTextActive: { color: COLORS.primary }
    });

export default ExpensesScreen;
