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
import { paymentAPI, pgAPI } from "../services/api";
import { Feather } from "@expo/vector-icons";

const PaymentsScreen = () => {
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [payments, setPayments] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [stats, setStats] = useState({ received: 0, pending: 0 });

    const fetchPayments = useCallback(async () => {
        try {
            const data: any = await paymentAPI.getAll();
            setPayments((data || []) as any[]);

            // Calculate basic stats
            const received = (data || []).filter((p: any) => p.status === 'COMPLETED' || p.status === 'PAID')
                .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            setStats(prev => ({ ...prev, received }));
        } catch (error) {
            console.error("Failed to fetch payments:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPayments();
    };

    const filteredPayments = payments.filter(p =>
        (p.tenants?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.billing_month || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED':
            case 'PAID': return '#10b981';
            case 'PENDING': return '#f59e0b';
            case 'FAILED': return '#ef4444';
            default: return colors.textSecondary;
        }
    };

    const renderPaymentItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.typeText, { color: colors.primary }]}>{item.type}</Text>
                </View>
                <Text style={[styles.amount, { color: colors.text }]}>₹{(item.amount || 0).toLocaleString()}</Text>
            </View>

            <Text style={[styles.tenantName, { color: colors.text }]}>
                {item.tenants?.full_name || "Unknown Resident"}
            </Text>

            <View style={styles.infoRow}>
                <Feather name="calendar" size={14} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    {item.payment_date || item.billing_month || "N/A"}
                </Text>
                <View style={styles.dot} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.payment_method}</Text>
            </View>

            <View style={styles.footer}>
                <View style={styles.propertyRow}>
                    <Feather name="home" size={12} color={colors.textSecondary} />
                    <Text style={[styles.propertyText, { color: colors.textSecondary }]}>
                        {item.pgs?.name || "N/A"}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Payments</Text>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
                    <Feather name="plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Mini Stats */}
            <View style={styles.statsContainer}>
                <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.statLabel}>RECEIVED</Text>
                    <Text style={[styles.statValue, { color: '#10b981' }]}>₹{stats.received.toLocaleString()}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.statLabel}>MONTHLY</Text>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{filteredPayments.length} TXNS</Text>
                </View>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    placeholder="Search resident or month..."
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
                    data={filteredPayments}
                    renderItem={renderPaymentItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Feather name="credit-card" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No payments recorded</Text>
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
    typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    typeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
    amount: { fontSize: 18, fontWeight: "900" },
    tenantName: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    infoText: { fontSize: 12, marginLeft: 6, fontWeight: "600" },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", marginHorizontal: 8 },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
    propertyRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    propertyText: { fontSize: 11, fontWeight: "700" },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
    emptyState: { alignItems: "center", marginTop: 60, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: "600" }
});

export default PaymentsScreen;
