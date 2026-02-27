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
    Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tenantAPI, pgAPI } from "../services/api";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import { supabase } from "../lib/supabaseClient";

const { width, height } = Dimensions.get("window");

const RESIDENT_STATUS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE", "UPCOMING", "OVERDUE", "NOTICE", "COMPLETED"];
const PROFESSION_OPTIONS = [
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
const SORT_OPTIONS = [
    { label: "Newest First", sortBy: "move_in_date", sortOrder: "desc" },
    { label: "Oldest First", sortBy: "move_in_date", sortOrder: "asc" },
    { label: "Name (A-Z)", sortBy: "full_name", sortOrder: "asc" },
    { label: "Property (A-Z)", sortBy: "pg_name", sortOrder: "asc" },
    { label: "Floor (Low-High)", sortBy: "floor", sortOrder: "asc" }
];
const createDefaultTenantFilters = () => ({
    propertyId: "",
    status: "ALL",
    profession: "ALL",
    floor: "ALL",
    room: "ALL",
    sortBy: "move_in_date",
    sortOrder: "desc"
});

const TenantsScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [tenants, setTenants] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState(createDefaultTenantFilters());
    const [pendingFilters, setPendingFilters] = useState(createDefaultTenantFilters());
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);
    const [sheetFloorOptions, setSheetFloorOptions] = useState<string[]>([]);
    const [sheetRoomOptions, setSheetRoomOptions] = useState<any[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadTenants = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await tenantAPI.search({
                page: 1,
                limit: 200,
                search: debouncedSearch,
                status: filters.status,
                profession: filters.profession,
                pgId: filters.propertyId,
                floor: filters.floor,
                roomId: filters.room,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder,
            });
            setTenants(data || []);
        } catch (error) {
            console.error("Failed to fetch Resident Directory data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [debouncedSearch, filters]);

    const fetchFloors = useCallback(async (pgId: string) => {
        if (!pgId || pgId === "ALL") return [];
        try {
            const { data, error } = await supabase
                .from("rooms")
                .select("floor")
                .eq("pg_id", pgId);
            if (error) throw error;
            const uniqueFloors = [...new Set(data.map((room: any) => room.floor))]
                .filter((floor) => floor !== null && floor !== undefined && floor !== "")
                .sort((a, b) => {
                    const numA = Number(a);
                    const numB = Number(b);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return String(a).localeCompare(String(b));
                });
            return uniqueFloors;
        } catch (error) {
            console.error("Error fetching floors:", error);
            return [];
        }
    }, []);

    const fetchRoomFilterList = useCallback(async (pgId: string, floor: string) => {
        if (!pgId || pgId === "ALL") return [];
        try {
            let query = supabase.from("rooms").select("*").eq("pg_id", pgId);
            if (floor && floor !== "ALL") {
                query = query.eq("floor", floor);
            }
            const { data, error } = await query.order("floor").order("room_number");
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error fetching rooms for filter sheet:", error);
            return [];
        }
    }, []);

    useEffect(() => {
        loadTenants();
    }, [loadTenants]);

    useEffect(() => {
        if (!isFilterSheetVisible) return;
        (async () => {
            const floors = await fetchFloors(pendingFilters.propertyId);
            setSheetFloorOptions(floors);
            const rooms = await fetchRoomFilterList(pendingFilters.propertyId, pendingFilters.floor);
            setSheetRoomOptions(rooms);
        })();
    }, [pendingFilters.propertyId, pendingFilters.floor, isFilterSheetVisible, fetchFloors, fetchRoomFilterList]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const filteredTenants = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return tenants.filter((tenant) => {
            const fullName = (tenant.full_name || "").toLowerCase();
            const propertyName = (tenant.pgs?.name || "").toLowerCase();
            return (
                fullName.includes(searchLower) ||
                (tenant.phone || "").includes(searchTerm) ||
                propertyName.includes(searchLower)
            );
        });
    }, [tenants, searchTerm]);

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

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="Resident Filters"
                description="Property, status, profession, floor, room, and sort (matches web)"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    const applied = { ...pendingFilters };
                    setFilters(applied);
                    setPendingFilters(applied);
                    setFilterSheetVisible(false);
                }}
                onReset={() => {
                    const defaults = createDefaultTenantFilters();
                    setFilters(defaults);
                    setPendingFilters(defaults);
                    setFilterSheetVisible(false);
                }}
            >
                <View style={styles.sheetSection}>
                    <Text style={styles.sheetLabel}>Property</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sheetChipsRow}>
                        <TouchableOpacity
                            style={[styles.sheetChip, pendingFilters.propertyId === "ALL" && styles.sheetChipActive]}
                            onPress={() =>
                                setPendingFilters(prev => ({ ...prev, propertyId: "ALL", floor: "ALL", room: "ALL" }))
                            }
                        >
                            <Text style={[styles.sheetChipText, pendingFilters.propertyId === "ALL" && styles.sheetChipTextActive]}>All Properties</Text>
                        </TouchableOpacity>
                        {pgs.map(pg => (
                            <TouchableOpacity
                                key={pg.id}
                                style={[styles.sheetChip, pendingFilters.propertyId === pg.id && styles.sheetChipActive]}
                                onPress={() => setPendingFilters(prev => ({ ...prev, propertyId: pg.id, floor: "ALL", room: "ALL" }))}
                            >
                                <Text style={[styles.sheetChipText, pendingFilters.propertyId === pg.id && styles.sheetChipTextActive]} numberOfLines={1}>
                                    {pg.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.sheetSection}>
                    <Text style={styles.sheetLabel}>Status</Text>
                    <View style={styles.sheetChipsRow}>
                        {RESIDENT_STATUS_OPTIONS.map(stat => (
                            <TouchableOpacity
                                key={stat}
                                style={[styles.sheetChip, pendingFilters.status === stat && styles.sheetChipActive]}
                                onPress={() => setPendingFilters(prev => ({ ...prev, status: stat }))}
                            >
                                <Text style={[styles.sheetChipText, pendingFilters.status === stat && styles.sheetChipTextActive]}>
                                    {stat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.sheetSection}>
                    <Text style={styles.sheetLabel}>Profession</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sheetChipsRow}>
                        <TouchableOpacity
                            style={[styles.sheetChip, pendingFilters.profession === "ALL" && styles.sheetChipActive]}
                            onPress={() => setPendingFilters(prev => ({ ...prev, profession: "ALL" }))}
                        >
                            <Text style={[styles.sheetChipText, pendingFilters.profession === "ALL" && styles.sheetChipTextActive]}>All Professions</Text>
                        </TouchableOpacity>
                        {PROFESSION_OPTIONS.map(prof => (
                            <TouchableOpacity
                                key={prof}
                                style={[styles.sheetChip, pendingFilters.profession === prof && styles.sheetChipActive]}
                                onPress={() => setPendingFilters(prev => ({ ...prev, profession: prof }))}
                            >
                                <Text style={[styles.sheetChipText, pendingFilters.profession === prof && styles.sheetChipTextActive]}>
                                    {prof}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {sheetFloorOptions.length > 0 && (
                    <View style={styles.sheetSection}>
                        <Text style={styles.sheetLabel}>Floor</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sheetChipsRow}>
                            <TouchableOpacity
                                style={[styles.sheetChip, pendingFilters.floor === "ALL" && styles.sheetChipActive]}
                                onPress={() => setPendingFilters(prev => ({ ...prev, floor: "ALL", room: "ALL" }))}
                            >
                                <Text style={[styles.sheetChipText, pendingFilters.floor === "ALL" && styles.sheetChipTextActive]}>All Floors</Text>
                            </TouchableOpacity>
                            {sheetFloorOptions.map(floor => (
                                <TouchableOpacity
                                    key={floor}
                                    style={[styles.sheetChip, pendingFilters.floor === floor && styles.sheetChipActive]}
                                    onPress={() => setPendingFilters(prev => ({ ...prev, floor, room: "ALL" }))}
                                >
                                    <Text style={[styles.sheetChipText, pendingFilters.floor === floor && styles.sheetChipTextActive]}>
                                        Floor {floor}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {sheetRoomOptions.length > 0 && (
                    <View style={styles.sheetSection}>
                        <Text style={styles.sheetLabel}>Room</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sheetChipsRow}>
                            <TouchableOpacity
                                style={[styles.sheetChip, pendingFilters.room === "ALL" && styles.sheetChipActive]}
                                onPress={() => setPendingFilters(prev => ({ ...prev, room: "ALL" }))}
                            >
                                <Text style={[styles.sheetChipText, pendingFilters.room === "ALL" && styles.sheetChipTextActive]}>All Rooms</Text>
                            </TouchableOpacity>
                            {sheetRoomOptions.map(room => (
                                <TouchableOpacity
                                    key={room.id}
                                    style={[styles.sheetChip, pendingFilters.room === room.id && styles.sheetChipActive]}
                                    onPress={() => setPendingFilters(prev => ({ ...prev, room: room.id }))}
                                >
                                    <Text style={[styles.sheetChipText, pendingFilters.room === room.id && styles.sheetChipTextActive]}>
                                        Room {room.room_number}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.sheetSection}>
                    <Text style={styles.sheetLabel}>Sort By</Text>
                    <View style={styles.sheetSortRow}>
                        {SORT_OPTIONS.map(option => (
                            <TouchableOpacity
                                key={option.label}
                                style={[
                                    styles.sheetSortButton,
                                    pendingFilters.sortBy === option.sortBy && pendingFilters.sortOrder === option.sortOrder && styles.sheetSortButtonActive
                                ]}
                                onPress={() =>
                                    setPendingFilters(prev => ({
                                        ...prev,
                                        sortBy: option.sortBy,
                                        sortOrder: option.sortOrder
                                    }))
                                }
                            >
                                <Text
                                    style={[
                                        styles.sheetSortText,
                                        pendingFilters.sortBy === option.sortBy && pendingFilters.sortOrder === option.sortOrder && styles.sheetSortTextActive
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </FilterBottomSheet>

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

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
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
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6
    },
    filterButtonText: { fontSize: 14, fontWeight: "700", color: "#fff" },

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

    sheetSection: { marginBottom: 18 },
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
    sheetChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    sheetChipText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
    sheetChipTextActive: { color: "#fff" },
    sheetSortRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    sheetSortButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card
    },
    sheetSortButtonActive: { backgroundColor: COLORS.primary + "10", borderColor: COLORS.primary },
    sheetSortText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
    sheetSortTextActive: { color: COLORS.primary },

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
