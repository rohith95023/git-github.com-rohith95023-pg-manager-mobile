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
    Pressable,
    Modal
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

const PROFESSION_OPTIONS = [
    "ALL",
    "Software Engineer",
    "IT Professional",
    "Student",
    "Business Owner",
    "Sales/Marketing",
    "Medical Professional",
    "Government Employee",
    "Hospitallity",
    "Freelancer",
    "Teacher/Professor",
    "Other"
];

const STATUS_OPTIONS = ["ALL", "ACTIVE", "UPCOMING", "OVERDUE", "NOTICE", "INACTIVE", "COMPLETED"];
const SORT_OPTIONS = ["Newest First", "Oldest First", "Name (A-Z)", "Name (Z-A)"];

const SmartTenantFinder = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [tenants, setTenants] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPg, setSelectedPg] = useState("ALL");
    const [selectedProfession, setSelectedProfession] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [selectedSort, setSelectedSort] = useState("Newest First");

    // Bottom Sheet Control
    const [activeFilterType, setActiveFilterType] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [pgsRes, tenantsRes]: any = await Promise.all([
                pgAPI.getAll(),
                tenantAPI.search({
                    page: 1,
                    limit: 200,
                    search: searchTerm,
                    status: selectedStatus,
                    pgId: selectedPg,
                })
            ]);

            setPgs(pgsRes || []);

            let data = tenantsRes.data || [];

            // Local Filter for Profession
            if (selectedProfession !== "ALL") {
                data = data.filter((t: any) => t.profession === selectedProfession);
            }

            // Local Sorting
            data = [...data].sort((a: any, b: any) => {
                if (selectedSort === "Newest First") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                if (selectedSort === "Oldest First") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                if (selectedSort === "Name (A-Z)") return (a.full_name || "").localeCompare(b.full_name || "");
                if (selectedSort === "Name (Z-A)") return (b.full_name || "").localeCompare(a.full_name || "");
                return 0;
            });

            setTenants(data);
        } catch (error) {
            console.error("Failed to fetch tenant finder data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchTerm, selectedPg, selectedStatus, selectedProfession, selectedSort]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE': return COLORS.success;
            case 'UPCOMING': return COLORS.primary;
            case 'OVERDUE': return COLORS.danger;
            case 'NOTICE': return COLORS.warning;
            default: return COLORS.textMuted;
        }
    };

    const ResultCard = ({ item }: { item: any }) => {
        const initials = (item.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
        const rent = item.rent_per_month || item.rent || item.rooms?.rent || 0;
        const deposit = item.security_deposit || item.rooms?.deposit || 0;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("ResidentDetail", { tenant: item })}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary + "20" }]}>
                        <Text style={[styles.avatarText, { color: COLORS.primary }]}>{initials}</Text>
                    </View>
                    <View style={styles.headerMain}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
                            <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                                <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                            </View>
                        </View>
                        <View style={styles.metaRow}>
                            <View style={[styles.typeBadge, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
                                <Text style={styles.typeBadgeText}>{item.stay_type || "MONTHLY"}</Text>
                            </View>
                            <Text style={styles.phoneText}>{item.phone}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Feather name="home" size={12} color={COLORS.textMuted} />
                    <Text style={styles.infoText} numberOfLines={1}>
                        {item.pgs?.name || "N/A"} • Room {item.rooms?.room_number || "N/A"}
                        {item.beds?.bed_number ? ` • ${item.beds.bed_number}` : ""}
                    </Text>
                </View>

                <View style={styles.financeGrid}>
                    <View style={styles.financeItem}>
                        <Text style={styles.financeLabel}>RENT</Text>
                        <Text style={[styles.financeValue, { color: COLORS.primary }]}>₹{Number(rent).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeItem}>
                        <Text style={styles.financeLabel}>DEPOSIT</Text>
                        <Text style={[styles.financeValue, { color: COLORS.success }]}>₹{Number(deposit).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeItem}>
                        <Text style={styles.financeLabel}>BALANCE</Text>
                        <Text style={[styles.financeValue, { color: COLORS.danger }]}>₹{Number(item.balance || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeItem}>
                        <Text style={styles.financeLabel}>MAINT.</Text>
                        <Text style={[styles.financeValue, { color: COLORS.warning }]}>₹{Number(item.maintenance_amount || 0).toLocaleString()}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Search Section */}
            <View style={styles.topSection}>
                <View style={styles.searchBar}>
                    <Feather name="search" size={20} color={COLORS.textMuted} />
                    <TextInput
                        placeholder="Search name, phone, email, ID..."
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.searchInput}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {searchTerm !== "" && (
                        <TouchableOpacity onPress={() => setSearchTerm("")}>
                            <Feather name="x-circle" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Chips Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
                    <FilterChip
                        label={selectedPg === "ALL" ? "Property" : pgs.find(p => p.id === selectedPg)?.name || "Property"}
                        isActive={selectedPg !== "ALL"}
                        onPress={() => setActiveFilterType("PROPERTY")}
                    />
                    <FilterChip
                        label={selectedProfession === "ALL" ? "Profession" : selectedProfession}
                        isActive={selectedProfession !== "ALL"}
                        onPress={() => setActiveFilterType("PROFESSION")}
                    />
                    <FilterChip
                        label={selectedStatus === "ALL" ? "Status" : selectedStatus}
                        isActive={selectedStatus !== "ALL"}
                        onPress={() => setActiveFilterType("STATUS")}
                    />
                    <FilterChip
                        label={selectedSort}
                        isActive={true}
                        onPress={() => setActiveFilterType("SORT")}
                    />
                </ScrollView>
            </View>

            {/* Results List */}
            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={tenants}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ResultCard item={item} />}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="search" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>No residents match your search</Text>
                        </View>
                    }
                />
            )}

            {/* Filter Bottom Sheet Modal */}
            <Modal
                visible={!!activeFilterType}
                transparent
                animationType="slide"
                onRequestClose={() => setActiveFilterType(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setActiveFilterType(null)}>
                    <View style={styles.bottomSheet}>
                        <View style={styles.sheetHeader}>
                            <View style={styles.sheetHandle} />
                            <Text style={styles.sheetTitle}>
                                {activeFilterType === "PROPERTY" && "Select Property"}
                                {activeFilterType === "PROFESSION" && "Select Profession"}
                                {activeFilterType === "STATUS" && "Select Status"}
                                {activeFilterType === "SORT" && "Sort By"}
                            </Text>
                        </View>

                        <ScrollView style={styles.sheetContent}>
                            {activeFilterType === "PROPERTY" && (
                                <>
                                    <BottomSheetItem label="All Properties" isSelected={selectedPg === "ALL"} onPress={() => { setSelectedPg("ALL"); setActiveFilterType(null); }} />
                                    {pgs.map(pg => (
                                        <BottomSheetItem key={pg.id} label={pg.name} isSelected={selectedPg === pg.id} onPress={() => { setSelectedPg(pg.id); setActiveFilterType(null); }} />
                                    ))}
                                </>
                            )}
                            {activeFilterType === "PROFESSION" && (
                                PROFESSION_OPTIONS.map(prof => (
                                    <BottomSheetItem key={prof} label={prof} isSelected={selectedProfession === prof} onPress={() => { setSelectedProfession(prof); setActiveFilterType(null); }} />
                                ))
                            )}
                            {activeFilterType === "STATUS" && (
                                STATUS_OPTIONS.map(stat => (
                                    <BottomSheetItem key={stat} label={stat} isSelected={selectedStatus === stat} onPress={() => { setSelectedStatus(stat); setActiveFilterType(null); }} />
                                ))
                            )}
                            {activeFilterType === "SORT" && (
                                SORT_OPTIONS.map(opt => (
                                    <BottomSheetItem key={opt} label={opt} isSelected={selectedSort === opt} onPress={() => { setSelectedSort(opt); setActiveFilterType(null); }} />
                                ))
                            )}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const FilterChip = ({ label, isActive, onPress }: any) => (
    <TouchableOpacity
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={onPress}
    >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
        <Feather name="chevron-down" size={12} color={isActive ? "#fff" : COLORS.textMuted} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
);

const BottomSheetItem = ({ label, isSelected, onPress }: any) => (
    <TouchableOpacity style={[styles.sheetItem, isSelected && styles.sheetItemActive]} onPress={onPress}>
        <Text style={[styles.sheetItemText, isSelected && styles.sheetItemTextActive]}>{label}</Text>
        {isSelected && <Feather name="check" size={18} color={COLORS.primary} />}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    topSection: { paddingVertical: 10 },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.card,
        borderRadius: 25,
        paddingHorizontal: 20,
        height: 50,
        marginHorizontal: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    searchInput: { flex: 1, marginLeft: 12, color: COLORS.text, fontWeight: "600", fontSize: 14 },

    chipsScroll: { maxHeight: 50 },
    chipsContent: { paddingHorizontal: 20, gap: 10, paddingBottom: 10 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        minWidth: 80,
        justifyContent: "center"
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted },
    chipTextActive: { color: "#fff" },

    listContent: { padding: 20, paddingTop: 10, paddingBottom: 40 },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2
    },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    avatar: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 12 },
    avatarText: { fontSize: 20, fontWeight: "900" },
    headerMain: { flex: 1 },
    nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    name: { fontSize: 16, fontWeight: "800", color: COLORS.text, flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
    badgeText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    typeBadgeText: { fontSize: 8, color: COLORS.textMuted, fontWeight: "900" },
    phoneText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },

    infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
    infoText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },

    financeGrid: { flexDirection: "row", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)" },
    financeItem: { flex: 1, alignItems: "center" },
    financeLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: "800", marginBottom: 4 },
    financeValue: { fontSize: 13, fontWeight: "900" },

    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyContainer: { alignItems: "center", marginTop: 80, gap: 16 },
    emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: "600" },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    bottomSheet: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: height * 0.7,
        paddingBottom: 40
    },
    sheetHeader: { alignItems: "center", padding: 15 },
    sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 15 },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
    sheetContent: { paddingHorizontal: 20 },
    sheetItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.05)"
    },
    sheetItemActive: {},
    sheetItemText: { fontSize: 16, fontWeight: "600", color: COLORS.textMuted },
    sheetItemTextActive: { color: COLORS.primary, fontWeight: "800" }
});

export default SmartTenantFinder;
