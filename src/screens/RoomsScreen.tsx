import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ConfirmationModal from "../components/common/ConfirmationModal";
import DropdownSelector from "../components/common/DropdownSelector";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import MaintenanceModal from "../components/modals/MaintenanceModal";
import RoomFormModal from "../components/modals/RoomFormModal";
import { useData } from "../context/DataContext";
import useThemePalette from "../hooks/useThemePalette";
import { roomAPI } from "../services/api";
import { generateDeleteCode } from "../utils/security";

const { width } = Dimensions.get("window");

const createDefaultRoomFilters = () => ({
    property: null as string | null,
    showArchived: false,
    bedStatus: "ALL",
});

const RoomsScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const isFocused = useIsFocused();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [viewMode, setViewMode] = useState<"ROOMS" | "BEDS">("ROOMS");
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState(createDefaultRoomFilters());
    const [pendingFilters, setPendingFilters] = useState(createDefaultRoomFilters());
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<any>(null);
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
        needsInput?: boolean;
        inputPlaceholder?: string;
    }>({
        visible: false,
        title: "",
        message: "",
        type: "info"
    });

    const [confirmInput, setConfirmInput] = useState("");
    const [confirmTargetCode, setConfirmTargetCode] = useState("");

    const updateShowArchived = (value: boolean) => {
        setFilters(prev => ({ ...prev, showArchived: value }));
        setPendingFilters(prev => ({ ...prev, showArchived: value }));
    };

    // ─── DataContext ─────────────────────────────────────────────────────
    const { rooms: ctxRooms, beds: ctxBeds, pgs: ctxPgs, loading, refresh } = useData();
    const [rooms, setRooms] = useState<any[]>(ctxRooms);
    const [beds, setBeds] = useState<any[]>(ctxBeds);
    const [pgs, setPgs] = useState<any[]>(ctxPgs);
    const onRefresh = () => refresh();

    // Sync local state with context data
    useEffect(() => { setRooms(ctxRooms); }, [ctxRooms]);
    useEffect(() => { setBeds(ctxBeds); }, [ctxBeds]);
    useEffect(() => { setPgs(ctxPgs); }, [ctxPgs]);

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
            const room = rooms.find((r: any) => r.id === id);
            const count = room?.current_occupancy || 0;

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

            const deleteCode = generateDeleteCode();
            setConfirmTargetCode(deleteCode);
            setConfirmInput("");

            setConfirmState({
                visible: true,
                title: "Delete Room & Beds?",
                message: `Are you sure you want to delete Room ${roomNumber} and ALL its beds? This will also remove historical assignments. This action is irreversible.`,
                type: "danger",
                confirmText: "Delete Room Now",
                cancelText: "Cancel",
                needsInput: true,
                inputPlaceholder: `Type "${deleteCode}" to confirm`,
                onConfirm: async () => {
                    try {
                        setConfirmState(prev => ({ ...prev, loading: true }));
                        await roomAPI.delete(id);
                        refresh();
                        setConfirmState({ visible: false, title: "", message: "", type: "info" });
                        setConfirmInput("");
                        setConfirmTargetCode("");
                    } catch (error) {
                        setConfirmState(prev => ({ ...prev, loading: false }));
                        Alert.alert("Error", "Failed to delete room");
                    }
                }
            });
        } catch (error: any) {
            console.error("Delete room check error:", error);
            Alert.alert("Error", "Error checking room occupancy: " + error.message);
        }
    };

    const filteredContent = useMemo(() => {
        const propertyId = filters.property;
        const showArchived = filters.showArchived;

        const isArchivedRoom = (r: any) =>
            r.status === "MAINTENANCE" || r.status === "INACTIVE" ||
            r.pgs?.status === "INACTIVE" || r.pgs?.status === "DELETED";

        const isArchivedBed = (b: any) =>
            b.status === "MAINTENANCE" || b.status === "INACTIVE" ||
            b.rooms?.status === "MAINTENANCE" || b.rooms?.status === "INACTIVE" ||
            b.rooms?.pgs?.status === "INACTIVE" || b.rooms?.pgs?.status === "DELETED" ||
            b.pgs?.status === "INACTIVE" || b.pgs?.status === "DELETED";

        if (viewMode === "ROOMS") {
            return rooms.filter(r => {
                const matchesSearch = (r.room_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (r.pgs?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
                const matchesPg = !propertyId || r.pg_id === propertyId;
                const matchesStatus = showArchived ? isArchivedRoom(r) : !isArchivedRoom(r);
                return matchesSearch && matchesPg && matchesStatus;
            });
        } else {
            return beds.filter(b => {
                const matchesSearch = (b.bed_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (b.rooms?.room_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (b.tenants?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());
                const matchesPg = !propertyId || b.rooms?.pg_id === propertyId;
                const matchesStatus = showArchived ? isArchivedBed(b) : !isArchivedBed(b);
                const matchesBedStatus = filters.bedStatus === "ALL" || b.status === filters.bedStatus;
                return matchesSearch && matchesPg && matchesStatus && matchesBedStatus;
            });
        }
    }, [viewMode, rooms, beds, searchTerm, filters]);

    const stats = useMemo(() => {
        const isArchiveR = (r: any) => r.status === "MAINTENANCE" || r.status === "INACTIVE" || r.pgs?.status === "INACTIVE" || r.pgs?.status === "DELETED";
        const isArchiveB = (b: any) => b.status === "MAINTENANCE" || b.status === "INACTIVE" || b.rooms?.status === "MAINTENANCE" || b.rooms?.status === "INACTIVE" || b.rooms?.pgs?.status === "INACTIVE" || b.rooms?.pgs?.status === "DELETED" || b.pgs?.status === "INACTIVE" || b.pgs?.status === "DELETED";

        if (viewMode === "ROOMS") {
            const active = rooms.filter(r => !isArchiveR(r));
            return [
                { label: "Rooms", value: active.length, icon: "door-open", type: "Material", color: COLORS.primary },
                { label: "Available", value: active.filter(r => r.status === "AVAILABLE").length, icon: "check-circle", type: "Feather", color: COLORS.success },
                { label: "Full", value: active.filter(r => r.status === "FULL").length, icon: "user-check", type: "Feather", color: COLORS.warning },
            ];
        } else {
            const active = beds.filter(b => !isArchiveB(b));
            return [
                { label: "Beds", value: active.length, icon: "bed", type: "Material", color: COLORS.primary },
                { label: "Available", value: active.filter(b => b.status === "AVAILABLE").length, icon: "check-circle", type: "Feather", color: COLORS.success },
                { label: "Occupied", value: active.filter(b => b.status === "OCCUPIED").length, icon: "user-check", type: "Feather", color: COLORS.warning },
            ];
        }
    }, [viewMode, rooms, beds, COLORS]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "AVAILABLE": return COLORS.success;
            case "FULL": case "OCCUPIED": return COLORS.danger;
            case "PARTIAL": return COLORS.primary;
            case "MAINTENANCE": return COLORS.warning;
            default: return COLORS.textMuted;
        }
    };

    const RoomCard = ({ item }: { item: any }) => (
        <View style={styles.roomCard}>
            <View style={styles.cardTop}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.roomNumber}>Room {item.room_number}</Text>
                    <Text style={styles.pgName} numberOfLines={1}>
                        {item.pgs?.name || "N/A"} • {item.floor === 0 || item.floor === "0" ? "Ground Floor" : `Floor ${item.floor}`}
                    </Text>
                </View>
                <View style={[styles.miniBadge, { backgroundColor: getStatusColor(item.status) + "12" }]}>
                    <Text style={[styles.miniBadgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                    <Feather name="credit-card" size={12} color={COLORS.textMuted} />
                    <Text style={styles.detailValue}>₹{Number(item.rent || 0).toLocaleString()}/mo</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="account-group-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailValue}>{item.capacity} Sharing</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.footerAction} onPress={() => handleEditRoom(item)}>
                    <Feather name="edit-2" size={14} color={COLORS.primary} />
                    <Text style={styles.footerActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerAction} onPress={() => handleDeleteRoom(item.id, item.room_number)}>
                    <Feather name="trash-2" size={14} color={COLORS.danger} />
                    <Text style={[styles.footerActionText, { color: COLORS.danger }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const BedCard = ({ item }: { item: any }) => (
        <View style={styles.roomCard}>
            <View style={styles.cardTop}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.roomNumber}>{item.bed_number}</Text>
                    <Text style={styles.pgName}>Room {item.rooms?.room_number} • {item.rooms?.pgs?.name}</Text>
                </View>
                <View style={[styles.miniBadge, { backgroundColor: getStatusColor(item.status) + "12" }]}>
                    <Text style={[styles.miniBadgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.residentSection}>
                <View style={[styles.residentAvatar, { backgroundColor: item.tenants?.full_name ? COLORS.primary + "12" : COLORS.bg }]}>
                    <Feather name="user" size={14} color={item.tenants?.full_name ? COLORS.primary : COLORS.textMuted} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.residentName, !item.tenants?.full_name && { color: COLORS.textMuted }]}>
                        {item.tenants?.full_name || "Unoccupied"}
                    </Text>
                    <Text style={styles.residentSub}>Current Resident</Text>
                </View>
                {item.status !== "MAINTENANCE" && (
                    <TouchableOpacity
                        style={styles.fixButton}
                        onPress={() => {
                            setSelectedEntity({
                                id: item.id,
                                type: 'BED',
                                pg_id: item.rooms?.pg_id,
                                bed_number: item.bed_number,
                                pg_name: item.rooms?.pgs?.name
                            });
                            setMaintenanceModalVisible(true);
                        }}
                    >
                        <Feather name="tool" size={12} color={COLORS.warning} />
                        <Text style={styles.fixButtonText}>Fix</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Compact Top App Bar */}
            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.appBarButton}>
                    <Feather name="menu" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Rooms & Beds</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                    <Feather name="refresh-cw" size={18} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredContent}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => viewMode === "ROOMS" ? <RoomCard item={item} /> : <BedCard item={item} />}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListHeaderComponent={
                    <View>
                        {/* Segmented Controls */}
                        <View style={styles.controlsHeader}>
                            <View style={styles.viewSegmentedControl}>
                                <TouchableOpacity
                                    style={[styles.viewSegment, viewMode === "ROOMS" && styles.viewSegmentActive]}
                                    onPress={() => setViewMode("ROOMS")}
                                >
                                    <Text style={[styles.viewSegmentText, viewMode === "ROOMS" && styles.viewSegmentTextActive]}>Rooms</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.viewSegment, viewMode === "BEDS" && styles.viewSegmentActive]}
                                    onPress={() => setViewMode("BEDS")}
                                >
                                    <Text style={[styles.viewSegmentText, viewMode === "BEDS" && styles.viewSegmentTextActive]}>Beds</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.filterChipsRow}>
                                <TouchableOpacity
                                    style={[styles.filterChip, !filters.showArchived && styles.filterChipActive]}
                                    onPress={() => updateShowArchived(false)}
                                >
                                    <Text style={[styles.filterChipText, !filters.showArchived && styles.filterChipTextActive]}>Available</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterChip, filters.showArchived && styles.filterChipActive]}
                                    onPress={() => updateShowArchived(true)}
                                >
                                    <Text style={[styles.filterChipText, filters.showArchived && styles.filterChipTextActive]}>Archived</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Visual Stats Row */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
                            {stats.map((stat, idx) => (
                                <View key={idx} style={styles.miniStatCard}>
                                    <View style={[styles.miniStatIcon, { backgroundColor: stat.color + "12" }]}>
                                        {stat.type === "Material" ? (
                                            <MaterialCommunityIcons name={stat.icon as any} size={16} color={stat.color} />
                                        ) : (
                                            <Feather name={stat.icon as any} size={16} color={stat.color} />
                                        )}
                                    </View>
                                    <View>
                                        <Text style={styles.miniStatValue}>{stat.value}</Text>
                                        <Text style={styles.miniStatLabel}>{stat.label}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        {/* Search Section */}
                        <View style={styles.searchSection}>
                            <View style={styles.searchBox}>
                                <Feather name="search" size={18} color={COLORS.textMuted} />
                                <TextInput
                                    placeholder={viewMode === "ROOMS" ? "Search room or property..." : "Search bed, room or tenant..."}
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
                                    onPress={() => {
                                        setPendingFilters({ ...filters });
                                        setFilterSheetVisible(true);
                                    }}
                                >
                                    <Feather
                                        name="sliders"
                                        size={18}
                                        color={filters.property ? COLORS.primary : COLORS.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyView}>
                            <View style={styles.emptyIconCircle}>
                                <Feather name="box" size={40} color={COLORS.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>No {viewMode.toLowerCase()} found</Text>
                        </View>
                    ) : (
                        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
                    )
                }
            />

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title={`${viewMode} Filters`}
                description={viewMode === "ROOMS" ? "Filter by property" : "Filter by property and status"}
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    setFilters(pendingFilters);
                    setFilterSheetVisible(false);
                }}
                onReset={() => {
                    const defaults = createDefaultRoomFilters();
                    setFilters(defaults);
                    setPendingFilters(defaults);
                    setFilterSheetVisible(false);
                }}
            >
                <DropdownSelector
                    label="Property"
                    options={[
                        { label: "All Properties", value: "" },
                        ...pgs.map(pg => ({ label: pg.name, value: pg.id }))
                    ]}
                    value={pendingFilters.property || ""}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, property: value || null }))}
                />
                {viewMode === "BEDS" && (
                    <DropdownSelector
                        label="Bed Status"
                        options={["ALL", "AVAILABLE", "OCCUPIED", "MAINTENANCE"].map(s => ({
                            label: s.charAt(0) + s.slice(1).toLowerCase(),
                            value: s
                        }))}
                        value={pendingFilters.bedStatus}
                        onChange={(value) => setPendingFilters(prev => ({ ...prev, bedStatus: value }))}
                    />
                )}
            </FilterBottomSheet>

            {/* Styled FAB */}
            <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={handleAddRoom}>
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>

            <RoomFormModal
                visible={roomModalVisible}
                onClose={() => setRoomModalVisible(false)}
                onSuccess={refresh}
                editingRoom={editingRoom}
                initialPgId={filters.property || undefined}
            />

            <MaintenanceModal
                visible={maintenanceModalVisible}
                onClose={() => setMaintenanceModalVisible(false)}
                onSuccess={refresh}
                editingRequest={selectedEntity ? {
                    entity_type: selectedEntity.type,
                    entity_id: selectedEntity.id,
                    pg_id: selectedEntity.pg_id,
                    description: `Issue reported for ${selectedEntity.type} ${selectedEntity.type === 'BED' ? selectedEntity.bed_number : ''}`,
                } : null}
            />

            <ConfirmationModal
                visible={confirmState.visible}
                onClose={() => {
                    setConfirmState(prev => ({ ...prev, visible: false }));
                    setConfirmInput("");
                }}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                loading={confirmState.loading}
                singleButton={confirmState.singleButton}
                needsInput={confirmState.needsInput}
                inputPlaceholder={confirmState.inputPlaceholder}
                inputValue={confirmInput}
                onInputChange={setConfirmInput}
                disableOutsideTap={confirmState.type === "danger"}
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

        // Controls
        controlsHeader: { padding: 16, gap: 12 },
        viewSegmentedControl: {
            flexDirection: 'row',
            backgroundColor: COLORS.card,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        viewSegment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
        viewSegmentActive: { backgroundColor: COLORS.primary },
        viewSegmentText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
        viewSegmentTextActive: { color: '#fff' },

        filterChipsRow: { flexDirection: 'row', gap: 8 },
        filterChip: {
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: COLORS.card,
        },
        filterChipActive: { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary },
        filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
        filterChipTextActive: { color: COLORS.primary },

        // Stats
        statsRow: { paddingLeft: 16, marginBottom: 16, paddingRight: 40 },
        miniStatCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.card,
            padding: 12,
            borderRadius: 14,
            marginRight: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
            minWidth: 110,
        },
        miniStatIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
        miniStatValue: { fontSize: 16, fontWeight: '900', color: COLORS.text },
        miniStatLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase' },

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

        // Real Cards
        listContent: { paddingBottom: 100 },
        roomCard: {
            backgroundColor: COLORS.card,
            borderRadius: 14,
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 2,
        },
        cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
        cardHeaderLeft: { flex: 1, marginRight: 12 },
        roomNumber: { fontSize: 18, fontWeight: '900', color: COLORS.text },
        pgName: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
        miniBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
        miniBadgeText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },

        cardDetails: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: COLORS.border + '40',
            marginBottom: 12
        },
        detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        detailValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
        detailDivider: { width: 12 },

        cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
        footerAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        footerActionText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

        residentSection: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 12,
            borderTopWidth: 1,
            borderColor: COLORS.border + '40'
        },
        residentAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
        residentName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
        residentSub: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
        fixButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: COLORS.warning + '12',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6
        },
        fixButtonText: { fontSize: 10, fontWeight: '800', color: COLORS.warning },

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
        emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
        emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    });

export default RoomsScreen;
