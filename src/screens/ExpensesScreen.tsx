import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useIsFocused } from "@react-navigation/native";
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
import { useRefreshOnForeground } from "../hooks/useRefreshOnForeground";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import DropdownSelector from "../components/common/DropdownSelector";
import ExpenseFormModal from "../components/modals/ExpenseFormModal";
import ConfirmationModal from "../components/common/ConfirmationModal";

const { width } = Dimensions.get("window");

const CATEGORIES = ["ALL", "UTILITIES", "REPAIRS", "MAINTENANCE", "SALARY", "FOOD", "OTHER"];
const DEFAULT_EXPENSE_FILTERS = { category: "ALL", propertyId: "ALL" };

const ExpensesScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const isFocused = useIsFocused();
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
    }, [debouncedSearch, filters, pgs, expenses.length, loading, loadingMore, totalOutflowSum]);

    useEffect(() => {
        if (isFocused) {
            loadExpenses(1, false);
        }
    }, [debouncedSearch, filters, isFocused]);

    useRefreshOnForeground(() => loadExpenses(1, false), isFocused);

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

    const renderExpenseItem = ({ item }: { item: any }) => (
        <View style={styles.expenseCard}>
            <View style={styles.cardTop}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.descriptionText} numberOfLines={1}>{item.title || item.description}</Text>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + "12" }]}>
                        <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>{item.category}</Text>
                    </View>
                </View>
                <Text style={styles.expenseAmount}>₹{Number(item.amount || 0).toLocaleString()}</Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.metaRow}>
                    <Feather name="calendar" size={12} color={COLORS.textMuted} />
                    <Text style={styles.metaText}>{item.date || "N/A"}</Text>
                    <View style={styles.dot} />
                    <Feather name="home" size={12} color={COLORS.textMuted} />
                    <Text style={styles.metaText} numberOfLines={1}>{item.pgs?.name || "Multiple PGs"}</Text>
                </View>

                {item.vendor_name && (
                    <View style={[styles.metaRow, { marginTop: 8 }]}>
                        <Feather name="shopping-bag" size={12} color={COLORS.textMuted} />
                        <Text style={styles.metaText}>Vendor: {item.vendor_name}</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.cardAction} onPress={() => handleEditExpense(item)}>
                    <Feather name="edit-2" size={14} color={COLORS.primary} />
                    <Text style={styles.cardActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardAction} onPress={() => handleDeleteExpense(item)}>
                    <Feather name="trash-2" size={14} color={COLORS.danger} />
                    <Text style={[styles.cardActionText, { color: COLORS.danger }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const ListHeader = () => (
        <View>
            {/* Summary Grid */}
            <View style={styles.summaryContainer}>
                <View style={styles.mainStatCard}>
                    <View>
                        <Text style={styles.mainStatLabel}>TOTAL OUTFLOW</Text>
                        <Text style={styles.mainStatValue}>₹{stats.totalOutflow.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.mainStatIcon, { backgroundColor: COLORS.danger + '10' }]}>
                        <MaterialCommunityIcons name="cash-remove" size={24} color={COLORS.danger} />
                    </View>
                </View>

                <View style={styles.statGrid}>
                    <View style={styles.statCell}>
                        <Text style={styles.statLabel}>TRANSACTIONS</Text>
                        <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.transactions}</Text>
                    </View>
                    <View style={styles.statCell}>
                        <Text style={styles.statLabel}>PROPERTIES</Text>
                        <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.linkedProperties}</Text>
                    </View>
                </View>
            </View>

            {/* Search & Filter */}
            <View style={styles.searchSection}>
                <View style={styles.searchBox}>
                    <Feather name="search" size={18} color={COLORS.textMuted} />
                    <TextInput
                        placeholder="Search expenses..."
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.searchInput}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {searchTerm !== "" && (
                        <TouchableOpacity onPress={() => setSearchTerm("")} style={styles.clearBadge}>
                            <Feather name="x" size={12} color={COLORS.bg} />
                        </TouchableOpacity>
                    )}
                    <View style={styles.searchDivider} />
                    <TouchableOpacity
                        style={styles.filterTrigger}
                        onPress={() => {
                            setPendingFilters(filters);
                            setFilterSheetVisible(true);
                        }}
                    >
                        <Feather
                            name="sliders"
                            size={18}
                            color={(filters.category !== "ALL" || filters.propertyId !== "ALL") ? COLORS.primary : COLORS.textMuted}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={styles.resultMetaText}>{loading && page === 1 ? "SEARCHING..." : `${totalCount} EXPENSES LOGGED`}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Compact Top App Bar */}
            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.appBarButton}>
                    <Feather name="menu" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Expense Tracker</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                    <Feather name="refresh-cw" size={18} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={expenses}
                keyExtractor={item => item.id}
                renderItem={renderExpenseItem}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyView}>
                            <View style={styles.emptyIconCircle}>
                                <MaterialCommunityIcons name="invoice-text-outline" size={40} color={COLORS.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>No expenses found</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} /> : null}
            />

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="Expense Filters"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    setFilters(pendingFilters);
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
                />
                <DropdownSelector
                    label="Category"
                    options={CATEGORIES.map(cat => ({
                        label: cat.charAt(0) + cat.slice(1).toLowerCase(),
                        value: cat
                    }))}
                    value={pendingFilters.category}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, category: value }))}
                />
            </FilterBottomSheet>

            <TouchableOpacity style={styles.fab} onPress={handleAddExpense}>
                <Feather name="plus" size={24} color="#fff" />
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
            />
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

        // Summary Section
        summaryContainer: { padding: 16 },
        mainStatCard: {
            backgroundColor: COLORS.card,
            borderRadius: 14,
            padding: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.danger + '20',
            marginBottom: 12,
            elevation: 2,
        },
        mainStatLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
        mainStatValue: { fontSize: 28, fontWeight: '900', color: COLORS.text, marginTop: 4 },
        mainStatIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

        statGrid: { flexDirection: 'row', gap: 12 },
        statCell: {
            flex: 1,
            backgroundColor: COLORS.card,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        statLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
        statValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },

        // Search Section
        searchSection: { paddingHorizontal: 16, paddingBottom: 8 },
        searchBox: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.card,
            paddingHorizontal: 16,
            height: 52,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 2,
        },
        searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: COLORS.text },
        clearBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.textMuted, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
        searchDivider: { width: 1, height: 24, backgroundColor: COLORS.border, marginHorizontal: 12 },
        filterTrigger: { padding: 4 },
        resultMetaText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, marginTop: 16, marginLeft: 4, letterSpacing: 1 },

        // List & Cards
        listContent: { paddingBottom: 100 },
        expenseCard: {
            backgroundColor: COLORS.card,
            borderRadius: 14,
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 2,
        },
        cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
        cardHeaderLeft: { flex: 1, marginRight: 12 },
        descriptionText: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
        categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
        categoryBadgeText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
        expenseAmount: { fontSize: 18, fontWeight: '900', color: COLORS.danger },

        cardBody: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border + '40' },
        metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        metaText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
        dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted, marginHorizontal: 4 },

        cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
        cardAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        cardActionText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

        fab: {
            position: 'absolute',
            bottom: 30,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.danger,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 10,
        },
        emptyView: { marginTop: 60, alignItems: 'center' },
        emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
        emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    });

export default ExpensesScreen;
