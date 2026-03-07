import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useThemePalette from "../hooks/useThemePalette";
import { billingService } from "../services/billing.service";

const { width } = Dimensions.get("window");

const ResidentDetailScreen = ({ route, navigation }: any) => {
    const { tenant } = route.params;
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    // Billing Engine V2 State
    const [outstandingBalance, setOutstandingBalance] = React.useState<number | null>(null);
    const [tenantCredit, setTenantCredit] = React.useState<number>(0);
    const [invoices, setInvoices] = React.useState<any[]>([]);
    const [loadingBilling, setLoadingBilling] = React.useState(false);

    React.useEffect(() => {
        loadBillingData();
    }, [tenant.id]);

    const loadBillingData = async () => {
        setLoadingBilling(true);
        try {
            const [balance, creditRes, invoicesRes]: any = await Promise.all([
                billingService.getOutstandingBalance(tenant.id),
                billingService.getCredits(tenant.id),
                billingService.getInvoices(tenant.id)
            ]);

            setOutstandingBalance(balance);
            setTenantCredit(creditRes?.amount || 0);
            setInvoices(invoicesRes || []);
        } catch (err) {
            console.error("Failed to load billing data:", err);
        } finally {
            setLoadingBilling(false);
        }
    };

    const getInvoiceStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PAID': return COLORS.success;
            case 'PARTIAL': return COLORS.warning;
            case 'UNPAID': return COLORS.danger;
            default: return COLORS.textMuted;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE': return COLORS.success;
            case 'UPCOMING': return COLORS.primary;
            case 'OVERDUE': return COLORS.danger;
            case 'INACTIVE': return COLORS.textMuted;
            case 'NOTICE': return COLORS.warning;
            default: return COLORS.textMuted;
        }
    };

    const initials = (tenant.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    const DetailCard = ({ title, icon, color = COLORS.primary, children }: any) => (
        <View style={styles.detailCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
                    <Feather name={icon} size={18} color={color} />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardContent}>
                {children}
            </View>
        </View>
    );

    const InfoRow = ({ label, value, icon, color = COLORS.textMuted, onPress }: any) => (
        <TouchableOpacity
            style={styles.infoRow}
            disabled={!onPress}
            onPress={onPress}
        >
            <View style={[styles.infoIcon, { backgroundColor: "rgba(255,255,255,0.02)" }]}>
                <Feather name={icon} size={14} color={color} />
            </View>
            <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={[styles.infoValue, onPress && { color: COLORS.primary }]}>{value || "N/A"}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.navHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.navTitle}>Resident Profile</Text>
                <TouchableOpacity style={styles.editBtn}>
                    <Feather name="edit-2" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
                {/* Profile Header */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: COLORS.primary + "20" }]}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(tenant.status) }]} />
                    </View>
                    <Text style={styles.profileName}>{tenant.full_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <View style={[styles.profileStatusBadge, { backgroundColor: getStatusColor(tenant.status) + "20", marginBottom: 0 }]}>
                            <Text style={[styles.profileStatusText, { color: getStatusColor(tenant.status) }]}>{tenant.status}</Text>
                        </View>
                        {tenant.stay_type === 'DAILY' && (
                            <View style={[styles.profileStatusBadge, { backgroundColor: COLORS.warning + "20", marginBottom: 0 }]}>
                                <Text style={[styles.profileStatusText, { color: COLORS.warning }]}>DAILY</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.enrollmentDate}>
                        Enrolled: {new Date(tenant.move_in_date || tenant.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                    {tenant.stay_type === 'DAILY' && tenant.vacate_date && (
                        <Text style={[styles.enrollmentDate, { color: COLORS.warning, marginTop: 4 }]}>
                            Checkout: {new Date(tenant.vacate_date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                        </Text>
                    )}
                </View>

                {/* Contact Directory */}
                <DetailCard title="Contact Directory" icon="phone">
                    <InfoRow
                        label="REGISTERED NUMBER"
                        value={tenant.phone}
                        icon="phone"
                        onPress={() => Linking.openURL(`tel:${tenant.phone}`)}
                    />
                    <InfoRow
                        label="EMAIL ADDRESS"
                        value={tenant.email}
                        icon="mail"
                        onPress={tenant.email ? () => Linking.openURL(`mailto:${tenant.email}`) : null}
                    />
                    <InfoRow
                        label="MONTHLY OCCUPATION"
                        value={tenant.profession}
                        icon="briefcase"
                    />
                    <InfoRow
                        label="GENDER IDENTITY"
                        value={tenant.gender}
                        icon="user"
                    />
                </DetailCard>

                {/* Stay Allocation */}
                <DetailCard title="Stay Allocation" icon="home" color={COLORS.success}>
                    <View style={styles.allocationGrid}>
                        <View style={styles.allocationItem}>
                            <View style={[styles.allocationIcon, { backgroundColor: COLORS.success + "15" }]}>
                                <Feather name="box" size={20} color={COLORS.success} />
                            </View>
                            <View>
                                <Text style={styles.allocationLabel}>ROOM</Text>
                                <Text style={styles.allocationValue}>{tenant.rooms?.room_number || "N/A"}</Text>
                            </View>
                        </View>
                        <View style={styles.allocationItem}>
                            <View style={[styles.allocationIcon, { backgroundColor: COLORS.primary + "15" }]}>
                                <MaterialCommunityIcons name="bed-outline" size={20} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.allocationLabel}>BED</Text>
                                <Text style={styles.allocationValue}>{tenant.beds?.bed_number || "N/A"}</Text>
                            </View>
                        </View>
                        <View style={styles.allocationItem}>
                            <View style={[styles.allocationIcon, { backgroundColor: COLORS.warning + "15" }]}>
                                <Feather name="layers" size={20} color={COLORS.warning} />
                            </View>
                            <View>
                                <Text style={styles.allocationLabel}>FLOOR</Text>
                                <Text style={styles.allocationValue}>
                                    {(tenant.rooms?.floor === 0 || tenant.rooms?.floor === "0") || (tenant.floor === 0 || tenant.floor === "0") ? "Ground" : (tenant.rooms?.floor || tenant.floor || "N/A")}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <InfoRow label="PROPERTY" value={tenant.pgs?.name || tenant.pgName} icon="map-pin" />
                </DetailCard>

                {/* Identity Credentials */}
                <DetailCard title="Identity Credentials" icon="shield" color={COLORS.warning}>
                    <View style={styles.idContainer}>
                        <View style={styles.idIcon}>
                            <MaterialCommunityIcons name="card-account-details-outline" size={24} color={COLORS.warning} />
                        </View>
                        <View style={styles.idInfo}>
                            <Text style={styles.idLabel}>AADHAAR NUMBER</Text>
                            <Text style={styles.idValue}>{tenant.id_number || "Not Provided"}</Text>
                        </View>
                        {tenant.id_verified && (
                            <View style={styles.verifiedBadge}>
                                <Feather name="check" size={10} color="#fff" />
                                <Text style={styles.verifiedText}>VERIFIED</Text>
                            </View>
                        )}
                    </View>
                </DetailCard>

                {/* Financial Status */}
                <DetailCard title="Financial Status" icon="credit-card" color={COLORS.danger}>
                    <View style={styles.financeItem}>
                        <View>
                            <Text style={styles.financeLabel}>{tenant.stay_type === 'DAILY' ? 'Rent (Per Day)' : 'Monthly Rent'}</Text>
                            <Text style={styles.financeSubLabel}>{tenant.stay_type === 'DAILY' ? 'Daily accommodation fee' : 'Standard monthly lease'}</Text>
                        </View>
                        <Text style={[styles.financeValue, { color: COLORS.text }]}>₹{Number(tenant.rent_amount || tenant.rent_per_day || tenant.rent_per_month || tenant.rent || tenant.rooms?.rent || 0).toLocaleString()}</Text>
                    </View>

                    <View style={styles.financeItem}>
                        <View>
                            <Text style={styles.financeLabel}>Outstanding Balance</Text>
                            <Text style={styles.financeSubLabel}>Invoice-based total due</Text>
                        </View>
                        <Text style={[styles.financeValue, { color: COLORS.danger }]}>
                            {outstandingBalance !== null ? `₹${outstandingBalance.toLocaleString()}` : "..."}
                        </Text>
                    </View>
                    {tenantCredit > 0 && (
                        <View style={styles.financeItem}>
                            <View>
                                <Text style={styles.financeLabel}>Tenant Credit</Text>
                                <Text style={styles.financeSubLabel}>Available for future invoices</Text>
                            </View>
                            <Text style={[styles.financeValue, { color: COLORS.success }]}>₹{Number(tenantCredit || 0).toLocaleString()}</Text>
                        </View>
                    )}
                    <View style={styles.financeItem}>
                        <View>
                            <Text style={styles.financeLabel}>Maintenance Charge</Text>
                            <Text style={styles.financeSubLabel}>Property amenities fee</Text>
                        </View>
                        <Text style={[styles.financeValue, { color: COLORS.warning }]}>₹{Number(tenant.maintenance_amount || tenant.maintenance || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeItem}>
                        <View>
                            <Text style={styles.financeLabel}>Security Deposit</Text>
                            <Text style={styles.financeSubLabel}>Refundable on checkout</Text>
                        </View>
                        <Text style={[styles.financeValue, { color: COLORS.success }]}>₹{Number(tenant.deposit_amount || tenant.security_deposit || tenant.rooms?.deposit || 0).toLocaleString()}</Text>
                    </View>
                </DetailCard>

                {/* Ledger / Invoices Section */}
                <DetailCard title="Recent Invoices" icon="list" color={COLORS.primary}>
                    {loadingBilling ? (
                        <ActivityIndicator color={COLORS.primary} size="small" />
                    ) : invoices.length > 0 ? (
                        [...invoices].sort((a, b) => new Date(b.billing_period_start).getTime() - new Date(a.billing_period_start).getTime()).map((inv: any) => {
                            const renderInvoiceTitle = () => {
                                switch (inv.type?.toUpperCase()) {
                                    case 'RENT':
                                        const date = new Date(inv.billing_period_start);
                                        return `Rent – ${date.toLocaleDateString([], { month: 'short', year: 'numeric' })}`;
                                    case 'DEPOSIT':
                                        return "Security Deposit";
                                    case 'OPENING_BALANCE':
                                        return "Opening Balance";
                                    default:
                                        return new Date(inv.billing_period_start).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
                                }
                            };

                            return (
                                <View key={inv.id} style={styles.invoiceItem}>
                                    <View style={styles.invoiceMain}>
                                        <Text style={styles.invoiceDate}>
                                            {renderInvoiceTitle()}
                                        </Text>
                                        <View style={[styles.statusBadgeSmall, { backgroundColor: getInvoiceStatusColor(inv.status) + "20" }]}>
                                            <Text style={[styles.statusBadgeTextSmall, { color: getInvoiceStatusColor(inv.status) }]}>{inv.status}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.invoiceAmounts}>
                                        <Text style={styles.invoiceTotal}>₹{Number(inv.total_amount || 0).toLocaleString()}</Text>
                                        <Text style={styles.invoicePaid}>Paid: ₹{Number(inv.paid_amount || 0).toLocaleString()}</Text>
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.emptyLedger}>No invoices generated yet.</Text>
                    )}
                </DetailCard>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        navHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border
        },
        backBtn: { padding: 4 },
        navTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
        editBtn: { padding: 8 },
        scrollPadding: { paddingHorizontal: 20, paddingTop: 20 },

        profileSection: { alignItems: "center", marginBottom: 30 },
        avatarContainer: { position: "relative", marginBottom: 15 },
        avatar: {
            width: 100,
            height: 100,
            borderRadius: 35,
            justifyContent: "center",
            alignItems: "center"
        },
        avatarText: { fontSize: 36, fontWeight: "900", color: COLORS.primary },
        statusIndicator: {
            position: "absolute",
            bottom: 5,
            right: 5,
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 3,
            borderColor: COLORS.bg
        },
        profileName: { fontSize: 24, fontWeight: "900", color: COLORS.text, marginBottom: 8 },
        profileStatusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginBottom: 10 },
        profileStatusText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
        enrollmentDate: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },

        detailCard: {
            backgroundColor: COLORS.card,
            borderRadius: 24,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
        iconBox: {
            width: 36,
            height: 36,
            borderRadius: 10,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12
        },
        cardTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
        cardContent: { gap: 16 },

        infoRow: { flexDirection: "row", alignItems: "center" },
        infoIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center", marginRight: 12 },
        infoText: { flex: 1 },
        infoLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
        infoValue: { fontSize: 14, fontWeight: "700", color: COLORS.text },

        allocationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 15, marginBottom: 10 },
        allocationItem: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.02)",
            padding: 12,
            borderRadius: 16,
            width: "47%",
            gap: 12
        },
        allocationIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
        allocationLabel: { fontSize: 8, color: COLORS.textMuted, fontWeight: "800" },
        allocationValue: { fontSize: 16, fontWeight: "900", color: COLORS.text },

        idContainer: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.02)",
            padding: 16,
            borderRadius: 16,
            gap: 16
        },
        idIcon: { padding: 10, backgroundColor: COLORS.warning + "10", borderRadius: 12 },
        idInfo: { flex: 1 },
        idLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: "800", marginBottom: 4 },
        idValue: { fontSize: 16, fontWeight: "900", color: COLORS.text },
        verifiedBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: COLORS.success,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6
        },
        verifiedText: { fontSize: 8, fontWeight: "900", color: "#fff" },

        financeItem: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.05)"
        },
        financeLabel: { fontSize: 14, fontWeight: "700", color: COLORS.text },
        financeSubLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
        financeValue: { fontSize: 18, fontWeight: "900" },

        // Invoice Item Styles
        invoiceItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border + '30'
        },
        invoiceMain: { gap: 4 },
        invoiceDate: { fontSize: 14, fontWeight: '700', color: COLORS.text },
        statusBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
        statusBadgeTextSmall: { fontSize: 9, fontWeight: '900' },
        invoiceAmounts: { alignItems: 'flex-end', gap: 2 },
        invoiceTotal: { fontSize: 15, fontWeight: '800', color: COLORS.text },
        invoicePaid: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
        emptyLedger: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 10, fontStyle: 'italic' }
    });

export default ResidentDetailScreen;
