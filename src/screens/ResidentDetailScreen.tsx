import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Image,
    Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const COLORS = {
    bg: "#0f172a",
    card: "#1e293b",
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    text: "#ffffff",
    textMuted: "#94a3b8",
    border: "rgba(255,255,255,0.05)"
};

const ResidentDetailScreen = ({ route, navigation }: any) => {
    const { tenant } = route.params;
    const { colors } = useTheme();

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
                    <View style={[styles.profileStatusBadge, { backgroundColor: getStatusColor(tenant.status) + "20" }]}>
                        <Text style={[styles.profileStatusText, { color: getStatusColor(tenant.status) }]}>{tenant.status}</Text>
                    </View>
                    <Text style={styles.enrollmentDate}>
                        Enrolled: {new Date(tenant.move_in_date || tenant.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
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
                                <Text style={styles.allocationValue}>{tenant.rooms?.floor || tenant.floor || "N/A"}</Text>
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
                            <Text style={styles.financeLabel}>Monthly Rent</Text>
                            <Text style={styles.financeSubLabel}>Standard monthly lease</Text>
                        </View>
                        <Text style={[styles.financeValue, { color: COLORS.text }]}>₹{Number(tenant.rent_per_month || tenant.rent || tenant.rooms?.rent || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeItem}>
                        <View>
                            <Text style={styles.financeLabel}>Balance Due</Text>
                            <Text style={styles.financeSubLabel}>Pending collection</Text>
                        </View>
                        <Text style={[styles.financeValue, { color: COLORS.danger }]}>₹{Number(tenant.balance || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeItem}>
                        <View>
                            <Text style={styles.financeLabel}>Maintenance Charge</Text>
                            <Text style={styles.financeSubLabel}>Property amenities fee</Text>
                        </View>
                        <Text style={[styles.financeValue, { color: COLORS.warning }]}>₹{Number(tenant.maintenance_amount || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeItem}>
                        <View>
                            <Text style={styles.financeLabel}>Security Deposit</Text>
                            <Text style={styles.financeSubLabel}>Refundable on checkout</Text>
                        </View>
                        <Text style={[styles.financeValue, { color: COLORS.success }]}>₹{Number(tenant.security_deposit || tenant.rooms?.deposit || 0).toLocaleString()}</Text>
                    </View>
                </DetailCard>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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
    financeValue: { fontSize: 18, fontWeight: "900" }
});

export default ResidentDetailScreen;
