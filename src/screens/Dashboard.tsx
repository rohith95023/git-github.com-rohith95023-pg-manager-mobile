import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ThemeToggleButton from "../components/ThemeToggleButton";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import useThemePalette from "../hooks/useThemePalette";
import { statsAPI } from "../services/api";
import ExportService from "../services/ExportService";

const { width } = Dimensions.get("window");

const Dashboard = ({ navigation, route }: any) => {
    const { user } = useAuth();
    const isFocused = useIsFocused();
    const COLORS = useThemePalette();
    const { dashboardStats, dashboardKpis, tenants, payments, invoices, refresh, loading, refreshing } = useData();

    const stats = dashboardStats;
    const kpis = dashboardKpis;
    const recentPayments = stats?.recentPayments || payments.slice(0, 5);
    const dailyTenants = tenants.filter((t: any) => t.stay_type === 'DAILY').slice(0, 5);

    // Build tenant lookup map for name resolution
    const tenantMap = useMemo(() => {
        const m: Record<string, any> = {};
        tenants.forEach((t: any) => { m[t.id] = t; });
        return m;
    }, [tenants]);

    const [exportRefreshing, setExportRefreshing] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    const handleExport = async () => {
        try {
            setExportRefreshing(true);
            await ExportService.exportToExcel();
            Alert.alert("Success", "System data exported successfully!");
        } catch (error) {
            Alert.alert("Error", "Failed to export data");
        } finally {
            setExportRefreshing(false);
        }
    };

    // Build grouped dues from real invoices in context (unpaid/partial)
    const groupedInvoices = useMemo(() => {
        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Get unpaid/partial invoices due within 7 days or overdue
        const dueInvoices = invoices.filter((inv: any) => {
            const status = (inv.status || '').toUpperCase();
            if (status !== 'UNPAID' && status !== 'PARTIAL') return false;
            const balance = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
            if (balance <= 0) return false;
            // Show overdue + upcoming 7 days
            const dueDate = inv.billing_period_end ? new Date(inv.billing_period_end) : null;
            if (!dueDate) return true;
            return dueDate <= sevenDaysLater;
        });

        const groups: Record<string, any> = {};
        dueInvoices.forEach((inv: any) => {
            const tId = inv.tenant_id;
            if (!groups[tId]) groups[tId] = [];
            groups[tId].push(inv);
        });
        return Object.entries(groups).map(([tenantId, items]) => {
            // Resolve tenant: try nested tenants obj first, then context map
            const tenant = (items[0] as any).tenants || tenantMap[tenantId] || null;
            return {
                tenantId,
                tenant,
                totalDue: (items as any[]).reduce((sum: number, inv: any) =>
                    sum + (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0),
                items,
            };
        }).filter((g: any) => g.tenant && g.totalDue > 0);
    }, [invoices, tenantMap]);

    const getInvoiceLabel = (inv: any) => {
        switch (inv.type?.toUpperCase()) {
            case 'RENT':
                const date = new Date(inv.billing_period_start);
                return `Rent – ${date.toLocaleDateString([], { month: 'short', year: 'numeric' })}`;
            case 'DEPOSIT':
                return "Security Deposit";
            case 'OPENING_BALANCE':
                return "Opening Balance";
            default:
                return "Invoice";
        }
    };

    const onRefresh = () => refresh();


    return (
        <SafeAreaView style={styles.container}>
            {/* Top App Bar */}
            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.appBarButton}>
                    <Feather name="menu" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Overview</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={handleExport} style={[styles.appBarButton, { marginRight: 8 }]}>
                        <Feather name="download" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                    <ThemeToggleButton style={{ marginRight: 12 }} />
                    <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.appBarButton}>
                        <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Modernized Welcome Section */}
                <View style={[styles.welcomeCard, { paddingBottom: 16 }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.welcomeTitle}>Hello{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : '!'}</Text>
                        <Text style={styles.dateLabel}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>

                        <TouchableOpacity
                            style={styles.generateBtn}
                            onPress={async () => {
                                if (!user?.id) return;
                                try {
                                    await statsAPI.generateMonthlyInvoices();
                                    Alert.alert("Success", "Monthly invoices generated successfully!");
                                    refresh();
                                } catch (err: any) {
                                    Alert.alert("Error", err.message || "Failed to generate invoices.");
                                }
                            }}
                        >
                            <Feather name="file-text" size={14} color="#fff" />
                            <Text style={styles.generateBtnText}>Generate Invoices</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.mainKPIBox}>
                        <Text style={styles.mainKPIValue}>{stats?.occupancyRate || 0}%</Text>
                        <Text style={styles.mainKPILabel}>Occupancy</Text>
                    </View>
                </View>

                {/* Performance Highlights Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <View style={[styles.iconPill, { backgroundColor: COLORS.primary + "15" }]}>
                            <Feather name="home" size={14} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statValue}>{stats?.totalPGs || kpis?.totalPgs || 0}</Text>
                        <Text style={styles.statLabel}>Properties</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconPill, { backgroundColor: COLORS.success + "15" }]}>
                            <Feather name="box" size={14} color={COLORS.success} />
                        </View>
                        <Text style={styles.statValue}>{stats?.activeRooms || kpis?.activeRooms || 0}</Text>
                        <Text style={styles.statLabel}>Rooms</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconPill, { backgroundColor: COLORS.warning + "15" }]}>
                            <Feather name="users" size={14} color={COLORS.warning} />
                        </View>
                        <Text style={styles.statValue}>{stats?.totalTenants || kpis?.totalTenants || 0}</Text>
                        <Text style={styles.statLabel}>Residents</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconPill, { backgroundColor: COLORS.danger + "15" }]}>
                            <MaterialCommunityIcons name="bed-outline" size={14} color={COLORS.danger} />
                        </View>
                        <Text style={styles.statValue}>{kpis?.availableBeds || 0}</Text>
                        <Text style={styles.statLabel}>Free Beds</Text>
                    </View>
                </View>

                {/* Today's Activity Summary (New) */}
                <View style={styles.activityRow}>
                    <View style={styles.activityItem}>
                        <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                        <Text style={styles.activityText}><Text style={styles.bold}>{stats?.todayActivity?.payments || 0}</Text> Payments</Text>
                    </View>
                    <View style={styles.activityItem}>
                        <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                        <Text style={styles.activityText}><Text style={styles.bold}>{stats?.todayActivity?.newTenants || 0}</Text> New</Text>
                    </View>
                    <View style={styles.activityItem}>
                        <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
                        <Text style={styles.activityText}><Text style={styles.bold}>{stats?.todayActivity?.expenses || 0}</Text> Expenses</Text>
                    </View>
                </View>

                {/* Financial Overview Card */}
                <View style={styles.financialSummary}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>Financials</Text>
                        <View style={styles.creditBadge}>
                            <Text style={styles.creditValue}>Credits: ₹{(stats?.totalCredits || 0).toLocaleString()}</Text>
                        </View>
                    </View>

                    {/* 2×2 metrics grid */}
                    <View style={styles.financeGrid}>
                        <View style={[styles.financeItem, { borderRightWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border }]}>
                            <Text style={styles.financeLabel}>Revenue</Text>
                            <Text style={[styles.financeValue, { color: COLORS.success }]}>₹{(stats?.monthlyRevenue || 0).toLocaleString()}</Text>
                            <Text style={styles.financeSubLabel}>This month</Text>
                        </View>
                        <View style={[styles.financeItem, { borderBottomWidth: 1, borderColor: COLORS.border }]}>
                            <Text style={styles.financeLabel}>Due</Text>
                            <Text style={[styles.financeValue, { color: COLORS.danger }]}>₹{(stats?.totalPendingDues || stats?.total_pending || kpis?.total_pending || 0).toLocaleString()}</Text>
                            <Text style={styles.financeSubLabel}>Outstanding</Text>
                        </View>
                        <View style={[styles.financeItem, { borderRightWidth: 1, borderColor: COLORS.border }]}>
                            <Text style={styles.financeLabel}>Net Profit</Text>
                            <Text style={[styles.financeValue, { color: COLORS.primary }]}>₹{(stats?.netProfit || 0).toLocaleString()}</Text>
                            <Text style={styles.financeSubLabel}>Monthly</Text>
                        </View>
                        <View style={styles.financeItem}>
                            <Text style={styles.financeLabel}>All-time</Text>
                            <Text style={[styles.financeValue, { color: COLORS.textMuted }]}>₹{(stats?.totalRevenue || kpis?.allTimeRevenue || 0).toLocaleString()}</Text>
                            <Text style={styles.financeSubLabel}>Total earned</Text>
                        </View>
                    </View>

                    {/* Analysis button */}
                    <TouchableOpacity
                        style={styles.detailsBtn}
                        onPress={() => navigation.navigate("ProfitLoss")}
                    >
                        <Feather name="bar-chart-2" size={14} color={COLORS.primary} />
                        <Text style={styles.detailsBtnText}>View Full Analysis</Text>
                        <Feather name="arrow-right" size={13} color={COLORS.primary} />
                    </TouchableOpacity>

                    {/* Monthly Collection Progress Bar */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Monthly Collection</Text>
                            <Text style={styles.progressValue}>{stats?.collectionRatePercentage || 0}%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${stats?.collectionRatePercentage || 0}%`, backgroundColor: COLORS.success }]} />
                        </View>
                    </View>
                </View>

                {/* Daily Stay Alerts (Simplified) */}
                {dailyTenants.length > 0 && (
                    <View style={styles.listSection}>
                        <View style={styles.listHeader}>
                            <Text style={styles.sectionTitle}>Daily Residents</Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Residents")}>
                                <Text style={styles.seeAllText}>See all</Text>
                            </TouchableOpacity>
                        </View>
                        {dailyTenants.map((t: any) => (
                            <TouchableOpacity
                                key={t.id}
                                style={styles.summaryItem}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate("ResidentDetail", { tenant: t })}
                            >
                                <View style={[styles.avatarMini, { backgroundColor: COLORS.warning + "20" }]}>
                                    <Text style={[styles.avatarText, { color: COLORS.warning }]}>{t.full_name[0]}</Text>
                                </View>
                                <View style={styles.itemMain}>
                                    <Text style={styles.itemTitle}>{t.full_name}</Text>
                                    <Text style={styles.itemSub}>{t.pgs?.name} • Room {t.rooms?.room_number}</Text>
                                </View>
                                <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Upcoming Dues (Grouped) */}
                {groupedInvoices.length > 0 && (
                    <View style={styles.listSection}>
                        <View style={styles.listHeader}>
                            <Text style={styles.sectionTitle}>Upcoming Dues (Next 7d)</Text>
                            <Feather name="bell" size={14} color={COLORS.danger} />
                        </View>
                        {groupedInvoices.map((group: any) => {
                            const isExpanded = expandedGroups.includes(group.tenantId);
                            const hasMultiple = group.items.length > 1;

                            return (
                                <View key={group.tenantId} style={styles.groupContainer}>
                                    <TouchableOpacity
                                        style={styles.summaryItem}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            if (hasMultiple) {
                                                setExpandedGroups(prev =>
                                                    prev.includes(group.tenantId)
                                                        ? prev.filter(id => id !== group.tenantId)
                                                        : [...prev, group.tenantId]
                                                );
                                            } else {
                                                navigation.navigate("ResidentDetail", { tenant: group.tenant });
                                            }
                                        }}
                                    >
                                        <View style={[styles.avatarMini, { backgroundColor: COLORS.danger + "10" }]}>
                                            <MaterialCommunityIcons
                                                name={hasMultiple ? (isExpanded ? "chevron-down" : "chevron-right") : "calendar-clock"}
                                                size={16}
                                                color={COLORS.danger}
                                            />
                                        </View>
                                        <View style={styles.itemMain}>
                                            <Text style={styles.itemTitle}>{group.tenant?.full_name}</Text>
                                            <Text style={styles.itemSub}>
                                                {hasMultiple ? `${group.items.length} Invoices • ` : `${getInvoiceLabel(group.items[0])} • `}
                                                Due {new Date(group.items[0].billing_period_end).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.itemPrice, { color: COLORS.danger }]}>₹{group.totalDue.toLocaleString()}</Text>
                                            {hasMultiple && !isExpanded && (
                                                <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '700' }}>VIEW ALL</Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>

                                    {isExpanded && group.items.map((inv: any) => (
                                        <TouchableOpacity
                                            key={inv.id}
                                            style={[styles.summaryItem, styles.nestedItem, { backgroundColor: COLORS.bg + '50' }]}
                                            onPress={() => navigation.navigate("ResidentDetail", { tenant: group.tenant })}
                                        >
                                            <View style={styles.nestedIndicator} />
                                            <View style={styles.itemMain}>
                                                <Text style={[styles.itemTitle, { fontSize: 13, color: COLORS.text }]}>
                                                    {getInvoiceLabel(inv)}
                                                </Text>
                                                <Text style={styles.itemSub}>
                                                    Due {new Date(inv.billing_period_end).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </Text>
                                            </View>
                                            <Text style={[styles.itemPrice, { fontSize: 13, color: COLORS.danger }]}>
                                                ₹{Number((Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0)).toLocaleString()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Recent Payments (Modern density) */}
                <View style={styles.listSection}>
                    <View style={styles.listHeader}>
                        <Text style={styles.sectionTitle}>Recent Payments</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Finance")}>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    {recentPayments.map((p: any) => {
                        const getDescriptiveType = () => {
                            if (p.type?.toUpperCase() === 'RENT' && p.billing_month) {
                                const date = new Date(p.billing_month);
                                return `Rent – ${date.toLocaleDateString([], { month: 'short', year: 'numeric' })}`;
                            }
                            return p.type || "Payment";
                        };

                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={styles.summaryItem}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate("Finance", { payment: p })}
                            >
                                <View style={[styles.avatarMini, { backgroundColor: COLORS.success + "20" }]}>
                                    <Feather name="check" size={12} color={COLORS.success} />
                                </View>
                                <View style={styles.itemMain}>
                                    <Text style={styles.itemTitle} numberOfLines={1}>
                                        {p.tenants?.full_name || p.tenant?.full_name || "Unknown Resident"}
                                    </Text>
                                    <Text style={styles.itemSub}>{getDescriptiveType()} • {p.payment_method}</Text>
                                </View>
                                <Text style={styles.itemPrice}>+₹{Number(p.amount || 0).toLocaleString()}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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

        scrollContent: { padding: 16 },

        // Welcome Card
        welcomeCard: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 24,
            backgroundColor: COLORS.primary,
            borderRadius: 24,
            marginBottom: 20,
        },
        welcomeTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
        dateLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '600' },
        mainKPIBox: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
        mainKPIValue: { fontSize: 18, fontWeight: '900', color: '#fff' },
        mainKPILabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginTop: 2 },
        generateBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255,255,255,0.15)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            marginTop: 12,
            alignSelf: 'flex-start'
        },
        generateBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

        // Quick Stats
        statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
        statBox: {
            width: (width - 44) / 2,
            backgroundColor: COLORS.card,
            padding: 16,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        iconPill: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
        statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
        statLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },

        // Financials
        financialSummary: {
            backgroundColor: COLORS.card,
            padding: 20,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 24,
        },
        sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 0 },
        financeGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 14,
        },
        financeItem: {
            width: '50%',
            paddingVertical: 16,
            paddingHorizontal: 18,
        },
        financeLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
        financeValue: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginTop: 6 },
        financeSubLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 3 },
        detailsBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: COLORS.primary + '12',
            paddingVertical: 12,
            borderRadius: 14,
        },
        detailsBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

        // List Sections
        listSection: { marginBottom: 24 },
        listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
        seeAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
        summaryItem: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.card,
            padding: 12,
            borderRadius: 16,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        avatarMini: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        avatarText: { fontSize: 14, fontWeight: '900' },
        itemMain: { flex: 1 },
        itemTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
        itemSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
        itemPrice: { fontSize: 14, fontWeight: '800', color: COLORS.success },

        // Enhanced Dashboard Styles
        activityRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 24,
            paddingHorizontal: 4
        },
        activityItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
        },
        dot: {
            width: 6,
            height: 6,
            borderRadius: 3
        },
        activityText: {
            fontSize: 11,
            color: COLORS.textMuted,
            fontWeight: '600'
        },
        bold: {
            color: COLORS.text,
            fontWeight: '800'
        },
        creditBadge: {
            backgroundColor: COLORS.success + '10',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8
        },
        creditValue: {
            fontSize: 10,
            fontWeight: '800',
            color: COLORS.success
        },
        progressSection: {
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: COLORS.border + '30'
        },
        progressHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
        },
        progressLabel: {
            fontSize: 11,
            fontWeight: '700',
            color: COLORS.textMuted
        },
        progressValue: {
            fontSize: 12,
            fontWeight: '800',
            color: COLORS.text
        },
        progressBarBg: {
            height: 6,
            backgroundColor: COLORS.bg,
            borderRadius: 3,
            overflow: 'hidden'
        },
        progressBarFill: {
            height: '100%',
            borderRadius: 3
        },
        groupContainer: {
            marginBottom: 4,
        },
        nestedItem: {
            height: 54,
            marginLeft: 10,
            paddingLeft: 40,
            borderBottomWidth: 0,
            borderLeftWidth: 2,
            borderLeftColor: COLORS.border + '30',
        },
        nestedIndicator: {
            position: 'absolute',
            left: -2,
            top: '50%',
            width: 12,
            height: 2,
            backgroundColor: COLORS.border + '30',
        }
    });

export default Dashboard;
