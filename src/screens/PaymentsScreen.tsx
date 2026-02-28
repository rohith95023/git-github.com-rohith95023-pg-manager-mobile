import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
    Dimensions,
    Alert,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { paymentAPI, pgAPI, tenantAPI, statsAPI } from "../services/api";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import DropdownSelector from "../components/common/DropdownSelector";
import PaymentFormModal from "../components/modals/PaymentFormModal";

const { width } = Dimensions.get("window");
const DEFAULT_PAYMENT_FILTERS = {
    propertyId: "ALL",
    status: ""
};
const PAYMENT_STATUS_OPTIONS = ["", "PAID", "PENDING", "PARTIAL"];

const PaymentsScreen = ({ route }: any) => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [payments, setPayments] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalReceived: 0,
        outstandingDues: 0,
        totalReceivable: 0,
        collectionRate: 0
    });
    const animatedProgress = React.useRef(new Animated.Value(0)).current;

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState(DEFAULT_PAYMENT_FILTERS);
    const [pendingFilters, setPendingFilters] = useState(DEFAULT_PAYMENT_FILTERS);
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);

    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [initialTenantId, setInitialTenantId] = useState<string | undefined>(undefined);

    const handleAddPayment = () => {
        setEditingPayment(null);
        setInitialTenantId(undefined);
        setModalVisible(true);
    };

    const handleEditPayment = (payment: any) => {
        setEditingPayment(payment);
        setInitialTenantId(undefined);
        setModalVisible(true);
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [paymentsRes, pgsRes, dashboardStatsRes, tenantsRes]: any = await Promise.all([
                paymentAPI.getAll(),
                pgAPI.getAll(),
                statsAPI.getDashboardStats(),
                tenantAPI.getActive()
            ]);

            const getTenantBalance = (tenant: any) => {
                if (tenant.stay_type === 'DAILY') {
                    const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
                    return Number(daily?.balance_amount || tenant.balance_amount || tenant.balance || 0);
                }
                return Number(tenant.balance || 0);
            };

            const outstandingDues = (tenantsRes || [])
                .filter((t: any) => getTenantBalance(t) > 0)
                .map((t: any) => ({
                    id: `virtual_${t.id}`,
                    tenant_id: t.id,
                    pg_id: t.pg_id,
                    amount: getTenantBalance(t),
                    status: 'PENDING_DUE',
                    tenants: t,
                    type: 'RENT',
                    payment_date: null,
                    pgs: t.pgs,
                    isVirtual: true,
                    billing_month: t.move_in_date || null
                }));

            setPayments([...(paymentsRes || []), ...outstandingDues]);
            setPgs(pgsRes || []);

            const ds = dashboardStatsRes;
            if (ds) {
                const totalReceivable = ds.monthlyRevenue + ds.pendingDues;
                const collectionRate = totalReceivable > 0 ? Math.round((ds.monthlyRevenue / totalReceivable) * 100) : 0;

                setStats({
                    totalReceived: ds.totalRevenue,
                    outstandingDues: ds.pendingDues,
                    totalReceivable: totalReceivable,
                    collectionRate: collectionRate
                });

                Animated.timing(animatedProgress, {
                    toValue: collectionRate,
                    duration: 1000,
                    useNativeDriver: false
                }).start();
            }
        } catch (error) {
            console.error("Failed to fetch financial data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (route?.params?.tenantId) {
            setInitialTenantId(route.params.tenantId);
            setEditingPayment(null);
            setModalVisible(true);
        }
    }, [route?.params?.tenantId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch =
                (p.tenants?.full_name || "").toLowerCase().includes(lowerSearch) ||
                (p.pgs?.name || "").toLowerCase().includes(lowerSearch) ||
                (p.billing_month || "").toLowerCase().includes(lowerSearch);

            const matchesPg = filters.propertyId === "ALL" || p.pg_id === filters.propertyId;

            const statusValue = (p.status || "").toUpperCase();
            let matchesStatus = true;
            if (filters.status) {
                if (filters.status === "PAID") {
                    matchesStatus = statusValue === "PAID" || statusValue === "COMPLETED";
                } else if (filters.status === "PENDING") {
                    matchesStatus = statusValue === "PENDING" || statusValue === "PENDING_DUE";
                } else {
                    matchesStatus = statusValue === filters.status;
                }
            }

            return matchesSearch && matchesPg && matchesStatus;
        });
    }, [payments, searchTerm, filters]);

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PAID':
            case 'COMPLETED': return COLORS.success;
            case 'PENDING': return COLORS.warning;
            case 'PENDING_DUE': return COLORS.danger;
            case 'FAILED': return COLORS.danger;
            default: return COLORS.textMuted;
        }
    };

    const SummaryCard = ({ title, value, icon, color, style }: any) => (
        <View style={[styles.summaryCard, style, { borderColor: color + "10" }]}>
            <View style={[styles.summaryIcon, { backgroundColor: color + "10" }]}>
                <MaterialCommunityIcons name={icon} size={18} color={color} />
            </View>
            <View>
                <Text style={styles.summaryLabel}>{title}</Text>
                <Text style={[styles.summaryValue, { color: COLORS.text }]}>₹{Number(value).toLocaleString()}</Text>
            </View>
        </View>
    );

    const renderPaymentItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.residentName} numberOfLines={1}>{item.tenants?.full_name || "Unknown Resident"}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "15" }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status === 'PENDING_DUE' ? 'OUTSTANDING DUE' : item.status}
                        </Text>
                    </View>
                </View>
                <View style={styles.amountContainer}>
                    <Text style={styles.paymentAmount}>₹{Number(item.amount || 0).toLocaleString()}</Text>
                </View>
            </View>

            <View style={styles.paymentContent}>
                <View style={[styles.infoRow, { marginBottom: 12 }]}>
                    <Feather name="map-pin" size={12} color={COLORS.textMuted} />
                    <Text style={styles.infoText} numberOfLines={1}>
                        {item.pgs?.name || "N/A"} • Room {item.tenants?.rooms?.room_number || "N/A"}
                        {item.tenants?.beds?.bed_number ? ` (${item.tenants.beds.bed_number})` : ""}
                    </Text>
                </View>

                <View style={styles.infoGrid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>BILLING PERIOD</Text>
                        <View style={styles.gridValueRow}>
                            <Feather name="calendar" size={12} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                            <Text style={styles.gridValue}>{item.billing_month || "N/A"}</Text>
                        </View>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>JOINING DATE</Text>
                        <View style={styles.gridValueRow}>
                            <Feather name="user-plus" size={12} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                            <Text style={styles.gridValue}>
                                {item.tenants?.move_in_date ? new Date(item.tenants.move_in_date).toLocaleDateString() : "N/A"}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.paymentFooter}>
                <TouchableOpacity style={styles.editButton} onPress={() => {
                    if (item.isVirtual) {
                        setEditingPayment(null);
                        setInitialTenantId(item.tenant_id);
                        setModalVisible(true);
                    } else {
                        handleEditPayment(item);
                    }
                }}>
                    {item.isVirtual ? (
                        <MaterialCommunityIcons name="currency-inr" size={14} color={COLORS.success} />
                    ) : (
                        <Feather name="edit-2" size={14} color={COLORS.primary} />
                    )}
                    <Text style={[styles.editButtonText, item.isVirtual && { color: COLORS.success }]}>{item.isVirtual ? "Pay Due" : "Edit"}</Text>
                </TouchableOpacity>
                {item.reservation_id && !item.isVirtual && (
                    <TouchableOpacity style={styles.splitButton}>
                        <Text style={styles.splitButtonText}>View Split</Text>
                        <Feather name="chevron-right" size={14} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    const ListHeader = () => (
        <View>
            {/* Grid Stats */}
            <View style={styles.summaryGrid}>
                <View style={styles.summaryRow}>
                    <SummaryCard title="Total Received" value={stats.totalReceived} icon="cash-check" color={COLORS.success} />
                    <SummaryCard title="Outstanding Dues" value={stats.outstandingDues} icon="clock-alert-outline" color={COLORS.warning} style={styles.summaryCardSpacing} />
                </View>
                <View style={styles.summaryRow}>
                    <SummaryCard title="Total Receivable" value={stats.totalReceivable} icon="currency-usd" color={COLORS.primary} />
                    <View style={[styles.summaryCard, styles.summaryCardPlaceholder]} />
                </View>
            </View>

            {/* Collection Rate Inline */}
            <View style={styles.collectionRateContainer}>
                <View style={styles.rateHeaderRow}>
                    <Text style={styles.rateLabelInline}>COLLECTION RATE</Text>
                    <Text style={styles.ratePercentInline}>{stats.collectionRate}% <Text style={styles.rateSubLabelInline}>collected</Text></Text>
                </View>
                <View style={styles.progressBarBgSubtle}>
                    <Animated.View
                        style={[
                            styles.progressBarFillSmall,
                            {
                                width: animatedProgress.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%']
                                }),
                                backgroundColor: COLORS.success
                            }
                        ]}
                    />
                </View>
            </View>

            {/* Search and Filters */}
            <View style={styles.filterSection}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={18} color={COLORS.textMuted} />
                        <TextInput
                            placeholder="Search records..."
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
                data={filteredPayments}
                keyExtractor={item => item.id}
                renderItem={renderPaymentItem}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="finance" size={60} color={COLORS.textMuted + "20"} />
                            <Text style={styles.emptyText}>No financial records found</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={loading && !refreshing ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> : null}
            />

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="Payment Filters"
                description="Filtered by property and status just like the web"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    const applied = { ...pendingFilters };
                    setFilters(applied);
                    setPendingFilters(applied);
                    setFilterSheetVisible(false);
                }}
                onReset={() => {
                    setFilters(DEFAULT_PAYMENT_FILTERS);
                    setPendingFilters(DEFAULT_PAYMENT_FILTERS);
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
                    label="Status"
                    options={PAYMENT_STATUS_OPTIONS.map(stat => ({
                        label: stat === "" ? "All Statuses" : stat.charAt(0) + stat.slice(1).toLowerCase(),
                        value: stat
                    }))}
                    value={pendingFilters.status}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, status: value }))}
                    placeholder="Select status..."
                />
            </FilterBottomSheet>

            <TouchableOpacity
                style={styles.fab}
                onPress={handleAddPayment}
            >
                <Feather name="plus" size={24} color="#fff" />
                <Text style={styles.fabText}>Record Payment</Text>
            </TouchableOpacity>

            <PaymentFormModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={() => {
                    fetchData();
                    setModalVisible(false);
                }}
                editingPayment={editingPayment}
                initialTenantId={initialTenantId}
            />
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },

        summaryGrid: {
            paddingHorizontal: 20,
            paddingVertical: 8,
            gap: 8,
        },
        summaryRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 8,
            gap: 8,
        },
        summaryCard: {
            flexBasis: "48%",
            maxWidth: "48%",
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderRadius: 18,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            minHeight: 90,
            justifyContent: "space-between",
            marginBottom: 8,
        },
        summaryCardSpacing: {
            marginLeft: 0,
        },
        summaryCardText: {
            flex: 1,
            flexWrap: "wrap",
        },
        summaryLabel: {
            fontSize: 9,
            fontWeight: "800",
            color: COLORS.textMuted,
            letterSpacing: 0.5,
        },
        summaryValue: {
            fontSize: 15,
            fontWeight: "900",
            color: COLORS.text,
        },
        summaryCardPlaceholder: {
            backgroundColor: "transparent",
            borderColor: "transparent",
        },
        summaryIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
        collectionRateContainer: {
            marginHorizontal: 20,
            marginVertical: 24,
        },
        rateHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },
        rateLabelInline: { fontSize: 11, fontWeight: "900", color: COLORS.text, letterSpacing: 1 },
        ratePercentInline: { fontSize: 16, fontWeight: "900", color: COLORS.success },
        rateSubLabelInline: { fontSize: 10, fontWeight: "600", color: COLORS.textMuted },
        progressBarBgSubtle: { height: 6, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" },
        progressBarFillSmall: { height: "100%", borderRadius: 3 },

        filterSection: { backgroundColor: COLORS.bg, marginBottom: 24 },
        searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, gap: 10, marginBottom: 16 },
        searchBar: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderRadius: 14,
            paddingHorizontal: 16,
            height: 50,
            borderWidth: 1,
            borderColor: COLORS.border,
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

        listContainer: { paddingHorizontal: 20, paddingBottom: 160 },
        paymentCard: {
            backgroundColor: COLORS.card,
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        paymentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
        headerLeft: { flex: 1, marginRight: 10 },
        residentName: { fontSize: 17, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
        statusBadge: {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 10,
            gap: 6
        },
        statusDot: { width: 6, height: 6, borderRadius: 3 },
        statusText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
        amountContainer: { backgroundColor: "rgba(16, 185, 129, 0.1)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
        paymentAmount: { fontSize: 20, fontWeight: "900", color: COLORS.success },

        paymentContent: { marginBottom: 20 },
        infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        infoText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600", flex: 1 },

        infoGrid: { flexDirection: "row", justifyContent: "space-between" },
        gridItem: { flex: 1 },
        gridLabel: { fontSize: 9, fontWeight: "800", color: COLORS.textMuted, marginBottom: 8, letterSpacing: 0.5 },
        gridValueRow: { flexDirection: "row", alignItems: "center" },
        gridValue: { fontSize: 14, fontWeight: "700", color: COLORS.text },

        paymentFooter: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 18,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.05)"
        },
        editButton: { flexDirection: "row", alignItems: "center", gap: 8, padding: 4 },
        editButtonText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
        splitButton: { flexDirection: "row", alignItems: "center", gap: 6, padding: 4 },
        splitButtonText: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted },

        fab: {
            position: "absolute",
            bottom: 30,
            right: 20,
            flexDirection: "row",
            paddingHorizontal: 20,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.primary,
            justifyContent: "center",
            alignItems: "center",
            elevation: 8,
            shadowColor: COLORS.primary,
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

export default PaymentsScreen;
