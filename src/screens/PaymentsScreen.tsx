import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DropdownSelector from "../components/common/DropdownSelector";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import SegmentedControl from "../components/common/SegmentedControl";
import PaymentFormModal from "../components/modals/PaymentFormModal";
import { useRefreshOnForeground } from "../hooks/useRefreshOnForeground";
import useThemePalette from "../hooks/useThemePalette";
import { invoiceAPI, ledgerAPI, paymentAPI, pgAPI, statsAPI, tenantAPI } from "../services/api";

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

    // View State
    const [activeView, setActiveView] = useState("transactions");
    const [invoices, setInvoices] = useState<any[]>([]);
    const [ledger, setLedger] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [loadingLedger, setLoadingLedger] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState(DEFAULT_PAYMENT_FILTERS);
    const [pendingFilters, setPendingFilters] = useState(DEFAULT_PAYMENT_FILTERS);
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);

    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [initialTenantId, setInitialTenantId] = useState<string | undefined>(undefined);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

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
                tenantAPI.getAll()
            ]);

            const tenantsArr = Array.isArray(tenantsRes) ? tenantsRes : (tenantsRes?.data || []);
            const pgsArr = Array.isArray(pgsRes) ? pgsRes : [];
            const paymentsArr = Array.isArray(paymentsRes) ? paymentsRes : [];

            // Build lookup maps: tenant_id -> tenant obj, pg_id -> pg obj
            const tenantMap: Record<string, any> = {};
            tenantsArr.forEach((t: any) => { tenantMap[t.id] = t; });
            const pgMap: Record<string, any> = {};
            pgsArr.forEach((pg: any) => { pgMap[pg.id] = pg; });

            // Enrich payment records with tenant/pg lookup
            const enrichedPayments = paymentsArr.map((p: any) => ({
                ...p,
                tenants: p.tenants || tenantMap[p.tenant_id] || null,
                pgs: p.pgs || pgMap[p.pg_id] || null,
            }));

            const getTenantBalance = (tenant: any) => Number(tenant.outstanding_balance || 0);

            const outstandingDues = tenantsArr
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
                    pgs: pgMap[t.pg_id] || null,
                    isVirtual: true,
                    billing_month: t.move_in_date || null
                }));

            setPayments([...enrichedPayments, ...outstandingDues]);
            setPgs(pgsArr);

            const ds = dashboardStatsRes;
            if (ds) {
                // Backend returns: monthlyRevenue, totalPendingDues
                const totalReceived = Number(ds.monthlyRevenue || ds.totalRevenue || 0);
                const outstandingDuesAmt = Number(ds.totalPendingDues || ds.pendingDues || ds.total_pending || 0);
                const totalReceivable = totalReceived + outstandingDuesAmt;
                const collectionRate = totalReceivable > 0 ? Math.round((totalReceived / totalReceivable) * 100) : 0;

                setStats({
                    totalReceived,
                    outstandingDues: outstandingDuesAmt,
                    totalReceivable,
                    collectionRate
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

    const fetchInvoices = useCallback(async () => {
        try {
            setLoadingInvoices(true);
            const res: any = await invoiceAPI.getAll();
            // Backend returns array directly or wrapped
            const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
            setInvoices(items);
        } catch (error) {
            console.error("Failed to fetch invoices:", error);
        } finally {
            setLoadingInvoices(false);
        }
    }, []);

    const fetchLedger = useCallback(async () => {
        try {
            setLoadingLedger(true);
            const res: any = await ledgerAPI.getAll();
            // Backend returns { items: [...], summary: {...} }
            const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
            setLedger(items);
        } catch (error) {
            console.error("Failed to fetch ledger:", error);
        } finally {
            setLoadingLedger(false);
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            if (activeView === "transactions") fetchData();
            else if (activeView === "invoices") fetchInvoices();
            else fetchLedger();
        }
    }, [activeView, fetchData, fetchInvoices, fetchLedger, isFocused]);

    useRefreshOnForeground(fetchData, isFocused);

    const onRefresh = () => {
        setRefreshing(true);
        if (activeView === "transactions") fetchData();
        else if (activeView === "invoices") fetchInvoices();
        else fetchLedger();
    };

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const lowerSearch = searchTerm.toLowerCase();
            if (!lowerSearch) return true; // skip search check if empty
            // p.tenants is enriched in fetchData via tenantMap
            const name = (p.tenants?.full_name || p.tenant_name || "").toLowerCase();
            const pg = (p.pgs?.name || p.pg_name || "").toLowerCase();
            const month = (p.billing_month || "").toLowerCase();
            const matchesSearch = name.includes(lowerSearch) || pg.includes(lowerSearch) || month.includes(lowerSearch);

            const matchesPg = filters.propertyId === "ALL" || p.pg_id === filters.propertyId;

            const statusValue = (p.status || "").toUpperCase();
            let matchesStatus = true;
            if (filters.status) {
                if (filters.status === "PAID") {
                    matchesStatus = statusValue === "PAID" || statusValue === "COMPLETED";
                } else if (filters.status === "PENDING") {
                    matchesStatus = statusValue === "PENDING" || statusValue === "PENDING_DUE";
                } else if (filters.status === "PARTIAL") {
                    matchesStatus = true;
                } else {
                    matchesStatus = statusValue === filters.status;
                }
            }

            return matchesSearch && matchesPg && matchesStatus;
        }).sort((a, b) => {
            if (a.isVirtual && !b.isVirtual) return -1;
            if (!a.isVirtual && b.isVirtual) return 1;
            return 0;
        });
    }, [payments, searchTerm, filters]);

    const groupedPayments = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        filteredPayments.forEach((p: any) => {
            const tId = p.tenant_id;
            if (!tId) return;
            if (!groups[tId]) groups[tId] = [];
            groups[tId].push(p);
        });

        let result = Object.entries(groups).map(([tenantId, items]) => {
            // p.tenants and p.pgs are enriched in fetchData via tenantMap/pgMap
            const tenant = items[0].tenants || null;
            const pg = items[0].pgs || null;
            return {
                tenantId,
                tenant,
                pg,
                tenantName: tenant?.full_name || items[0].tenant_name || "Resident",
                pgName: pg?.name || items[0].pg_name || "—",
                totalAmount: items.reduce((sum, current) => sum + (Number(current.amount) || 0), 0),
                items,
                hasVirtual: items.some(item => item.isVirtual)
            };
        });

        if (filters.status === "PARTIAL") {
            result = result.filter(g => g.hasVirtual && g.items.length > 1);
        }

        return result.sort((a, b) => {
            if (a.hasVirtual && !b.hasVirtual) return -1;
            if (!a.hasVirtual && b.hasVirtual) return 1;
            return 0;
        });
    }, [filteredPayments, filters.status]);

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

    const getInvoiceLabel = (item: any) => {
        if (item.isVirtual) return "Outstanding Balance";
        const type = (item.type || 'RENT').toUpperCase();
        if (type === 'RENT' && (item.billing_month || item.payment_date)) {
            const dateStr = item.billing_month || item.payment_date;
            try {
                const date = new Date(dateStr);
                return `Rent – ${date.toLocaleDateString([], { month: 'short', year: 'numeric' })}`;
            } catch (e) {
                return "Rent Payment";
            }
        }
        if (type === 'DEPOSIT') return "Security Deposit";
        if (type === 'MAINTENANCE') return "Maintenance Payment";
        if (type === 'OPENING_BALANCE') return "Opening Balance";
        return item.type || "Payment";
    };

    const SummarySection = () => (
        <View style={styles.summaryContainer}>
            {/* Main Dominant Metric */}
            <View style={styles.outstandingMainCard}>
                <View>
                    <Text style={styles.outstandingLabel}>TOTAL OUTSTANDING</Text>
                    <Text style={styles.outstandingValue}>₹{Number(stats.outstandingDues || 0).toLocaleString()}</Text>
                </View>
                <View style={[styles.outstandingIcon, { backgroundColor: COLORS.danger + '10' }]}>
                    <MaterialCommunityIcons name="clock-alert-outline" size={24} color={COLORS.danger} />
                </View>
            </View>

            {/* Grid for Secondary Metrics */}
            <View style={styles.summaryGrid}>
                <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>TOTAL RECEIVED</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.success }]}>₹{Number(stats.totalReceived || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>RECEIVABLE</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.primary }]}>₹{Number(stats.totalReceivable || 0).toLocaleString()}</Text>
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

    const renderPaymentItem = ({ item: group }: { item: any }) => {
        const isExpanded = expandedGroups.includes(group.tenantId);
        const hasMultiple = group.items.length > 1;

        return (
            <View style={styles.groupContainer}>
                <TouchableOpacity
                    style={styles.paymentCard}
                    activeOpacity={0.7}
                    onPress={() => {
                        if (hasMultiple) {
                            setExpandedGroups(prev =>
                                prev.includes(group.tenantId)
                                    ? prev.filter(id => id !== group.tenantId)
                                    : [...prev, group.tenantId]
                            );
                        } else {
                            const firstItem = group.items[0];
                            if (firstItem.isVirtual) {
                                setEditingPayment(null);
                                setInitialTenantId(firstItem.tenant_id);
                                setModalVisible(true);
                            } else {
                                handleEditPayment(firstItem);
                            }
                        }
                    }}
                >
                    <View style={styles.paymentCardHeader}>
                        <View style={styles.cardHeaderLeft}>
                            <Text style={styles.residentName} numberOfLines={1}>{group.tenantName || "Resident"}</Text>
                            <View style={[styles.statusPill, {
                                backgroundColor: (group.hasVirtual && group.items.length > 1 ? COLORS.warning : group.hasVirtual ? COLORS.danger : COLORS.success) + "12"
                            }]}>
                                <Text style={[styles.statusPillText, {
                                    color: group.hasVirtual && group.items.length > 1 ? COLORS.warning : group.hasVirtual ? COLORS.danger : COLORS.success
                                }]}>
                                    {group.hasVirtual ? (group.items.length > 1 ? 'PARTIAL' : 'OUTSTANDING') : 'TRANSACTION COMPLETED'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.cardHeaderRight}>
                            <Text style={[styles.paymentAmount, {
                                color: group.hasVirtual && group.items.length > 1 ? COLORS.warning : group.hasVirtual ? COLORS.danger : COLORS.text
                            }]}>
                                ₹{Number(group.totalAmount || 0).toLocaleString()}
                            </Text>
                            {hasMultiple && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '700' }}>
                                        {group.items.length} TRANSACTIONS
                                    </Text>
                                    <Feather
                                        name={isExpanded ? "chevron-up" : "chevron-down"}
                                        size={14}
                                        color={COLORS.textMuted}
                                        style={{ marginLeft: 4 }}
                                    />
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                            <Feather name="home" size={12} color={COLORS.textMuted} />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {group.pgName} • Room {group.tenant?.rooms?.room_number || "N/A"}
                            </Text>
                        </View>
                        {!hasMultiple && (
                            <View style={styles.detailRow}>
                                <Feather name="calendar" size={12} color={COLORS.textMuted} />
                                <Text style={styles.detailText}>
                                    {group.items[0].payment_date || group.items[0].billing_month || `Joined: ${new Date(group.tenant?.move_in_date).toLocaleDateString()}`}
                                </Text>
                            </View>
                        )}
                    </View>

                    {hasMultiple && !isExpanded && (
                        <View style={styles.groupInfoBadge}>
                            <Feather name="layers" size={12} color={COLORS.primary} />
                            <Text style={styles.groupInfoText}>Tap to view individual transactions</Text>
                        </View>
                    )}

                    {!hasMultiple && group.items[0].isVirtual && (
                        <View style={[styles.payButton, { backgroundColor: COLORS.primary, marginTop: 10 }]}>
                            <MaterialCommunityIcons name="currency-inr" size={18} color="#fff" />
                            <Text style={styles.payButtonText}>Pay Due Amount</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Expanded Transactions */}
                {isExpanded && group.items.map((subItem: any, idx: number) => (
                    <TouchableOpacity
                        key={subItem.id || idx}
                        style={[styles.paymentCard, styles.nestedItem, { marginBottom: idx === group.items.length - 1 ? 16 : 4 }]}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (subItem.isVirtual) {
                                setEditingPayment(null);
                                setInitialTenantId(subItem.tenant_id);
                                setModalVisible(true);
                            } else {
                                handleEditPayment(subItem);
                            }
                        }}
                    >
                        <View style={styles.nestedIndicator} />
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>
                                    {getInvoiceLabel(subItem)}
                                </Text>
                                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                                    {subItem.payment_date || subItem.billing_month || 'Recent Record'}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: subItem.isVirtual ? COLORS.danger : COLORS.text }}>
                                    ₹{Number(subItem.amount || 0).toLocaleString()}
                                </Text>
                                <View style={[styles.statusPill, {
                                    backgroundColor: (subItem.status === 'PENDING_DUE' && group.items.length > 1 ? COLORS.warning : getStatusColor(subItem.status)) + "12",
                                    marginTop: 4
                                }]}>
                                    <Text style={[styles.statusPillText, {
                                        color: subItem.status === 'PENDING_DUE' && group.items.length > 1 ? COLORS.warning : getStatusColor(subItem.status),
                                        fontSize: 8
                                    }]}>
                                        {subItem.status === 'PENDING_DUE' ? (group.items.length > 1 ? 'PARTIAL' : 'PENDING') : subItem.status}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const getInvoiceStatusColor = (status: string, colors: any) => {
        switch (status?.toUpperCase()) {
            case 'PAID': return colors.success;
            case 'PARTIAL': return colors.warning;
            case 'UNPAID': return colors.danger;
            default: return colors.textMuted;
        }
    };

    const renderInvoiceItem = ({ item }: { item: any }) => (
        <View style={styles.groupContainer}>
            <View style={styles.paymentCard}>
                <View style={styles.paymentCardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.residentName} numberOfLines={1}>INV-{String(item.id).slice(0, 6).toUpperCase()}</Text>
                        <View style={[styles.statusPill, { backgroundColor: getInvoiceStatusColor(item.status, COLORS) + "12" }]}>
                            <Text style={[styles.statusPillText, { color: getInvoiceStatusColor(item.status, COLORS) }]}>{item.status}</Text>
                        </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                        <Text style={styles.paymentAmount}>₹{Number(item.total_amount || 0).toLocaleString()}</Text>
                        <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Period: {new Date(item.billing_period_start).toLocaleDateString([], { month: 'short', year: 'numeric' })}</Text>
                    </View>
                </View>
                <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                        <Feather name="user" size={12} color={COLORS.textMuted} />
                        <Text style={styles.detailText}>{item.tenants?.full_name || "N/A"}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Feather name="home" size={12} color={COLORS.textMuted} />
                        <Text style={styles.detailText}>{item.tenants?.pgs?.name || "N/A"}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderLedgerItem = ({ item }: { item: any }) => (
        <View style={styles.groupContainer}>
            <View style={styles.paymentCard}>
                <View style={styles.paymentCardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.residentName} numberOfLines={1}>{item.description || "Ledger Entry"}</Text>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.cardHeaderRight}>
                        <Text style={[styles.paymentAmount, { color: item.type === 'DEBIT' ? COLORS.danger : COLORS.success }]}>
                            {item.type === 'DEBIT' ? '-' : '+'}₹{Number(item.amount || 0).toLocaleString()}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                        <Feather name="user" size={12} color={COLORS.textMuted} />
                        <Text style={styles.detailText}>{item.tenants?.full_name || "N/A"}</Text>
                    </View>
                </View>
            </View>
        </View>
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
                data={activeView === "transactions" ? groupedPayments : activeView === "invoices" ? invoices : ledger}
                keyExtractor={item => item.id || item.tenantId}
                renderItem={activeView === "transactions" ? renderPaymentItem : activeView === "invoices" ? renderInvoiceItem : renderLedgerItem}
                ListHeaderComponent={
                    <View>
                        <SummarySection />

                        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                            <SegmentedControl
                                options={[
                                    { label: "Transactions", value: "transactions" },
                                    { label: "Invoices", value: "invoices" },
                                    { label: "Ledger", value: "ledger" },
                                ]}
                                value={activeView}
                                onChange={setActiveView}
                            />
                        </View>

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
        groupContainer: {
            marginBottom: 4,
        },
        nestedItem: {
            marginLeft: 32,
            marginRight: 16,
            padding: 12,
            borderLeftWidth: 2,
            borderLeftColor: COLORS.border + '30',
            backgroundColor: COLORS.card,
            flexDirection: 'row',
            alignItems: 'center',
            elevation: 1,
        },
        nestedIndicator: {
            position: 'absolute',
            left: -2,
            top: '50%',
            width: 12,
            height: 2,
            backgroundColor: COLORS.border + '30',
        },
        groupInfoBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: COLORS.primary + '10',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            marginTop: 8,
        },
        groupInfoText: {
            fontSize: 11,
            fontWeight: '700',
            color: COLORS.primary,
        },
    });

export default PaymentsScreen;
