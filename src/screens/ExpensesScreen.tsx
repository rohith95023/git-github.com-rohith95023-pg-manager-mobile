import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { expenseAPI } from "../services/api";
import { Feather } from "@expo/vector-icons";

const ExpensesScreen = () => {
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [totalOutflow, setTotalOutflow] = useState(0);

    const fetchExpenses = useCallback(async () => {
        try {
            const data: any = await expenseAPI.getAll();
            setExpenses((data || []) as any[]);

            const outflow = (data || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
            setTotalOutflow(outflow);
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

    const filteredExpenses = expenses.filter(e =>
        (e.title || e.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.category || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCategoryColor = (category: string) => {
        switch (category?.toUpperCase()) {
            case 'MAINTENANCE': return '#3b82f6';
            case 'REPAIRS': return '#f59e0b';
            case 'UTILITIES': return '#8b5cf6';
            case 'SALARY': return '#10b981';
            case 'FOOD': return '#f97316';
            default: return colors.textSecondary;
        }
    };

    const renderExpenseItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '15' }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>{item.category}</Text>
                </View>
                <Text style={[styles.amount, { color: '#ef4444' }]}>- ₹{(item.amount || 0).toLocaleString()}</Text>
            </View>

            <Text style={[styles.titleText, { color: colors.text }]}>
                {item.title || item.description}
            </Text>

            {item.vendor_name && (
                <View style={styles.vendorRow}>
                    <Feather name="shopping-cart" size={12} color={colors.textSecondary} />
                    <Text style={[styles.vendorText, { color: colors.textSecondary }]}>{item.vendor_name}</Text>
                </View>
            )}

            <View style={styles.footer}>
                <View style={styles.infoRow}>
                    <Feather name="calendar" size={14} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.date || "N/A"}</Text>
                </View>
                <View style={styles.propertyRow}>
                    <Feather name="home" size={12} color={colors.textSecondary} />
                    <Text style={[styles.propertyText, { color: colors.textSecondary }]}>
                        {item.pgs?.name || "All PGs"}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Expenses</Text>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: '#ef4444' }]}>
                    <Feather name="plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Mini Stats */}
            <View style={styles.statsContainer}>
                <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.statLabel}>TOTAL OUTFLOW</Text>
                    <Text style={[styles.statValue, { color: '#ef4444' }]}>₹{totalOutflow.toLocaleString()}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.statLabel}>THIS MONTH</Text>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{filteredExpenses.length} LOGS</Text>
                </View>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    placeholder="Search by description or category..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    style={[styles.searchInput, { color: colors.text }]}
                />
            </View>

            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
            ) : (
                <FlatList
                    data={filteredExpenses}
                    renderItem={renderExpenseItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Feather name="shopping-bag" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses logged</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16
    },
    title: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        elevation: 4
    },
    statsContainer: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 16 },
    statBox: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1 },
    statLabel: { fontSize: 10, fontWeight: "800", color: "#64748b", marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: "800" },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16
    },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: "500" },
    listContent: { padding: 20, paddingTop: 0 },
    card: {
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    categoryText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
    amount: { fontSize: 18, fontWeight: "900" },
    titleText: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
    vendorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
    vendorText: { fontSize: 12, fontWeight: "600" },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    infoText: { fontSize: 11, fontWeight: "700" },
    propertyRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    propertyText: { fontSize: 11, fontWeight: "700" },
    emptyState: { alignItems: "center", marginTop: 60, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: "600" }
});

export default ExpensesScreen;
