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
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { roomAPI, bedAPI, pgAPI } from "../services/api";
import { supabase } from "../lib/supabaseClient";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import DropdownSelector from "../components/common/DropdownSelector";
import RoomFormModal from "../components/modals/RoomFormModal";
import ConfirmationModal from "../components/common/ConfirmationModal";

const { width } = Dimensions.get("window");

const createDefaultRoomFilters = () => ({
    property: null as string | null,
    showArchived: false,
    bedStatus: "ALL",
});
const BED_STATUS_OPTIONS = ["ALL", "AVAILABLE", "OCCUPIED", "MAINTENANCE"];

const RoomsScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [viewMode, setViewMode] = useState<"ROOMS" | "BEDS">("ROOMS");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState(createDefaultRoomFilters());
    const [pendingFilters, setPendingFilters] = useState(createDefaultRoomFilters());
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);

    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [editingRoom, setEditingRoom] = useState<any>(null);

    const [confirmState, setConfirmState] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info' | 'success';
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
        singleButton?: boolean;
        loading?: boolean;
    }>({
        visible: false,
        title: "",
        message: "",
        type: "info"
    });

    const statusMode = filters.showArchived ? "ARCHIVED" : "ACTIVE";
    const updateShowArchived = (value: boolean) => {
        setFilters(prev => ({ ...prev, showArchived: value }));
        setPendingFilters(prev => ({ ...prev, showArchived: value }));
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [roomsData, bedsData, pgsData] = await Promise.all([
                roomAPI.getAll(),
                bedAPI.getAll(),
                pgAPI.getAll()
            ]);
            setRooms(Array.isArray(roomsData) ? roomsData : []);
            setBeds(Array.isArray(bedsData) ? bedsData : []);
            setPgs(Array.isArray(pgsData) ? pgsData : []);
        } catch (error) {
            console.error("Failed to fetch Rooms/Beds data:", error);
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

    const handleAddRoom = () => {
        setEditingRoom(null);
        setRoomModalVisible(true);
    };

    const handleEditRoom = (room: any) => {
        setEditingRoom(room);
        setRoomModalVisible(true);
    };

    const handleDeleteRoom = async (id: string, roomNumber: string) => {
        try {
            setLoading(true);
            const { count, error } = await supabase
                .from("beds")
                .select("id", { count: "exact", head: true })
                .eq("room_id", id)
                .not("tenant_id", "is", null);

            setLoading(false);

            if (error) throw error;

            if (count && count > 0) {
                setConfirmState({
                    visible: true,
                    title: "Delete Blocked",
                    message: `Cannot delete Room ${roomNumber}. It currently has ${count} occupied or reserved bed(s). Please unassign tenants before deleting.`,
                    type: "danger",
                    singleButton: true,
                    cancelText: "Close"
                });
                return;
            }

            setConfirmState({
                visible: true,
                title: "Delete Room?",
                message: `Are you sure you want to delete Room ${roomNumber} and its beds? This action is irreversible.`,
                type: "danger",
                confirmText: "Delete Room",
                cancelText: "Cancel",
                onConfirm: async () => {
                    try {
                        setConfirmState(prev => ({ ...prev, loading: true }));
                        await roomAPI.update(id, { status: "DELETED" });
                        await supabase.from("beds").update({ status: "DELETED" }).eq("room_id", id);
                        await fetchData();
                        setConfirmState({ visible: false, title: "", message: "", type: "info" });
                        Alert.alert("Success", `Room ${roomNumber} deleted successfully`);
                    } catch (error) {
                        setConfirmState(prev => ({ ...prev, loading: false }));
                        Alert.alert("Error", "Failed to delete room");
                    }
                }
            });
        } catch (error: any) {
            setLoading(false);
            console.error("Delete room check error:", error);
            Alert.alert("Error", "Error checking room occupancy: " + error.message);
        }
    };

    // Filter Logic
    const filteredContent = useMemo(() => {
        const propertyId = filters.property;
        const showArchived = filters.showArchived;
        const matchesArchive = (status: string) =>
            showArchived ? status === "DELETED" : status !== "DELETED";

        if (viewMode === "ROOMS") {
            return rooms.filter(r => {
                const matchesSearch = (r.room_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (r.pgs?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
                const matchesPg = !propertyId || r.pg_id === propertyId;
                const matchesStatus = matchesArchive(r.status);
                return matchesSearch && matchesPg && matchesStatus;
            });
        } else {
            return beds.filter(b => {
                const matchesSearch = (b.bed_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (b.rooms?.room_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (b.tenants?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());
                const matchesPg = !propertyId || b.rooms?.pg_id === propertyId;
                const matchesStatus = matchesArchive(b.status);
                const matchesBedStatus = filters.bedStatus === "ALL" || b.status === filters.bedStatus;
                return matchesSearch && matchesPg && matchesStatus && matchesBedStatus;
            });
        }
    }, [viewMode, rooms, beds, searchTerm, filters]);

    // Stats Logic
    const stats = useMemo(() => {
        if (viewMode === "ROOMS") {
            const active = rooms.filter(r => r.status !== "DELETED");
            return [
                { label: "Total Rooms", value: active.length, icon: "door-open", type: "Material", color: COLORS.primary },
                { label: "Available", value: active.filter(r => r.status === "AVAILABLE").length, icon: "check-circle", type: "Feather", color: COLORS.success },
                { label: "Occupied", value: active.filter(r => r.status === "FULL").length, icon: "user-check", type: "Feather", color: COLORS.warning },
            ];
        } else {
            const active = beds.filter(b => b.status !== "DELETED");
            return [
                { label: "Total Beds", value: active.length, icon: "bed", type: "Material", color: COLORS.primary },
                { label: "Available", value: active.filter(b => b.status === "AVAILABLE").length, icon: "check-circle", type: "Feather", color: COLORS.success },
                { label: "Occupied", value: active.filter(b => b.status === "OCCUPIED").length, icon: "user-check", type: "Feather", color: COLORS.warning },
            ];
        }
    }, [viewMode, rooms, beds]);

    const RoomCard = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>Room {item.room_number}</Text>
                    <Text style={styles.cardSub}>
                        {item.pgs?.name || "N/A"} • {item.floor_number === 0 || item.floor_number === "0" ? "Ground Floor" : `Floor ${item.floor_number}`}
                    </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>MONTHLY RENT</Text>
                    <Text style={styles.footerValue}>₹{Number(item.monthly_rent || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>SHARING</Text>
                    <Text style={styles.footerValue}>{item.capacity} Beds</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditRoom(item)}>
                        <Feather name="edit-2" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteRoom(item.id, item.room_number)}>
                        <Feather name="trash-2" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    const BedCard = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.bed_number}</Text>
                    <Text style={styles.cardSub}>Room {item.rooms?.room_number} • {item.rooms?.pgs?.name}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.residentRow}>
                <View style={[styles.avatar, { backgroundColor: item.tenants?.full_name ? COLORS.primary + "20" : COLORS.card }]}>
                    <Feather name="user" size={16} color={item.tenants?.full_name ? COLORS.primary : COLORS.textMuted} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.residentName, { color: item.tenants?.full_name ? COLORS.text : COLORS.textMuted }]}>
                        {item.tenants?.full_name || "Vacant"}
                    </Text>
                    <Text style={styles.residentLabel}>Current Resident</Text>
                </View>
                <TouchableOpacity style={styles.maintenanceBtn}>
                    <MaterialCommunityIcons name="wrench-outline" size={16} color={COLORS.warning} />
                    <Text style={styles.maintenanceText}>Fix</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "AVAILABLE": return COLORS.success;
            case "FULL": case "OCCUPIED": return COLORS.danger;
            case "PARTIAL": return COLORS.primary;
            case "MAINTENANCE": return COLORS.warning;
            default: return COLORS.textMuted;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Rooms & Beds</Text>
                <View style={styles.toggleContainer}>
                    <View style={styles.segmentedControl}>
                        <TouchableOpacity
                            style={[styles.segment, viewMode === "ROOMS" && styles.segmentActive]}
                            onPress={() => setViewMode("ROOMS")}
                        >
                            <Text style={[styles.segmentText, viewMode === "ROOMS" && styles.segmentTextActive]}>Rooms</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segment, viewMode === "BEDS" && styles.segmentActive]}
                            onPress={() => setViewMode("BEDS")}
                        >
                            <Text style={[styles.segmentText, viewMode === "BEDS" && styles.segmentTextActive]}>Beds</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.subSegmentedControl}>
                        <TouchableOpacity
                            style={[styles.subSegment, statusMode === "ACTIVE" && styles.subSegmentActive]}
                            onPress={() => updateShowArchived(false)}
                        >
                            <Text style={[styles.subSegmentText, statusMode === "ACTIVE" && styles.subSegmentTextActive]}>Available</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subSegment, statusMode === "ARCHIVED" && styles.subSegmentActive]}
                            onPress={() => updateShowArchived(true)}
                        >
                            <Text style={[styles.subSegmentText, statusMode === "ARCHIVED" && styles.subSegmentTextActive]}>Archived</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Content with FlatList */}
            <FlatList
                data={filteredContent}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => viewMode === "ROOMS" ? <RoomCard item={item} /> : <BedCard item={item} />}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListHeaderComponent={
                    <>
                        {/* Horizontal Stats */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.statsScroll}
                            contentContainerStyle={styles.statsContent}
                        >
                            {stats.map((stat, idx) => (
                                <View key={idx} style={styles.statCard}>
                                    <View style={[styles.statIcon, { backgroundColor: stat.color + "15" }]}>
                                        {stat.type === "Material" ? (
                                            <MaterialCommunityIcons name={stat.icon as any} size={20} color={stat.color} />
                                        ) : (
                                            <Feather name={stat.icon as any} size={20} color={stat.color} />
                                        )}
                                    </View>
                                    <View>
                                        <Text style={styles.statValue}>{stat.value}</Text>
                                        <Text style={styles.statLabel}>{stat.label}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        {/* Search Row with Filter button */}
                        <View style={styles.filterSection}>
                            <View style={styles.searchBar}>
                                <Feather name="search" size={18} color={COLORS.textMuted} />
                                <TextInput
                                    placeholder={viewMode === "ROOMS" ? "Search room or property..." : "Search bed, room or tenant..."}
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
                            <TouchableOpacity
                                style={styles.filterButton}
                                onPress={() => {
                                    setPendingFilters({ ...filters });
                                    setFilterSheetVisible(true);
                                }}
                            >
                                <Feather name="sliders" size={18} color="#fff" />
                                <Text style={styles.filterButtonText}>Filter</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator color={COLORS.primary} size="large" />
                        ) : (
                            <>
                                <Feather name="box" size={48} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>No {viewMode.toLowerCase()} found</Text>
                            </>
                        )}
                    </View>
                }
            />

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title={`${viewMode} Filters`}
                description={viewMode === "ROOMS" ? "Filter by property" : "Filter by property and status"}
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    const applied = { ...pendingFilters };
                    setFilters(applied);
                    setPendingFilters(applied);
                    setFilterSheetVisible(false);
                }}
                onReset={() => {
                    const defaults = createDefaultRoomFilters();
                    setFilters(defaults);
                    setPendingFilters(defaults);
                    setFilterSheetVisible(false);
                }}
                applyLabel="Apply"
                resetLabel="Reset"
            >
                <DropdownSelector
                    label="Property"
                    options={[
                        { label: "All Properties", value: "" },
                        ...pgs.map(pg => ({ label: pg.name, value: pg.id }))
                    ]}
                    value={pendingFilters.property || ""}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, property: value || null }))}
                    placeholder="Select property..."
                />
                {viewMode === "BEDS" && (
                    <DropdownSelector
                        label="Status"
                        options={[
                            { label: "All Status", value: "ALL" },
                            { label: "Available", value: "AVAILABLE" },
                            { label: "Occupied", value: "OCCUPIED" },
                            { label: "Maintenance", value: "MAINTENANCE" }
                        ]}
                        value={pendingFilters.bedStatus}
                        onChange={(value) => setPendingFilters(prev => ({ ...prev, bedStatus: value }))}
                        placeholder="Select status..."
                    />
                )}
            </FilterBottomSheet>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={handleAddRoom}
            >
                <Feather name="plus" size={24} color="#fff" />
                <Text style={styles.fabText}>Add Room</Text>
            </TouchableOpacity>

            <RoomFormModal
                visible={roomModalVisible}
                onClose={() => setRoomModalVisible(false)}
                onSuccess={fetchData}
                editingRoom={editingRoom}
                initialPgId={filters.property || undefined}
            />

            <ConfirmationModal
                visible={confirmState.visible}
                onClose={() => setConfirmState(prev => ({ ...prev, visible: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                loading={confirmState.loading}
                singleButton={confirmState.singleButton}
            />
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        header: { padding: 20, paddingBottom: 10 },
        headerTitle: { fontSize: 24, fontWeight: "900", color: COLORS.text, marginBottom: 20 },
        toggleContainer: { gap: 12 },
        segmentedControl: {
            flexDirection: "row",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 14,
            padding: 4
        },
        segment: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
        segmentActive: { backgroundColor: COLORS.primary },
        segmentText: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted },
        segmentTextActive: { color: "#fff" },

        subSegmentedControl: { flexDirection: "row", gap: 8 },
        subSegment: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        subSegmentActive: { backgroundColor: "rgba(59, 130, 246, 0.1)", borderColor: COLORS.primary },
        subSegmentText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
        subSegmentTextActive: { color: COLORS.primary },

        statsScroll: { marginVertical: 20, paddingLeft: 20 },
        statsContent: { paddingRight: 40 },
        statCard: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            padding: 16,
            borderRadius: 20,
            marginRight: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            minWidth: 140
        },
        statIcon: {
            width: 36,
            height: 36,
            borderRadius: 10,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12
        },
        statValue: { fontSize: 18, fontWeight: "800", color: COLORS.text },
        statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700", textTransform: "uppercase" },

        filterSection: {
            paddingHorizontal: 20,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10
        },
        searchBar: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderRadius: 14,
            paddingHorizontal: 16,
            height: 48,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        searchInput: { flex: 1, marginLeft: 12, color: COLORS.text, fontWeight: "600", fontSize: 14 },
        filterButton: {
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 14,
            backgroundColor: COLORS.primary,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        filterButtonText: {
            color: "#fff",
            fontWeight: "700",
            fontSize: 14,
        },
        sheetSection: { marginBottom: 18 },
        sheetLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
        sheetChipsRow: { gap: 8 },
        sheetChip: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 14,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginRight: 10,
            minWidth: 100,
        },
        sheetChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
        sheetChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
        sheetChipTextActive: { color: "#fff" },
        sheetStatusRow: { flexDirection: "row", gap: 10 },
        sheetStatusOption: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            backgroundColor: COLORS.card,
        },
        sheetStatusOptionActive: {
            borderColor: COLORS.primary,
            backgroundColor: COLORS.primary + "15",
        },
        sheetStatusText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
        sheetStatusTextActive: { color: COLORS.primary },

        listContent: { paddingBottom: 100 },
        card: {
            backgroundColor: COLORS.card,
            marginHorizontal: 20,
            padding: 18,
            borderRadius: 22,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
        cardInfo: { flex: 1 },
        cardTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
        cardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: "600" },
        badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
        badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },

        divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },

        cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 8 },
        footerItem: { flex: 1 },
        footerLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: "700", marginBottom: 4 },
        footerValue: { fontSize: 14, fontWeight: "800", color: COLORS.text },
        actions: { flexDirection: "row", gap: 8 },
        actionBtn: {
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.03)",
            justifyContent: "center",
            alignItems: "center"
        },

        residentRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
        avatar: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
        residentName: { fontSize: 14, fontWeight: "700" },
        residentLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },
        maintenanceBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10
        },
        maintenanceText: { color: COLORS.warning, fontSize: 11, fontWeight: "800" },

        emptyContainer: { alignItems: "center", marginTop: 40, gap: 16 },
        emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "600" },

        fab: {
            position: "absolute",
            bottom: 30,
            right: 20,
            flexDirection: "row",
            paddingHorizontal: 20,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.primary,
            justifyContent: "center",
            alignItems: "center",
            elevation: 8,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            gap: 10
        },
        fabText: { color: "#fff", fontWeight: "800", fontSize: 14 }
    });

export default RoomsScreen;
