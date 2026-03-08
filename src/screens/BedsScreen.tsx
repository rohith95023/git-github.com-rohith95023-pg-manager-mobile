import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
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
import useThemePalette from "../hooks/useThemePalette";
import { bedAPI, pgAPI } from "../services/api";

const { width } = Dimensions.get("window");

const DEFAULT_BED_FILTERS = {
    propertyId: "",
    status: "ALL",
};

const BED_STATUS_OPTIONS = [
    { label: "All Status", value: "ALL" },
    { label: "Available", value: "AVAILABLE" },
    { label: "Occupied", value: "OCCUPIED" },
    { label: "Maintenance", value: "MAINTENANCE" }
];

const BedsScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    // Data State
    const [beds, setBeds] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    // Filters State
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState(DEFAULT_BED_FILTERS);
    const [pendingFilters, setPendingFilters] = useState(DEFAULT_BED_FILTERS);
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);

    // Stats State
    const [stats, setStats] = useState({
        totalBeds: 0,
        available: 0,
        occupied: 0,
        maintenance: 0
    });

    // Confirmation Modal State
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

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Initial fetch for properties
    useEffect(() => {
        const fetchPgs = async () => {
            const data = await pgAPI.getActive();
            setPgs(Array.isArray(data) ? data : []);
        };
        fetchPgs();
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const data: any = await bedAPI.getStats({ propertyId: filters.propertyId });

            if (data) {
                setStats({
                    totalBeds: data.total || 0,
                    available: data.available || 0,
                    occupied: data.occupied || 0,
                    maintenance: data.maintenance || 0
                });
            }
        } catch (error) {
            console.error("Failed to fetch Bed stats:", error);
        }
    }, [filters.propertyId]);

    const loadBeds = useCallback(async (pageNum = 1, shouldAppend = false) => {
        if (loading || loadingMore) return;

        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const { data, count } = (await bedAPI.search({
                page: pageNum,
                limit: 10,
                search: debouncedSearch,
                status: filters.status,
                pgId: filters.propertyId
            })) as any;

            const bedList = data || [];
            if (shouldAppend) {
                setBeds(prev => [...prev, ...bedList]);
            } else {
                setBeds(bedList);
            }

            setTotalCount(count || 0);
            setHasMore(bedList.length === 10);
            setPage(pageNum);

            // Also refresh stats
            fetchStats();
        } catch (error) {
            console.error("Failed to load Beds:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [debouncedSearch, filters, fetchStats]);

    useEffect(() => {
        loadBeds(1, false);
    }, [debouncedSearch, filters]);

    const onRefresh = () => {
        setRefreshing(true);
        loadBeds(1, false);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            loadBeds(page + 1, true);
        }
    };

    const toggleBedStatus = async (bed: any) => {
        if (bed.status === "OCCUPIED") {
            setConfirmState({
                visible: true,
                title: "Action Blocked",
                message: "Cannot change status of an OCCUPIED bed. Please vacate the resident first.",
                type: "danger",
                singleButton: true,
                cancelText: "Got It"
            });
            return;
        }

        const newStatus = bed.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE";
        const actionLabel = newStatus === "MAINTENANCE" ? "Move to Maintenance" : "Make Available";

        setConfirmState({
            visible: true,
            title: actionLabel + "?",
            message: `Are you sure you want to mark Bed ${bed.bed_number} as ${newStatus}?`,
            type: "warning",
            confirmText: "Yes, Update",
            cancelText: "Cancel",
            onConfirm: async () => {
                try {
                    setConfirmState(prev => ({ ...prev, loading: true }));
                    await bedAPI.update(bed.id, { status: newStatus });
                    setConfirmState({ visible: false, title: "", message: "", type: "info" });
                    // Real-time will handle the list refresh, but we handle it just in case
                } catch (error: any) {
                    setConfirmState(prev => ({ ...prev, loading: false }));
                    Alert.alert("Error", error.message || "Failed to update bed status");
                }
            }
        });
    };

    // Deletion Code State
    const [confirmInput, setConfirmInput] = useState("");
    const [confirmTargetCode, setConfirmTargetCode] = useState("");

    const handleDeleteBed = async (bed: any) => {
        if (bed.status === "OCCUPIED") {
            setConfirmState({
                visible: true,
                title: "Deletion Blocked",
                message: "Cannot delete an OCCUPIED bed. Please vacate the resident first.",
                type: "danger",
                singleButton: true,
                cancelText: "Close"
            });
            return;
        }

        const deleteCode = Math.floor(1000 + Math.random() * 9000).toString();
        setConfirmTargetCode(deleteCode);
        setConfirmInput("");

        setConfirmState({
            visible: true,
            title: "Delete Bed?",
            message: `Are you sure you want to PERMANENTLY delete Bed ${bed.bed_number}? This action is irreversible.`,
            type: "danger",
            confirmText: "Delete Bed Now",
            cancelText: "Cancel",
            needsInput: true,
            inputPlaceholder: `Type "${deleteCode}" to confirm`,
            onConfirm: async () => {
                try {
                    setConfirmState(prev => ({ ...prev, loading: true }));
                    await bedAPI.delete(bed.id);
                    setConfirmState({ visible: false, title: "", message: "", type: "info" });
                    setConfirmInput("");
                    setConfirmTargetCode("");
                } catch (error: any) {
                    setConfirmState(prev => ({ ...prev, loading: false }));
                    Alert.alert("Error", error.message || "Failed to delete bed");
                }
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "AVAILABLE": return COLORS.success;
            case "OCCUPIED": return COLORS.danger;
            case "MAINTENANCE": return COLORS.warning;
            default: return COLORS.textMuted;
        }
    };

    const BedCard = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.bed_number}</Text>
                    <Text style={styles.cardSub}>
                        {item.rooms?.pgs?.name || "N/A"} • Room {item.rooms?.room_number} • {item.rooms?.floor === 0 ? "Ground Floor" : `Floor ${item.rooms?.floor}`}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                        <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteBed(item)} style={styles.deleteBtn}>
                        <Feather name="trash-2" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardContent}>
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

                    <TouchableOpacity
                        style={[styles.statusToggle, { borderColor: getStatusColor(item.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE') + '40' }]}
                        onPress={() => toggleBedStatus(item)}
                    >
                        <MaterialCommunityIcons
                            name={item.status === 'AVAILABLE' ? 'wrench-clock' : 'check-circle-outline'}
                            size={18}
                            color={item.status === 'AVAILABLE' ? COLORS.warning : COLORS.success}
                        />
                        <Text style={[styles.toggleText, { color: item.status === 'AVAILABLE' ? COLORS.warning : COLORS.success }]}>
                            {item.status === 'AVAILABLE' ? 'MAINTENANCE' : 'FIX BED'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={beds}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <BedCard item={item} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Beds Inventory</Text>

                        {/* KPI Cards */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
                                <Text style={styles.statValue}>{stats.totalBeds}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>
                            <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
                                <Text style={styles.statValue}>{stats.available}</Text>
                                <Text style={styles.statLabel}>Available</Text>
                            </View>
                            <View style={[styles.statCard, { borderLeftColor: COLORS.danger }]}>
                                <Text style={styles.statValue}>{stats.occupied}</Text>
                                <Text style={styles.statLabel}>Occupied</Text>
                            </View>
                            <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
                                <Text style={styles.statValue}>{stats.maintenance}</Text>
                                <Text style={styles.statLabel}>Service</Text>
                            </View>
                        </View>

                        {/* Search & Filter */}
                        <View style={styles.searchRow}>
                            <View style={styles.searchBar}>
                                <Feather name="search" size={18} color={COLORS.textMuted} />
                                <TextInput
                                    placeholder="Search bed, room or resident..."
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
                                style={styles.filterBtn}
                                onPress={() => {
                                    setPendingFilters({ ...filters });
                                    setFilterSheetVisible(true);
                                }}
                            >
                                <Ionicons name="filter" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                ListFooterComponent={
                    loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.primary} /> : <View style={{ height: 40 }} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyBox}>
                            <Feather name="box" size={48} color={COLORS.textMuted} alpha={0.5} />
                            <Text style={styles.emptyText}>No beds found matching criteria</Text>
                        </View>
                    ) : null
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            />

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="Beds Management Filters"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    setFilters(pendingFilters);
                    setFilterSheetVisible(false);
                }}
                onReset={() => {
                    setPendingFilters(DEFAULT_BED_FILTERS);
                    setFilters(DEFAULT_BED_FILTERS);
                    setFilterSheetVisible(false);
                }}
            >
                <DropdownSelector
                    label="Property"
                    options={[
                        { label: "All Properties", value: "" },
                        ...pgs.map(p => ({ label: p.name, value: p.id }))
                    ]}
                    value={pendingFilters.propertyId}
                    onChange={(val) => setPendingFilters(prev => ({ ...prev, propertyId: val }))}
                />
                <DropdownSelector
                    label="Status"
                    options={BED_STATUS_OPTIONS}
                    value={pendingFilters.status}
                    onChange={(val) => setPendingFilters(prev => ({ ...prev, status: val }))}
                />
            </FilterBottomSheet>

            <ConfirmationModal
                visible={confirmState.visible}
                onClose={() => {
                    setConfirmState(prev => ({ ...prev, visible: false }));
                    setConfirmInput("");
                    setConfirmTargetCode("");
                }}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                loading={confirmState.loading}
                singleButton={confirmState.singleButton}
                needsInput={!!confirmTargetCode}
                inputPlaceholder={`Type "${confirmTargetCode}" to confirm`}
                inputValue={confirmInput}
                onInputChange={(val) => setConfirmInput(val)}
                confirmDisabled={!!confirmTargetCode && confirmInput !== confirmTargetCode}
            />
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        header: { padding: 20 },
        headerTitle: { fontSize: 24, fontWeight: "900", color: COLORS.text, marginBottom: 20 },

        statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
        statCard: {
            width: "48%",
            backgroundColor: COLORS.card,
            padding: 16,
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderLeftWidth: 4,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        statValue: { fontSize: 20, fontWeight: "900", color: COLORS.text },
        statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "800", textTransform: "uppercase", marginTop: 2 },

        searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
        searchBar: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderRadius: 14,
            paddingHorizontal: 16,
            height: 52,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        searchInput: { flex: 1, marginLeft: 12, color: COLORS.text, fontWeight: "600", fontSize: 14 },
        filterBtn: {
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: COLORS.primary,
            justifyContent: "center",
            alignItems: "center",
            elevation: 4
        },

        card: {
            backgroundColor: COLORS.card,
            marginHorizontal: 20,
            padding: 20,
            borderRadius: 24,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
        cardTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
        cardSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: "600" },
        badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
        badgeText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },

        divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },

        cardContent: {},
        residentRow: { flexDirection: "row", alignItems: "center" },
        avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
        residentName: { fontSize: 15, fontWeight: "800" },
        residentLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700", marginTop: 2 },

        statusToggle: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: "rgba(255,255,255,0.02)"
        },
        deleteBtn: {
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: "rgba(255,22,22,0.05)",
            justifyContent: "center",
            alignItems: "center"
        },
        toggleText: { fontSize: 11, fontWeight: "900", textTransform: "uppercase" },

        emptyBox: { alignItems: "center", marginTop: 60, gap: 16, opacity: 0.6 },
        emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "700" }
    });

export default BedsScreen;
