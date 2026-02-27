import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    Pressable,
    Modal,
    Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { tenantAPI, pgAPI } from "../services/api";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

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

const TenantsScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [tenants, setTenants] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPg, setSelectedPg] = useState<string | null>(null);
    const [showFilterTabs, setShowFilterTabs] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>("ACTIVE");
    const [showFilters, setShowFilters] = useState(false);

    const statuses = ["ACTIVE", "INACTIVE", "UPCOMING", "OVERDUE", "NOTICE", "COMPLETED"];

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [tenantsData, pgsData]: any = await Promise.all([
                tenantAPI.search({ page: 1, limit: 200, status: "ALL" }),
                pgAPI.getAll()
            ]);
            setTenants(tenantsData.data || []);
            setPgs(pgsData || []);
        } catch (error) {
            console.error("Failed to fetch Resident Directory data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const filteredTenants = useMemo(() => {
        return tenants.filter(t => {
            const matchesSearch =
                (t.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.phone || "").includes(searchTerm) ||
                (t.pgs?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPg = !selectedPg || t.pg_id === selectedPg;
            const matchesStatus = !selectedStatus || t.status === selectedStatus;
            return matchesSearch && matchesPg && matchesStatus;
        });
    }, [tenants, searchTerm, selectedPg, selectedStatus]);

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

    const ResidentCard = ({ item }: { item: any }) => {
        const initials = (item.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("ResidentDetail", { tenant: item })}
            >
                {/* Top Row: Avatar, Name, Status, Actions */}
                <View style={styles.cardHeader}>
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary + "20" }]}>
                        <Text style={[styles.avatarText, { color: COLORS.primary }]}>{initials}</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
                            <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                                <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                            </View>
                        </View>
                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Feather name="edit-2" size={14} color={COLORS.textMuted} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Feather name="trash-2" size={14} color={COLORS.danger} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Sub-Header: Phone, Profession */}
                <View style={styles.subHeader}>
                    <TouchableOpacity style={styles.phoneRow} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                        <Feather name="phone" size={14} color={COLORS.primary} />
                        <Text style={styles.phoneText}>{item.phone || "No Phone"}</Text>
                    </TouchableOpacity>
                    <View style={[styles.profBadge, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
                        <Text style={styles.profText}>{item.profession || "No Profession"}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Assignment Details */}
                <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>PROPERTY</Text>
                            <Text style={styles.detailValue} numberOfLines={1}>{item.pgs?.name || "N/A"}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>ROOM / BED</Text>
                            <Text style={styles.detailValue}>
                                {item.rooms?.room_number || "N/A"}{item.beds?.bed_number ? ` • ${item.beds.bed_number}` : ""}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.detailRow, { marginTop: 12 }]}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>MONTHLY RENT</Text>
                            <Text style={[styles.detailValue, { color: COLORS.success }]}>₹{Number(item.rent || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>MAINTENANCE</Text>
                            <Text style={styles.detailValue}>
                                ₹{Number(item.maintenance_amount || 0).toLocaleString()}
                                <Text style={{ fontSize: 9, color: COLORS.textMuted }}> ({item.maintenance_type || "ONE_TIME"})</Text>
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        <Feather name="calendar" size={12} color={COLORS.textMuted} />
                        <Text style={styles.joinedText}>Joined: {new Date(item.move_in_date || item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.msgBtn}
                        onPress={() => Linking.openURL(`sms:${item.phone}`)}
                    >
                        <Feather name="message-square" size={14} color={COLORS.primary} />
                        <Text style={styles.msgBtnText}>Message</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Resident Directory</Text>
            </View>

            {/* Content with FlatList */}
            <FlatList
                data={filteredTenants}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ResidentCard item={item} />}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListHeaderComponent={
                    <View style={styles.topSection}>
                        {/* Search Bar */}
                        {/* Search Row */}
                        <View style={styles.searchRow}>
                            <View style={styles.searchBar}>
                                <Feather name="search" size={18} color={COLORS.textMuted} />
                                <TextInput
                                    placeholder="Search name, phone..."
                                    placeholderTextColor={COLORS.textMuted}
                                    style={styles.searchInput}
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                />
                                {searchTerm !== "" && (
                                    <TouchableOpacity onPress={() => setSearchTerm("")}>
                                        <Feather name="x-circle" size={16} color={COLORS.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity
                                style={[styles.filterToggle, showFilterTabs && styles.filterToggleActive]}
                                onPress={() => setShowFilterTabs(!showFilterTabs)}
                            >
                                <Ionicons
                                    name={showFilterTabs ? "close" : "options-outline"}
                                    size={22}
                                    color={showFilterTabs ? "#fff" : COLORS.primary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Filter Tabs (Conditional) */}
                        {showFilterTabs && (
                            <View style={styles.filterTabsWrapper}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                                    <TouchableOpacity
                                        style={[styles.chip, !selectedPg && styles.chipActive]}
                                        onPress={() => setSelectedPg(null)}
                                    >
                                        <Text style={[styles.chipText, !selectedPg && styles.chipTextActive]}>All Properties</Text>
                                    </TouchableOpacity>
                                    {pgs.map((pg) => (
                                        <TouchableOpacity
                                            key={pg.id}
                                            style={[styles.chip, selectedPg === pg.id && styles.chipActive]}
                                            onPress={() => setSelectedPg(pg.id)}
                                        >
                                            <Text style={[styles.chipText, selectedPg === pg.id && styles.chipTextActive]}>{pg.name.split(' ')[0]}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity style={styles.advancedFilterBtn} onPress={() => setShowFilters(true)}>
                                    <Feather name="sliders" size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Status Chips */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusChipsScroll}>
                            {statuses.map((stat) => (
                                <TouchableOpacity
                                    key={stat}
                                    style={[styles.statusChip, selectedStatus === stat && { borderColor: getStatusColor(stat), backgroundColor: getStatusColor(stat) + "10" }]}
                                    onPress={() => setSelectedStatus(stat === selectedStatus ? "" : stat)}
                                >
                                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(stat) }]} />
                                    <Text style={[styles.statusChipText, selectedStatus === stat && { color: getStatusColor(stat) }]}>{stat}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator color={COLORS.primary} size="large" />
                        ) : (
                            <>
                                <Feather name="users" size={48} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>No residents found</Text>
                            </>
                        )}
                    </View>
                }
            />

            {/* Filter Modal (Bottom Sheet Simulation) */}
            <Modal
                visible={showFilters}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFilters(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowFilters(false)}>
                    <View style={styles.bottomSheet}>
                        <View style={styles.sheetHeader}>
                            <View style={styles.sheetHandle} />
                            <Text style={styles.sheetTitle}>Filter Residents</Text>
                        </View>

                        <View style={styles.sheetContent}>
                            <Text style={styles.sheetLabel}>Status</Text>
                            <View style={styles.sheetChipGrid}>
                                {["ALL", ...statuses].map((stat) => (
                                    <TouchableOpacity
                                        key={stat}
                                        style={[styles.sheetChip, (selectedStatus === stat || (stat === "ALL" && !selectedStatus)) && styles.sheetChipActive]}
                                        onPress={() => {
                                            setSelectedStatus(stat === "ALL" ? "" : stat);
                                            setShowFilters(false);
                                        }}
                                    >
                                        <Text style={[styles.sheetChipText, (selectedStatus === stat || (stat === "ALL" && !selectedStatus)) && styles.sheetChipTextActive]}>{stat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => console.log("Add Tenant")}
            >
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { padding: 20, paddingBottom: 10 },
    headerTitle: { fontSize: 24, fontWeight: "900", color: COLORS.text },

    topSection: { paddingHorizontal: 20, marginBottom: 12 },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
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
    filterToggle: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: COLORS.card,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterToggleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterTabsWrapper: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    chipsScroll: { flex: 1 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted },
    chipTextActive: { color: "#fff" },
    advancedFilterBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.card,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border
    },

    statusChipsScroll: { marginBottom: 8 },
    statusChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8,
        backgroundColor: COLORS.card
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    statusChipText: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted },

    listContent: { paddingBottom: 100, paddingHorizontal: 20 },
    card: {
        backgroundColor: COLORS.card,
        padding: 18,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8
    },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14
    },
    avatarText: { fontSize: 22, fontWeight: "900" },
    headerInfo: { flex: 1 },
    nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    name: { fontSize: 18, fontWeight: "800", color: COLORS.text, flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
    badgeText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
    actionsRow: { flexDirection: "row", gap: 8 },
    actionBtn: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.03)"
    },

    subHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    phoneRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    phoneText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
    profBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    profText: { fontSize: 11, fontWeight: "600", color: COLORS.textMuted },

    divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 16 },

    detailsSection: { gap: 12 },
    detailRow: { flexDirection: "row", justifyContent: "space-between" },
    detailItem: { flex: 1 },
    detailLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: "700", marginBottom: 4, letterSpacing: 0.5 },
    detailValue: { fontSize: 14, fontWeight: "800", color: COLORS.text },

    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border
    },
    footerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    joinedText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
    msgBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12
    },
    msgBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },

    emptyContainer: { alignItems: "center", marginTop: 40, gap: 16 },
    emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "600" },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    bottomSheet: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: 40
    },
    sheetHeader: { alignItems: "center", padding: 15 },
    sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 15 },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
    sheetContent: { padding: 20 },
    sheetLabel: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted, marginBottom: 15 },
    sheetChipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    sheetChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    sheetChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    sheetChipText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
    sheetChipTextActive: { color: "#fff" },

    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    }
});

export default TenantsScreen;
