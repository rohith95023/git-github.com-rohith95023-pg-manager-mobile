import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import useThemePalette from "../hooks/useThemePalette";
import { financialAPI, invoiceAPI, pgAPI, tenantAPI } from "../services/api";

const { width } = Dimensions.get("window");

const SEGMENTS = [
    { label: "All Dues", value: "all" },
    { label: "Overdue", value: "overdue" },
    { label: "Upcoming", value: "upcoming" },
];

const getInvoiceTypeLabel = (inv: any) => {
    switch ((inv.type || "").toUpperCase()) {
        case "RENT": {
            const d = inv.billing_period_start ? new Date(inv.billing_period_start) : null;
            return d ? `Rent – ${d.toLocaleDateString([], { month: "short", year: "numeric" })}` : "Rent";
        }
        case "DEPOSIT":
            return "Security Deposit";
        case "OPENING_BALANCE":
            return "Opening Balance";
        case "MAINTENANCE":
            return "Maintenance Fee";
        default:
            return inv.type || "Invoice";
    }
};

const getDueStatus = (inv: any): "overdue" | "upcoming" | "due_today" => {
    const end = inv.billing_period_end ? new Date(inv.billing_period_end) : null;
    if (!end) return "upcoming";
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end < now) return "overdue";
    if (end.getTime() === now.getTime()) return "due_today";
    return "upcoming";
};

const DuesScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const isFocused = useIsFocused();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    // Data
    const [groupedLedger, setGroupedLedger] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // UI State
    const [activeSegment, setActiveSegment] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [filterSheetVisible, setFilterSheetVisible] = useState(false);
    const [selectedPgId, setSelectedPgId] = useState("ALL");
    const [pendingPgId, setPendingPgId] = useState("ALL");

    // Payment modal
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentTenantId, setPaymentTenantId] = useState<string | undefined>(undefined);

    // Summary animation
    const progressAnim = useRef(new Animated.Value(0)).current;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [ledgerRes, invoicesRes, pgsRes, tenantsRes]: any[] = await Promise.all([
                financialAPI.getGroupedLedger().catch(() => []),
                invoiceAPI.getAll().catch(() => []),
                pgAPI.getAll().catch(() => []),
                tenantAPI.getAll().catch(() => []),
            ]);

            const ledgerArr = Array.isArray(ledgerRes) ? ledgerRes : (ledgerRes?.items || ledgerRes?.data || []);
            const invoicesArr = Array.isArray(invoicesRes) ? invoicesRes
                : (invoicesRes?.items || invoicesRes?.data || []);
            const pgsArr = Array.isArray(pgsRes) ? pgsRes : (pgsRes?.items || pgsRes?.data || []);
            const tenantsArr = Array.isArray(tenantsRes) ? tenantsRes
                : (tenantsRes?.items || tenantsRes?.data || []);

            setGroupedLedger(ledgerArr);
            setInvoices(invoicesArr);
            setPgs(pgsArr);
            setTenants(tenantsArr);
        } catch (err) {
            console.error("DuesScreen fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isFocused) fetchData();
    }, [isFocused, fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Build lookup maps from fetched data
    const tenantMap = useMemo(() => {
        const m: Record<string, any> = {};
        tenants.forEach((t: any) => { m[t.id] = t; });
        return m;
    }, [tenants]);

    const pgMap = useMemo(() => {
        const m: Record<string, any> = {};
        pgs.forEach((pg: any) => { m[pg.id] = pg; });
        return m;
    }, [pgs]);

    // Build tenant-grouped due items from invoices (unpaid/partial only)
    const dueInvoices = useMemo(() => {
        return invoices.filter((inv: any) =>
            inv.status === "UNPAID" || inv.status === "PARTIAL" || inv.status === "unpaid" || inv.status === "partial"
        );
    }, [invoices]);

    // Summary stats
    const summaryStats = useMemo(() => {
        const totalDue = dueInvoices.reduce((sum: number, inv: any) =>
            sum + (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0);
        const overdueCount = dueInvoices.filter(inv => getDueStatus(inv) === "overdue").length;
        const upcomingCount = dueInvoices.filter(inv => getDueStatus(inv) === "upcoming").length;
        return { totalDue, overdueCount, upcomingCount, totalCount: dueInvoices.length };
    }, [dueInvoices]);

    // Animate progress
    useEffect(() => {
        const totalInvoices = invoices.length;
        const paidInvoices = invoices.filter((i: any) => i.status === "PAID").length;
        const rate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;
        Animated.timing(progressAnim, {
            toValue: rate,
            duration: 900,
            useNativeDriver: false,
        }).start();
    }, [invoices]);

    // Group filtered invoices by tenant
    const grouped = useMemo(() => {
        let filtered = dueInvoices;

        // segment filter
        if (activeSegment === "overdue") {
            filtered = filtered.filter(inv => getDueStatus(inv) === "overdue");
        } else if (activeSegment === "upcoming") {
            filtered = filtered.filter(inv => getDueStatus(inv) === "upcoming" || getDueStatus(inv) === "due_today");
        }

        // pg filter
        if (selectedPgId !== "ALL") {
            filtered = filtered.filter((inv: any) => inv.pg_id === selectedPgId);
        }

        // search
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter((inv: any) => {
                const t = inv.tenants || tenantMap[inv.tenant_id] || {};
                const pg = inv.pgs || pgMap[inv.pg_id] || {};
                return (
                    (t.full_name || "").toLowerCase().includes(lower) ||
                    (inv.tenant_name || "").toLowerCase().includes(lower) ||
                    (pg.name || inv.pg_name || "").toLowerCase().includes(lower)
                );
            });
        }

        // group by tenant_id
        const groups: Record<string, any> = {};
        filtered.forEach((inv: any) => {
            const tId = inv.tenant_id || "unknown";
            const tenant = inv.tenants || tenantMap[tId] || null;
            const pg = inv.pgs || pgMap[inv.pg_id] || null;
            if (!groups[tId]) {
                groups[tId] = {
                    tenantId: tId,
                    tenantName: tenant?.full_name || inv.tenant_name || "Unknown Resident",
                    pgName: pg?.name || inv.pg_name || "—",
                    roomNumber: tenant?.rooms?.room_number || inv.room_number || "—",
                    items: [],
                };
            }
            groups[tId].items.push(inv);
        });

        return Object.values(groups).map((g: any) => ({
            ...g,
            totalDue: g.items.reduce((sum: number, inv: any) =>
                sum + (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0),
            hasOverdue: g.items.some((inv: any) => getDueStatus(inv) === "overdue"),
        })).sort((a: any, b: any) => {
            if (a.hasOverdue && !b.hasOverdue) return -1;
            if (!a.hasOverdue && b.hasOverdue) return 1;
            return b.totalDue - a.totalDue;
        });
    }, [dueInvoices, activeSegment, selectedPgId, searchTerm]);

    const toggleGroup = (tenantId: string) => {
        setExpandedGroups(prev =>
            prev.includes(tenantId)
                ? prev.filter(id => id !== tenantId)
                : [...prev, tenantId]
        );
    };

    const handleCollect = (tenantId: string) => {
        setPaymentTenantId(tenantId);
        setPaymentModalVisible(true);
    };

    const SummaryHeader = () => (
        <View style={styles.summaryWrap}>
            {/* Dominant metric */}
            <View style={styles.mainDueCard}>
                <View>
                    <Text style={styles.mainDueLabel}>TOTAL OUTSTANDING</Text>
                    <Text style={styles.mainDueValue}>₹{summaryStats.totalDue.toLocaleString()}</Text>
                    <Text style={styles.mainDueSub}>{summaryStats.totalCount} invoice{summaryStats.totalCount !== 1 ? "s" : ""} pending</Text>
                </View>
                <View style={[styles.mainDueIcon, { backgroundColor: COLORS.danger + "15" }]}>
                    <MaterialCommunityIcons name="clock-alert-outline" size={28} color={COLORS.danger} />
                </View>
            </View>

            {/* Stat row */}
            <View style={styles.statRow}>
                <View style={[styles.statPill, { borderColor: COLORS.danger + "40" }]}>
                    <View style={[styles.statDot, { backgroundColor: COLORS.danger }]} />
                    <View>
                        <Text style={styles.statPillLabel}>OVERDUE</Text>
                        <Text style={[styles.statPillValue, { color: COLORS.danger }]}>{summaryStats.overdueCount}</Text>
                    </View>
                </View>
                <View style={[styles.statPill, { borderColor: COLORS.warning + "40" }]}>
                    <View style={[styles.statDot, { backgroundColor: COLORS.warning }]} />
                    <View>
                        <Text style={styles.statPillLabel}>UPCOMING</Text>
                        <Text style={[styles.statPillValue, { color: COLORS.warning }]}>{summaryStats.upcomingCount}</Text>
                    </View>
                </View>
                <View style={[styles.statPill, { borderColor: COLORS.success + "40" }]}>
                    <View style={[styles.statDot, { backgroundColor: COLORS.success }]} />
                    <View>
                        <Text style={styles.statPillLabel}>PAID THIS MONTH</Text>
                        <Text style={[styles.statPillValue, { color: COLORS.success }]}>
                            {invoices.filter(i => i.status === "PAID").length}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Collection rate progress */}
            <View style={styles.rateCard}>
                <View style={styles.rateHeader}>
                    <Text style={styles.rateLabel}>COLLECTION RATE</Text>
                    <Animated.Text style={[styles.rateValue, { color: COLORS.success }]}>
                        {invoices.length > 0 ? Math.round((invoices.filter(i => i.status === "PAID").length / invoices.length) * 100) : 0}%
                    </Animated.Text>
                </View>
                <View style={styles.progressBg}>
                    <Animated.View style={[styles.progressFill, {
                        width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
                        backgroundColor: COLORS.success,
                    }]} />
                </View>
            </View>
        </View>
    );

    const renderGroup = ({ item: group }: { item: any }) => {
        const isExpanded = expandedGroups.includes(group.tenantId);
        const hasMultiple = group.items.length > 1;
        const accentColor = group.hasOverdue ? COLORS.danger : COLORS.warning;

        return (
            <View style={styles.groupWrap}>
                <TouchableOpacity
                    style={[styles.groupCard, { borderLeftColor: accentColor, borderLeftWidth: 3 }]}
                    activeOpacity={0.75}
                    onPress={() => hasMultiple && toggleGroup(group.tenantId)}
                >
                    {/* Header */}
                    <View style={styles.groupHeader}>
                        <View style={[styles.groupAvatar, { backgroundColor: accentColor + "15" }]}>
                            <Text style={[styles.groupAvatarText, { color: accentColor }]}>
                                {group.tenantName[0]?.toUpperCase() || "?"}
                            </Text>
                        </View>
                        <View style={styles.groupInfo}>
                            <Text style={styles.groupName} numberOfLines={1}>{group.tenantName}</Text>
                            <Text style={styles.groupSub} numberOfLines={1}>
                                {group.pgName}
                                {group.roomNumber !== "—" ? ` • Room ${group.roomNumber}` : ""}
                            </Text>
                        </View>
                        <View style={styles.groupRight}>
                            <Text style={[styles.groupAmount, { color: accentColor }]}>
                                ₹{Number(group.totalDue).toLocaleString()}
                            </Text>
                            {hasMultiple && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{group.items.length} inv</Text>
                                    <Feather
                                        name={isExpanded ? "chevron-up" : "chevron-down"}
                                        size={12}
                                        color={COLORS.textMuted}
                                    />
                                </View>
                            )}
                            {!hasMultiple && (
                                <Text style={[styles.dueTag, {
                                    color: group.hasOverdue ? COLORS.danger : COLORS.warning,
                                    backgroundColor: (group.hasOverdue ? COLORS.danger : COLORS.warning) + "12",
                                }]}>
                                    {group.hasOverdue ? "OVERDUE" : "DUE"}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Single invoice details */}
                    {!hasMultiple && (
                        <View style={styles.invoiceRow}>
                            <Feather name="file-text" size={12} color={COLORS.textMuted} />
                            <Text style={styles.invoiceLabel}>{getInvoiceTypeLabel(group.items[0])}</Text>
                            {group.items[0].billing_period_end && (
                                <>
                                    <View style={styles.invoiceDot} />
                                    <Feather name="calendar" size={11} color={COLORS.textMuted} />
                                    <Text style={styles.invoiceLabel}>
                                        Due {new Date(group.items[0].billing_period_end).toLocaleDateString([], { month: "short", day: "numeric" })}
                                    </Text>
                                </>
                            )}
                        </View>
                    )}

                    {/* Collect button */}
                    <TouchableOpacity
                        style={[styles.collectBtn, { backgroundColor: accentColor }]}
                        onPress={() => handleCollect(group.tenantId)}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="currency-inr" size={15} color="#fff" />
                        <Text style={styles.collectBtnText}>Collect Payment</Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* Expanded sub-items */}
                {isExpanded && group.items.map((inv: any, idx: number) => {
                    const statusColor = getDueStatus(inv) === "overdue" ? COLORS.danger : COLORS.warning;
                    const balanceDue = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
                    return (
                        <View
                            key={inv.id || idx}
                            style={[styles.subItem, { borderLeftColor: COLORS.border }]}
                        >
                            <View style={styles.subItemInner}>
                                <View style={styles.subItemLeft}>
                                    <Text style={styles.subItemTitle}>{getInvoiceTypeLabel(inv)}</Text>
                                    {inv.billing_period_end && (
                                        <Text style={styles.subItemSub}>
                                            Due {new Date(inv.billing_period_end).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.subItemRight}>
                                    <Text style={[styles.subItemAmount, { color: statusColor }]}>
                                        ₹{balanceDue.toLocaleString()}
                                    </Text>
                                    <Text style={[styles.subItemStatus, {
                                        color: statusColor,
                                        backgroundColor: statusColor + "12",
                                    }]}>
                                        {getDueStatus(inv) === "overdue" ? "OVERDUE" : "DUE"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    const ListHeader = () => (
        <View>
            <SummaryHeader />

            {/* Segmented control */}
            <View style={styles.segmentWrap}>
                <SegmentedControl
                    options={SEGMENTS}
                    value={activeSegment}
                    onChange={setActiveSegment}
                />
            </View>

            {/* Search + filter */}
            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <Feather name="search" size={16} color={COLORS.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search residents..."
                        placeholderTextColor={COLORS.textMuted}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {searchTerm !== "" && (
                        <TouchableOpacity onPress={() => setSearchTerm("")}>
                            <Feather name="x" size={14} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.filterBtn, selectedPgId !== "ALL" && { backgroundColor: COLORS.primary }]}
                    onPress={() => setFilterSheetVisible(true)}
                >
                    <Feather name="sliders" size={16} color={selectedPgId !== "ALL" ? "#fff" : COLORS.textMuted} />
                </TouchableOpacity>
            </View>

            {/* Count chip */}
            {grouped.length > 0 && (
                <View style={styles.resultChip}>
                    <Text style={styles.resultChipText}>
                        {grouped.length} resident{grouped.length !== 1 ? "s" : ""} with dues
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader
                title="Dues & Collections"
                onLeftPress={() => navigation.openDrawer()}
                rightElement={
                    <TouchableOpacity onPress={onRefresh} style={styles.appBarBtn}>
                        <Feather name="refresh-cw" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                }
            />

            {loading && !refreshing ? (
                <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loaderText}>Loading dues...</Text>
                </View>
            ) : (
                <FlatList
                    data={grouped}
                    keyExtractor={(item) => item.tenantId}
                    renderItem={renderGroup}
                    ListHeaderComponent={<ListHeader />}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <MaterialCommunityIcons name="party-popper" size={64} color={COLORS.success + "60"} />
                            <Text style={styles.emptyTitle}>All clear!</Text>
                            <Text style={styles.emptySub}>
                                {activeSegment === "overdue"
                                    ? "No overdue invoices found."
                                    : activeSegment === "upcoming"
                                        ? "No upcoming dues in this period."
                                        : "No pending dues found."}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Filter Sheet */}
            <FilterBottomSheet
                visible={filterSheetVisible}
                title="Filter Dues"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    setSelectedPgId(pendingPgId);
                    setFilterSheetVisible(false);
                }}
                onReset={() => {
                    setSelectedPgId("ALL");
                    setPendingPgId("ALL");
                    setFilterSheetVisible(false);
                }}
            >
                <DropdownSelector
                    label="Property"
                    options={[
                        { label: "All Properties", value: "ALL" },
                        ...pgs.map((pg: any) => ({ label: pg.name, value: pg.id })),
                    ]}
                    value={pendingPgId}
                    onChange={setPendingPgId}
                />
            </FilterBottomSheet>

            {/* Payment Modal */}
            <PaymentFormModal
                visible={paymentModalVisible}
                onClose={() => { setPaymentModalVisible(false); setPaymentTenantId(undefined); }}
                onSuccess={() => {
                    setPaymentModalVisible(false);
                    setPaymentTenantId(undefined);
                    fetchData();
                }}
                editingPayment={null}
                initialTenantId={paymentTenantId}
            />
        </SafeAreaView>
    );
};

const createStyles = (COLORS: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },

        appBarBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center"
        },

        loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
        loaderText: { fontSize: 14, color: COLORS.textMuted, fontWeight: "600" },

        listContent: { paddingBottom: 100 },

        // Summary
        summaryWrap: { padding: 16, gap: 12 },
        mainDueCard: {
            backgroundColor: COLORS.card,
            borderRadius: 20,
            padding: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderWidth: 1,
            borderColor: COLORS.danger + "25",
            elevation: 3,
        },
        mainDueLabel: { fontSize: 10, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1 },
        mainDueValue: { fontSize: 30, fontWeight: "900", color: COLORS.text, marginTop: 4 },
        mainDueSub: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginTop: 4 },
        mainDueIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },

        statRow: { flexDirection: "row", gap: 10 },
        statPill: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: COLORS.card,
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
        },
        statDot: { width: 8, height: 8, borderRadius: 4 },
        statPillLabel: { fontSize: 8, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 0.5 },
        statPillValue: { fontSize: 16, fontWeight: "900" },

        rateCard: {
            backgroundColor: COLORS.card,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        rateHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
        rateLabel: { fontSize: 10, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1 },
        rateValue: { fontSize: 13, fontWeight: "900" },
        progressBg: { height: 8, backgroundColor: COLORS.bg, borderRadius: 4, overflow: "hidden" },
        progressFill: { height: "100%", borderRadius: 4 },

        // Segment
        segmentWrap: { paddingHorizontal: 16, marginBottom: 8 },

        // Search
        searchRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 8 },
        searchBox: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderRadius: 12,
            paddingHorizontal: 14,
            height: 44,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 10,
        },
        searchInput: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.text },
        filterBtn: {
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            justifyContent: "center",
            alignItems: "center",
        },

        resultChip: {
            marginHorizontal: 16,
            marginBottom: 12,
            alignSelf: "flex-start",
            backgroundColor: COLORS.primary + "10",
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 20,
        },
        resultChipText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },

        // Group cards
        groupWrap: { marginHorizontal: 16, marginBottom: 14 },
        groupCard: {
            backgroundColor: COLORS.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 2,
        },
        groupHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
        groupAvatar: {
            width: 40,
            height: 40,
            borderRadius: 12,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
        },
        groupAvatarText: { fontSize: 16, fontWeight: "900" },
        groupInfo: { flex: 1 },
        groupName: { fontSize: 15, fontWeight: "800", color: COLORS.text },
        groupSub: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginTop: 2 },
        groupRight: { alignItems: "flex-end", gap: 4 },
        groupAmount: { fontSize: 18, fontWeight: "900" },
        countBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
        countBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.textMuted },
        dueTag: {
            fontSize: 8,
            fontWeight: "900",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
        },

        invoiceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
        invoiceLabel: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
        invoiceDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted },

        collectBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            height: 40,
            borderRadius: 12,
        },
        collectBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

        // Expanded sub-items
        subItem: {
            borderLeftWidth: 2,
            marginLeft: 20,
            marginTop: 4,
        },
        subItemInner: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: COLORS.card,
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginLeft: 10,
        },
        subItemLeft: { flex: 1 },
        subItemTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text },
        subItemSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
        subItemRight: { alignItems: "flex-end", gap: 4 },
        subItemAmount: { fontSize: 14, fontWeight: "900" },
        subItemStatus: {
            fontSize: 8,
            fontWeight: "900",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
        },

        // Empty state
        emptyWrap: { alignItems: "center", paddingVertical: 60 },
        emptyTitle: { fontSize: 20, fontWeight: "900", color: COLORS.text, marginTop: 16 },
        emptySub: { fontSize: 13, color: COLORS.textMuted, marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
    });

export default DuesScreen;
