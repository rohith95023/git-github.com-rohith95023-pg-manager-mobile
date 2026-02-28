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
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { paymentAPI, pgAPI, tenantAPI, statsAPI } from "../services/api";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import { useRefreshOnForeground } from "../hooks/useRefreshOnForeground";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import DropdownSelector from "../components/common/DropdownSelector";
import PaymentFormModal from "../components/modals/PaymentFormModal";

const { width } = Dimensions.get("window");
const DEFAULT_PAYMENT_FILTERS = {
    propertyId: "ALL",
    status: ""
};
const PAYMENT_STATUS_OPTIONS = ["", "PAID", "PENDING", "PARTIAL"];

const PaymentsScreen = ({ route, navigation }: any) => {
    const COLORS = useThemePalette();
    const isFocused = useIsFocused();
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
    }, [animatedProgress]);

    useEffect(() => {
        if (route?.params?.tenantId) {
            setInitialTenantId(route.params.tenantId);
            setEditingPayment(null);
            setModalVisible(true);
        }
    }, [route?.params?.tenantId]);

    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [fetchData, isFocused]);

    useRefreshOnForeground(fetchData, isFocused);

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
        }).sort((a, b) => {
            // Virtual/Pending dues first, then by date
            if (a.isVirtual && !b.isVirtual) return -1;
            if (!a.isVirtual && b.isVirtual) return 1;
            return 0;
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

    const SummarySection = () => (
        <View style={styles.summaryContainer}>
            {/* Main Dominant Metric */}
            <View style={styles.outstandingMainCard}>
                <View>
                    <Text style={styles.outstandingLabel}>TOTAL OUTSTANDING</Text>
                    <Text style={styles.outstandingValue}>₹{stats.outstandingDues.toLocaleString()}</Text>
                </View>
                <View style={[styles.outstandingIcon, { backgroundColor: COLORS.danger + '10' }]}>
                    <MaterialCommunityIcons name="clock-alert-outline" size={24} color={COLORS.danger} />
                </View>
            </View>

            {/* Grid for Secondary Metrics */}
            <View style={styles.summaryGrid}>
                <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>TOTAL RECEIVED</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.success }]}>₹{stats.totalReceived.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>RECEIVABLE</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.primary }]}>₹{stats.totalReceivable.toLocaleString()}</Text>
                </View>
            </View>

            {/* Enhanced Collection Rate */}
            <View style={styles.rateCard}>
                <View style={styles.rateInfo}>
                    <Text style={styles.rateTitle}>COLLECTION RATE</Text>
                </View>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBg}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                {
                                    width: animatedProgress.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    }),
                                    backgroundColor: COLORS.success
                                }
                            ]}
                        >
                            <Text style={styles.progressText}>{stats.collectionRate}%</Text>
                        </Animated.View>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderPaymentItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.paymentCard}
            activeOpacity={0.7}
            onPress={() => item.isVirtual ? {} : handleEditPayment(item)}
        >
            <View style={styles.paymentCardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.residentName} numberOfLines={1}>{item.tenants?.full_name || "Unknown Resident"}</Text>
                    <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + "12" }]}>
                        <Text style={[styles.statusPillText, { color: getStatusColor(item.status) }]}>
                            {item.status === 'PENDING_DUE' ? 'OUTSTANDING' : item.status}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardHeaderRight}>
                    <Text style={[styles.paymentAmount, { color: item.isVirtual ? COLORS.danger : COLORS.text }]}>
                        ₹{Number(item.amount || 0).toLocaleString()}
                    </Text>
                </View>
            </View>

            <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                    <Feather name="home" size={12} color={COLORS.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>
                        {item.pgs?.name || "N/A"} • Room {item.tenants?.rooms?.room_number || "N/A"}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Feather name="calendar" size={12} color={COLORS.textMuted} />
                    <Text style={styles.detailText}>
                        {item.billing_month ? `Billing: ${item.billing_month}` : `Joined: ${new Date(item.tenants?.move_in_date).toLocaleDateString()}`}
                    </Text>
                </View>
            </View>

            {item.isVirtual ? (
                <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: COLORS.primary }]}
                    onPress={() => {
                        setEditingPayment(null);
                        setInitialTenantId(item.tenant_id);
                        setModalVisible(true);
                    }}
                >
                    <MaterialCommunityIcons name="currency-inr" size={18} color="#fff" />
                    <Text style={styles.payButtonText}>Pay Due Amount</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.paidBadge}>
                    <Feather name="check-circle" size={14} color={COLORS.success} />
                    <Text style={[styles.paidText, { color: COLORS.success }]}>Transaction Recorded</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Compact App Bar */}
            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.appBarButton}>
                    <Feather name="menu" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Collections & Dues</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                    <Feather name="refresh-cw" size={18} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredPayments}
                keyExtractor={item => item.id}
                renderItem={renderPaymentItem}
                ListHeaderComponent={
                    <View>
                        <SummarySection />

                        {/* Improved Search Section */}
                        <View style={styles.searchSection}>
                            <View style={styles.searchBox}>
                                <Feather name="search" size={18} color={COLORS.textMuted} />
                                <TextInput
                                    placeholder="Search residents or properties..."
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
                                    onPress={() => setFilterSheetVisible(true)}
                                >
                                    <Feather
                                        name="sliders"
                                        size={18}
                                        color={filters.propertyId !== "ALL" || filters.status !== "" ? COLORS.primary : COLORS.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                }
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyView}>
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
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    setFilters(pendingFilters);
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
                />
                <DropdownSelector
                    label="Status"
                    options={PAYMENT_STATUS_OPTIONS.map(stat => ({
                        label: stat === "" ? "All Statuses" : stat.charAt(0) + stat.slice(1).toLowerCase(),
                        value: stat
                    }))}
                    value={pendingFilters.status}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, status: value }))}
                />
            </FilterBottomSheet>

            <TouchableOpacity style={styles.fab} onPress={handleAddPayment}>
                <Feather name="plus" size={24} color="#fff" />
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
        outstandingMainCard: {
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
        outstandingLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
        outstandingValue: { fontSize: 28, fontWeight: '900', color: COLORS.text, marginTop: 4 },
        outstandingIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

        summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
        summaryCell: {
            flex: 1,
            backgroundColor: COLORS.card,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        summaryLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
        summaryValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },

        rateCard: {
            backgroundColor: COLORS.card,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        rateInfo: { marginBottom: 10 },
        rateTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
        progressContainer: { marginTop: 4 },
        progressBg: { height: 24, backgroundColor: COLORS.bg, borderRadius: 12, overflow: 'hidden' },
        progressFill: { height: '100%', justifyContent: 'center', alignItems: 'center' },
        progressText: { fontSize: 12, fontWeight: '900', color: '#fff' },

        // Search Section
        searchSection: { paddingHorizontal: 16, paddingBottom: 16 },
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

        // List & Cards
        listContent: { paddingBottom: 100 },
        paymentCard: {
            backgroundColor: COLORS.card,
            borderRadius: 14,
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 2,
        },
        paymentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
        cardHeaderLeft: { flex: 1 },
        residentName: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
        statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
        statusPillText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
        cardHeaderRight: { alignItems: 'flex-end' },
        paymentAmount: { fontSize: 18, fontWeight: '900' },

        cardDetails: { gap: 8, marginBottom: 16 },
        detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        detailText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },

        payButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 48,
            borderRadius: 12,
        },
        payButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
        paidBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: COLORS.border + '40',
        },
        paidText: { fontSize: 12, fontWeight: '700' },

        fab: {
            position: 'absolute',
            bottom: 30,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.primary,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 10,
        },
        emptyView: { marginTop: 60, alignItems: 'center' },
        emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', marginTop: 12 },
    });

export default PaymentsScreen;
