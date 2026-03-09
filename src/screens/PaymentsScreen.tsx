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
import ScreenHeader from "../components/common/ScreenHeader";
import SegmentedControl from "../components/common/SegmentedControl";
import PaymentFormModal from "../components/modals/PaymentFormModal";
import { useRefreshOnForeground } from "../hooks/useRefreshOnForeground";
import useThemePalette from "../hooks/useThemePalette";
import { invoiceAPI, ledgerAPI, paymentAPI, pgAPI, statsAPI, tenantAPI } from "../services/api";

const { width } = Dimensions.get("window");
const DEFAULT_PAYMENT_FILTERS = {
    propertyId: "ALL",
    status: "",
    tenantStatus: "ACTIVE"
};
const PAYMENT_STATUS_OPTIONS = ["", "PAID", "PENDING", "PARTIAL"];
const TENANT_STATUS_OPTIONS = ["ALL", "ACTIVE", "DELETED"];

const PaymentsScreen = ({ route, navigation }: any) => {
    const COLORS = useThemePalette();
    const isFocused = useIsFocused();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [payments, setPayments] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [tenantsMap, setTenantsMap] = useState<Record<string, any>>({});
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
    const [dues, setDues] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [loadingDues, setLoadingDues] = useState(false);
    const [activeDueSegment, setActiveDueSegment] = useState("all");

    // Unified Stats
    const [paymentStats, setPaymentStats] = useState({
        overdue: 0,
        upcoming: 0,
        paidThisMonth: 0
    });

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
            const [paymentsRes, pgsRes, dashboardStatsRes, tenantsRes, invoicesRes]: any = await Promise.all([
                paymentAPI.getAll().catch(() => []),
                pgAPI.getAll().catch(() => []),
                statsAPI.getDashboardStats().catch(() => ({})),
                tenantAPI.search({ limit: 1000 }).catch(() => []),
                invoiceAPI.getAll().catch(() => [])
            ]);

            const tenantsArr = Array.isArray(tenantsRes) ? tenantsRes : (tenantsRes?.items || tenantsRes?.data || []);
            const pgsArr = Array.isArray(pgsRes) ? pgsRes : (pgsRes?.items || pgsRes?.data || []);
            const paymentsArr = Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes?.items || paymentsRes?.data || []);
            const invoicesArr = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes?.items || invoicesRes?.data || []);

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

            const getTenantBalance = (tenant: any) => {
                const base = Number(tenant.balance || tenant.outstanding_balance || 0);
                if (base > 0) return base;
                // If base is 0, verify against invoices we just fetched
                const unpaid = invoicesArr.filter((inv: any) =>
                    inv.tenant_id === tenant.id &&
                    (inv.status?.toUpperCase() === 'UNPAID' || inv.status?.toUpperCase() === 'PARTIAL')
                );
                return unpaid.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0);
            };

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

            const allPayments = [...enrichedPayments, ...outstandingDues];
            setPayments(allPayments);
            setPgs(pgsArr);
            setTenantsMap(tenantMap);
            setInvoices(invoicesArr); // Update shared invoices state

            // Backend might wrap stats in a data envelope
            const ds = dashboardStatsRes?.data || dashboardStatsRes;
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

            // Calculate Payment Status (Overdue/Upcoming)
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            let overdue = 0;
            let upcoming = 0;
            const paidThisMonthCount = invoicesArr.filter((inv: any) => {
                const isPaid = inv.status?.toUpperCase() === 'PAID';
                // Simplified paid this month check: paid status + created_at in this month
                if (isPaid && inv.created_at) {
                    const payDate = new Date(inv.created_at);
                    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
                }
                return false;
            }).length;

            invoicesArr.forEach((inv: any) => {
                if (inv.status === 'UNPAID' || inv.status === 'PARTIAL') {
                    const end = inv.billing_period_end ? new Date(inv.billing_period_end) : null;
                    if (end) {
                        end.setHours(0, 0, 0, 0);
                        if (end < now) overdue++;
                        else upcoming++;
                    } else {
                        upcoming++;
                    }
                }
            });

            setPaymentStats({
                overdue,
                upcoming,
                paidThisMonth: paidThisMonthCount
            });

            Animated.timing(animatedProgress, {
                toValue: collectionRate,
                duration: 1000,
                useNativeDriver: false
            }).start();
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
            fetchData(); // Always fetch core data
            if (activeView === "invoices") fetchInvoices();
            else if (activeView === "ledger") fetchLedger();
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
            const tenant = p.tenants || tenantsMap[p.tenant_id];

            // Tenant Status Filter
            if (filters.tenantStatus === "ACTIVE" && !tenant) return false;
            if (filters.tenantStatus === "DELETED" && tenant) return false;

            if (!lowerSearch) {
                // If no search, still check other filters
                const matchesPg = filters.propertyId === "ALL" || filters.propertyId === "" || p.pg_id === filters.propertyId;
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
                return matchesPg && matchesStatus;
            }

            const name = (tenant?.full_name || p.tenant_name || "").toLowerCase();
            const pg = (p.pgs?.name || p.pg_name || "").toLowerCase();
            const month = (p.billing_month || "").toLowerCase();
            const matchesSearch = name.includes(lowerSearch) || pg.includes(lowerSearch) || month.includes(lowerSearch);

            const matchesPg = filters.propertyId === "ALL" || filters.propertyId === "" || p.pg_id === filters.propertyId;

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
    }, [payments, searchTerm, filters, tenantsMap]);

    const groupedPayments = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        filteredPayments.forEach((p: any) => {
            const tId = p.tenant_id;
            if (!tId) return;
            if (!groups[tId]) groups[tId] = [];
            groups[tId].push(p);
        });

        let result = Object.entries(groups).map(([tenantId, items]) => {
            const tenant = items[0].tenants || null;
            const pg = items[0].pgs || null;
            return {
                tenantId,
                tenant,
                pg,
                tenantName: tenant?.full_name || (items[0].tenant_name ? items[0].tenant_name.charAt(0).toUpperCase() + items[0].tenant_name.slice(1) : "Resident"),
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

    const getDueStatus = (inv: any) => {
        const end = inv.billing_period_end ? new Date(inv.billing_period_end) : null;
        if (!end) return "upcoming";
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(0, 0, 0, 0);

        if (endDate < now) return "overdue";
        if (endDate.getTime() === now.getTime()) return "due_today";
        return "upcoming";
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const tenant = tenantsMap[inv.tenant_id];

            // Tenant Status Filter
            if (filters.tenantStatus === "ACTIVE" && !tenant) return false;
            if (filters.tenantStatus === "DELETED" && tenant) return false;

            // Property Filter
            if (filters.propertyId !== "ALL" && filters.propertyId !== "" && inv.pg_id !== filters.propertyId) return false;

            // Status Filter
            if (filters.status && inv.status !== filters.status) return false;

            // Search Filter
            if (searchTerm.trim()) {
                const lower = searchTerm.toLowerCase();
                const name = (tenant?.full_name || inv.tenant_name || "").toLowerCase();
                if (!name.includes(lower)) return false;
            }

            return true;
        });
    }, [invoices, tenantsMap, filters, searchTerm]);

    const filteredLedger = useMemo(() => {
        return ledger.filter(entry => {
            const tenant = tenantsMap[entry.tenant_id];

            // Tenant Status Filter
            if (filters.tenantStatus === "ACTIVE" && !tenant) return false;
            if (filters.tenantStatus === "DELETED" && tenant) return false;

            // Property Filter - Ledger might not have pg_id directly on all entries, but usually does
            if (filters.propertyId !== "ALL" && filters.propertyId !== "" && entry.pg_id && entry.pg_id !== filters.propertyId) return false;

            // Search Filter
            if (searchTerm.trim()) {
                const lower = searchTerm.toLowerCase();
                const name = (tenant?.full_name || entry.tenant_name || "").toLowerCase();
                const desc = (entry.description || "").toLowerCase();
                if (!name.includes(lower) && !desc.includes(lower)) return false;
            }

            return true;
        });
    }, [ledger, tenantsMap, filters, searchTerm]);

    const groupedDues = useMemo(() => {
        let filtered = invoices.filter((inv: any) => {
            const tenant = tenantsMap[inv.tenant_id];

            // Tenant Status Filter
            if (filters.tenantStatus === "ACTIVE" && !tenant) return false;
            if (filters.tenantStatus === "DELETED" && tenant) return false;

            // Property Filter
            if (filters.propertyId !== "ALL" && filters.propertyId !== "" && inv.pg_id !== filters.propertyId) return false;

            return inv.status === 'UNPAID' || inv.status === 'PARTIAL';
        });

        // segment filter
        if (activeDueSegment === "overdue") {
            filtered = filtered.filter(inv => getDueStatus(inv) === "overdue");
        } else if (activeDueSegment === "upcoming") {
            filtered = filtered.filter(inv => getDueStatus(inv) === "upcoming" || getDueStatus(inv) === "due_today");
        }

        // search
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter((inv: any) => {
                const t = tenantsMap[inv.tenant_id] || {};
                return (t.full_name || "").toLowerCase().includes(lower) || (inv.tenant_name || "").toLowerCase().includes(lower);
            });
        }

        const groups: Record<string, any> = {};
        filtered.forEach((inv: any) => {
            const tId = inv.tenant_id;
            const tenant = tenantsMap[tId] || null;
            if (!groups[tId]) {
                groups[tId] = {
                    tenantId: tId,
                    tenantName: tenant?.full_name || inv.tenant_name || "Resident",
                    items: [],
                    tenant,
                    pgName: pgs.find(p => p.id === inv.pg_id)?.name || "—"
                };
            }
            groups[tId].items.push(inv);
        });

        return Object.values(groups).map((g: any) => ({
            ...g,
            totalDue: g.items.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0),
            hasOverdue: g.items.some((inv: any) => getDueStatus(inv) === "overdue")
        })).sort((a: any, b: any) => (a.hasOverdue ? -1 : 1));
    }, [invoices, activeDueSegment, searchTerm, tenantsMap, pgs]);

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

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
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

            {/* Payment Status Section (from Dues & Collections) */}
            <View style={styles.statusRow}>
                <View style={[styles.statusCard, { borderColor: COLORS.danger + '30' }]}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.danger }]} />
                    <View>
                        <Text style={styles.statusLabel}>OVERDUE</Text>
                        <Text style={[styles.statusValue, { color: COLORS.danger }]}>{paymentStats.overdue}</Text>
                    </View>
                </View>
                <View style={[styles.statusCard, { borderColor: COLORS.warning + '30' }]}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
                    <View>
                        <Text style={styles.statusLabel}>UPCOMING</Text>
                        <Text style={[styles.statusValue, { color: COLORS.warning }]}>{paymentStats.upcoming}</Text>
                    </View>
                </View>
                <View style={[styles.statusCard, { borderColor: COLORS.success + '30' }]}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                    <View>
                        <Text style={styles.statusLabel}>PAID THIS MONTH</Text>
                        <Text style={[styles.statusValue, { color: COLORS.success }]}>{paymentStats.paidThisMonth}</Text>
                    </View>
                </View>
            </View>

            {/* Collection Rate */}
            <View style={styles.rateCard}>
                <View style={styles.rateInfoRow}>
                    <Text style={styles.rateTitle}>COLLECTION RATE</Text>
                    <Text style={[styles.ratePercent, { color: COLORS.success }]}>{stats.collectionRate}%</Text>
                </View>
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
                    />
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
                                {group.pgName}{(group.tenant?.rooms?.room_number || group.items[0].room_number || group.items[0].room_name) ? ` • Room ${group.tenant?.rooms?.room_number || group.items[0].room_number || group.items[0].room_name}` : ''}
                            </Text>
                        </View>
                        {!hasMultiple && (
                            <View style={styles.detailRow}>
                                <Feather name="calendar" size={12} color={COLORS.textMuted} />
                                <Text style={styles.detailText}>
                                    {formatDate(group.items[0].payment_date || group.items[0].billing_month) || `Joined: ${formatDate(group.tenant?.move_in_date)}`}
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
                                    {formatDate(subItem.payment_date || subItem.billing_month) || 'Recent Record'}
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

    const renderInvoiceItem = ({ item }: { item: any }) => {
        const tenant = item.tenants || tenantsMap[item.tenant_id];
        return (
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
                            <Text style={[styles.paymentAmount, { color: COLORS.text }]}>₹{Number(item.total_amount || 0).toLocaleString()}</Text>
                            <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Period: {formatDate(item.billing_period_start)}</Text>
                        </View>
                    </View>
                    <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                            <Feather name="user" size={12} color={COLORS.textMuted} />
                            {tenant?.full_name || item.tenant_name ? (
                                <Text style={styles.detailText}>{tenant?.full_name || item.tenant_name}</Text>
                            ) : (
                                <View style={[styles.statusPill, { backgroundColor: COLORS.danger + '12', paddingHorizontal: 6, height: 18 }]}>
                                    <Text style={[styles.statusPillText, { color: COLORS.danger, fontSize: 9 }]}>DELETED</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.detailRow}>
                            <Feather name="home" size={12} color={COLORS.textMuted} />
                            <Text style={styles.detailText}>
                                {tenant?.pgs?.name || pgs.find(p => p.id === item.pg_id)?.name || item.pg_name || "Deleted PG"}
                                {(tenant?.rooms?.room_number || item.room_number || item.room_name) ? ` • Room ${tenant?.rooms?.room_number || item.room_number || item.room_name}` : ''}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderLedgerItem = ({ item }: { item: any }) => {
        const tenant = item.tenants || tenantsMap[item.tenant_id];
        return (
            <View style={styles.groupContainer}>
                <View style={styles.paymentCard}>
                    <View style={styles.paymentCardHeader}>
                        <View style={styles.cardHeaderLeft}>
                            <Text style={styles.residentName} numberOfLines={1}>{item.description || "Ledger Entry"}</Text>
                            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{formatDate(item.created_at)}</Text>
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
                            {tenant?.full_name || item.tenant_name ? (
                                <Text style={styles.detailText}>{tenant?.full_name || item.tenant_name}</Text>
                            ) : (
                                <View style={[styles.statusPill, { backgroundColor: COLORS.danger + '12', paddingHorizontal: 6, height: 18 }]}>
                                    <Text style={[styles.statusPillText, { color: COLORS.danger, fontSize: 9 }]}>DELETED</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderDueItem = ({ item: group }: { item: any }) => {
        const isExpanded = expandedGroups.includes(group.tenantId);
        const hasMultiple = group.items.length > 1;
        const accentColor = group.hasOverdue ? COLORS.danger : COLORS.warning;

        return (
            <View style={styles.groupContainer}>
                <TouchableOpacity
                    style={[styles.paymentCard, { borderLeftColor: accentColor, borderLeftWidth: 3 }]}
                    activeOpacity={0.7}
                    onPress={() => {
                        if (hasMultiple) {
                            setExpandedGroups(prev =>
                                prev.includes(group.tenantId)
                                    ? prev.filter(id => id !== group.tenantId)
                                    : [...prev, group.tenantId]
                            );
                        } else {
                            setEditingPayment(null);
                            setInitialTenantId(group.tenantId);
                            setModalVisible(true);
                        }
                    }}
                >
                    <View style={styles.paymentCardHeader}>
                        <View style={styles.cardHeaderLeft}>
                            <Text style={styles.residentName} numberOfLines={1}>{group.tenantName}</Text>
                            <View style={[styles.statusPill, { backgroundColor: accentColor + "12" }]}>
                                <Text style={[styles.statusPillText, { color: accentColor }]}>
                                    {group.hasOverdue ? "OVERDUE" : "PENDING"}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.cardHeaderRight}>
                            <Text style={[styles.paymentAmount, { color: accentColor }]}>
                                ₹{Number(group.totalDue).toLocaleString()}
                            </Text>
                            {hasMultiple && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '700' }}>
                                        {group.items.length} INVOICES
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
                            <Text style={styles.detailText}>
                                {group.pgName}{(group.tenant?.rooms?.room_number || group.items[0].room_number || group.items[0].room_name) ? ` • Room ${group.tenant?.rooms?.room_number || group.items[0].room_number || group.items[0].room_name}` : ''}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.payButton, { backgroundColor: accentColor, marginTop: 12 }]}
                        onPress={() => {
                            setEditingPayment(null);
                            setInitialTenantId(group.tenantId);
                            setModalVisible(true);
                        }}
                    >
                        <MaterialCommunityIcons name="currency-inr" size={16} color="#fff" />
                        <Text style={styles.payButtonText}>Collect Payment</Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {isExpanded && group.items.map((inv: any, idx: number) => {
                    const statusColor = getDueStatus(inv) === "overdue" ? COLORS.danger : COLORS.warning;
                    const balanceDue = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
                    return (
                        <View key={inv.id || idx} style={[styles.nestedItem, { borderLeftColor: COLORS.border, marginLeft: 20, marginTop: 4 }]}>
                            <View style={styles.nestedIndicator} />
                            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>{getInvoiceLabel(inv)}</Text>
                                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                                        Due {formatDate(inv.billing_period_end)}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 14, fontWeight: '800', color: statusColor }}>
                                        ₹{balanceDue.toLocaleString()}
                                    </Text>
                                    <View style={[styles.statusPill, { backgroundColor: statusColor + "12", marginTop: 4 }]}>
                                        <Text style={[styles.statusPillText, { color: statusColor, fontSize: 8 }]}>
                                            {getDueStatus(inv).toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader
                title="Financial Records"
                onLeftPress={() => navigation.openDrawer()}
                rightElement={
                    <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                        <Feather name="refresh-cw" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                }
            />

            <FlatList
                data={activeView === "transactions" ? groupedPayments : activeView === "invoices" ? filteredInvoices : activeView === "ledger" ? filteredLedger : groupedDues}
                keyExtractor={item => item.id || item.tenantId}
                renderItem={({ item }) => {
                    if (activeView === "transactions") return renderPaymentItem({ item });
                    if (activeView === "invoices") return renderInvoiceItem({ item });
                    if (activeView === "ledger") return renderLedgerItem({ item });
                    return renderDueItem({ item });
                }}
                ListHeaderComponent={
                    <View>
                        <SummarySection />

                        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                            <SegmentedControl
                                options={[
                                    { label: "Transactions", value: "transactions" },
                                    { label: "Invoices", value: "invoices" },
                                    { label: "Ledger", value: "ledger" },
                                    { label: "Dues", value: "dues" },
                                ]}
                                value={activeView}
                                onChange={setActiveView}
                            />
                        </View>

                        {activeView === "dues" && (
                            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                                <SegmentedControl
                                    options={[
                                        { label: "All Dues", value: "all" },
                                        { label: "Overdue", value: "overdue" },
                                        { label: "Upcoming", value: "upcoming" },
                                    ]}
                                    value={activeDueSegment}
                                    onChange={setActiveDueSegment}
                                />
                            </View>
                        )}

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
                                    <View>
                                        <Feather
                                            name="sliders"
                                            size={18}
                                            color={filters.propertyId !== "ALL" || filters.status !== "" ? COLORS.primary : COLORS.textMuted}
                                        />
                                        {((filters.propertyId !== "ALL" ? 1 : 0) + (filters.status !== "" ? 1 : 0) + (filters.tenantStatus !== "ACTIVE" ? 1 : 0)) > 0 && (
                                            <View style={styles.filterBadge}>
                                                <Text style={styles.filterBadgeText}>
                                                    {(filters.propertyId !== "ALL" ? 1 : 0) + (filters.status !== "" ? 1 : 0) + (filters.tenantStatus !== "ACTIVE" ? 1 : 0)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
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
                            <Text style={styles.emptyText}>No records found</Text>
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
                        ...pgs.map(pg => ({ label: pg.archived ? `${pg.name} (Archived)` : pg.name, value: pg.id }))
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
                <DropdownSelector
                    label="Resident Status"
                    options={TENANT_STATUS_OPTIONS.map(stat => ({
                        label: stat === "ALL" ? "All Residents" : stat.charAt(0) + stat.slice(1).toLowerCase(),
                        value: stat
                    }))}
                    value={pendingFilters.tenantStatus}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, tenantStatus: value }))}
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
        appBarButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

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
        rateInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
        rateTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
        ratePercent: { fontSize: 13, fontWeight: '900' },
        progressBg: { height: 10, backgroundColor: COLORS.bg, borderRadius: 5, overflow: 'hidden' },
        progressFill: { height: '100%', borderRadius: 5 },

        // Status Status Section
        statusRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
        statusCard: {
            flex: 1,
            backgroundColor: COLORS.card,
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        statusDot: { width: 6, height: 6, borderRadius: 3 },
        statusLabel: { fontSize: 8, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
        statusValue: { fontSize: 16, fontWeight: '900', marginTop: 1 },

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
        filterBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.danger, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.card, paddingHorizontal: 4 },
        filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

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
