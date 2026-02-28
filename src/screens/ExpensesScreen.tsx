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
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { expenseAPI, pgAPI } from "../services/api";
import { supabase } from "../lib/supabaseClient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import DropdownSelector from "../components/common/DropdownSelector";
import ExpenseFormModal from "../components/modals/ExpenseFormModal";
import ConfirmationModal from "../components/common/ConfirmationModal";

const { width } = Dimensions.get("window");

const CATEGORIES = ["ALL", "UTILITIES", "REPAIRS", "MAINTENANCE", "SALARY", "FOOD", "OTHER"];
const DEFAULT_EXPENSE_FILTERS = { category: "ALL", propertyId: "ALL" };

const ExpensesScreen = () => {
    const COLORS = useThemePalette();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [totalOutflowSum, setTotalOutflowSum] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState(DEFAULT_EXPENSE_FILTERS);
    const [pendingFilters, setPendingFilters] = useState(DEFAULT_EXPENSE_FILTERS);
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);

    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);

    const [confirmState, setConfirmState] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info' | 'success';
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
        singleButton?: boolean;
        loading?: boolean;
    }>({
        visible: false,
        title: "",
        message: "",
        type: "info"
    });

    const handleAddExpense = () => {
        setEditingExpense(null);
        setModalVisible(true);
    };

    const handleEditExpense = (expense: any) => {
        setEditingExpense(expense);
        setModalVisible(true);
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleDeleteExpense = (expense: any) => {
        setConfirmState({
            visible: true,
            title: "Delete Expense?",
            message: `Are you sure you want to delete this expense record for "${expense.title || expense.description}" (₹${Number(expense.amount).toLocaleString()})?`,
            type: "danger",
            confirmText: "Yes, Delete",
            cancelText: "Cancel",
            onConfirm: async () => {
                try {
                    setConfirmState(prev => ({ ...prev, loading: true }));
                    await expenseAPI.delete(expense.id);
                    await loadExpenses(1, false);
                    setConfirmState({ visible: false, title: "", message: "", type: "info" });
                    Alert.alert("Success", "Expense deleted successfully");
                } catch (error: any) {
                    setConfirmState(prev => ({ ...prev, loading: false }));
                    Alert.alert("Error", error.message || "Failed to delete expense");
                }
            }
        });
    };

    const loadExpenses = useCallback(async (pageNum = 1, shouldAppend = false) => {
        if (loading || loadingMore) return;

        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const [expensesRes, pgsData, sumRes]: any = await Promise.all([
                expenseAPI.search({
                    page: pageNum,
                    limit: 10,
                    search: debouncedSearch,
                    category: filters.category,
                    pgId: filters.propertyId,
                }),
                pageNum === 1 ? pgAPI.getAll() : Promise.resolve(pgs),
                pageNum === 1 ? supabase.from("expenses").select("amount")
                    // .eq("is_deleted", false)
                    .filter("category", filters.category === "ALL" ? "neq" : "eq", filters.category === "ALL" ? "RESERVED_FALLBACK_NONE" : filters.category.toUpperCase())
                    .filter("pg_id", filters.propertyId === "ALL" ? "neq" : "eq", filters.propertyId === "ALL" ? "00000000-0000-0000-0000-000000000000" : filters.propertyId)
                    .then(res => ({ sum: res.data?.reduce((s, e) => s + (Number(e.amount) || 0), 0) || 0 })) : Promise.resolve({ sum: totalOutflowSum })
            ]);

            const expenseList = expensesRes?.data || [];
            const count = expensesRes?.count || 0;

            if (shouldAppend) {
                setExpenses(prev => [...prev, ...expenseList]);
            } else {
                setExpenses(expenseList);
                setTotalOutflowSum(sumRes.sum);
            }

            setTotalCount(count);
            setHasMore(shouldAppend ? (expenses.length + expenseList.length < count) : (expenseList.length < count));
            if (pageNum === 1) setPgs(pgsData || []);
            setPage(pageNum);
        } catch (error) {
            console.error("Failed to fetch expenses:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [debouncedSearch, filters, pgs, expenses.length, loading, loadingMore]);

    useEffect(() => {
        loadExpenses(1, false);
    }, [debouncedSearch, filters]);

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        loadExpenses(1, false);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            loadExpenses(page + 1, true);
        }
    };

    const stats = useMemo(() => {
        return {
            totalOutflow: totalOutflowSum,
            transactions: totalCount,
            linkedProperties: pgs.length
        };
    }, [totalOutflowSum, totalCount, pgs.length]);

    const filteredExpenses = expenses; // Use server-side state directly for pagination integrity

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
                <TouchableOpacity style={styles.actionButton} onPress={() => handleEditExpense(item)}>
                    <Feather name="edit-2" size={14} color={COLORS.primary} />
                    <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteExpense(item)}>
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
                        style={[
                            styles.filterButton,
                            (filters.category !== "ALL" || filters.propertyId !== "ALL") && { backgroundColor: COLORS.success }
                        ]}
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
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                    ) : null
                }
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
                    label="Property"
                    options={[
                        { label: "All Properties", value: "ALL" },
                        ...pgs.map(pg => ({ label: pg.name, value: pg.id }))
                    ]}
                    value={pendingFilters.propertyId}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, propertyId: value }))}
                    placeholder="Select property..."
                />

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

            <TouchableOpacity style={styles.fab} onPress={handleAddExpense}>
                <Feather name="plus" size={24} color="#fff" />
                <Text style={styles.fabText}>Log Expense</Text>
            </TouchableOpacity>

            <ExpenseFormModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={() => {
                    loadExpenses();
                    setModalVisible(false);
                }}
                editingExpense={editingExpense}
            />

            <ConfirmationModal
                visible={confirmState.visible}
                onClose={() => setConfirmState(prev => ({ ...prev, visible: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                loading={confirmState.loading}
                singleButton={confirmState.singleButton}
                disableOutsideTap={confirmState.type === "danger"}
            />
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
