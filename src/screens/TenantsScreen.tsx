import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Linking,
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
import ScreenHeader from "../components/common/ScreenHeader";
import UnifiedStayManager from "../components/modals/UnifiedStayManager";
import { useRefreshOnForeground } from "../hooks/useRefreshOnForeground";
import useThemePalette from "../hooks/useThemePalette";
import { bedAPI, pgAPI, roomAPI, tenantAPI } from "../services/api";
import NotificationService from "../services/NotificationService";
import { generateDeleteCode } from "../utils/security";

const { width } = Dimensions.get("window");

const RESIDENT_STATUS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE", "OVERDUE"];
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
    const isFocused = useIsFocused();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [tenants, setTenants] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const loadingRef = React.useRef(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState(createDefaultTenantFilters());
    const [pendingFilters, setPendingFilters] = useState(createDefaultTenantFilters());
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);
    const [sheetFloorOptions, setSheetFloorOptions] = useState<any[]>([]);
    const [sheetRoomOptions, setSheetRoomOptions] = useState<any[]>([]);
    const [highlightProperty, setHighlightProperty] = useState(false);
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
        onClose?: () => void;
        needsInput?: boolean;
        inputPlaceholder?: string;
        secondaryText?: string;
        onSecondary?: () => void;
    }>({
        visible: false,
        title: "",
        message: "",
        type: "info"
    });

    const [confirmInput, setConfirmInput] = useState("");
    const [confirmTargetCode, setConfirmTargetCode] = useState("");
    const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);

    // Onboarding Modal State
    const [isOnboardingVisible, setOnboardingVisible] = useState(false);
    const [editingTenant, setEditingTenant] = useState<any>(null);

    const handleAddTenant = () => {
        setEditingTenant(null);
        setOnboardingVisible(true);
    };

    const handleEditTenant = (tenant: any) => {
        setEditingTenant(tenant);
        setOnboardingVisible(true);
    };

    const handleDeleteTenant = async (tenant: any) => {
        const balance = tenant.outstanding_balance || 0;

        if (balance > 0) {
            setConfirmState({
                visible: true,
                title: "Deletion Blocked",
                message: `Cannot delete resident with pending dues (₹${balance}).`,
                type: "danger",
                singleButton: true,
                confirmText: "Close",
                secondaryText: "Pay Due",
                onSecondary: () => {
                    setConfirmState(prev => ({ ...prev, visible: false }));
                    navigation.navigate("Finance", { tenantId: tenant.id });
                }
            });
            return;
        }

        const deleteCode = generateDeleteCode();
        setConfirmTargetCode(deleteCode);
        setConfirmInput("");

        setConfirmState({
            visible: true,
            title: "Delete Resident Permanently?",
            message: `You are about to PERMANENTLY delete ${tenant.full_name} and free their bed. This action is irreversible.`,
            type: "danger",
            confirmText: "Yes, Delete Resident",
            cancelText: "Cancel",
            needsInput: true,
            inputPlaceholder: `Type "${deleteCode}" to confirm`,
            onConfirm: async () => {
                try {
                    setConfirmState(prev => ({ ...prev, loading: true }));
                    if (tenant.bed_id) {
                        await bedAPI.update(tenant.bed_id, { status: "AVAILABLE", tenant_id: null });
                    }
                    await tenantAPI.update(tenant.id, { status: "DELETED" });
                    if (tenant.room_id) {
                        await roomAPI.recalculateOccupancy(tenant.room_id);
                    }

                    // Cancel notifications
                    try {
                        await NotificationService.cancelAllForTenant(tenant.id);
                    } catch (notifErr) {
                        console.warn("Failed to cancel notifications:", notifErr);
                    }

                    // Close modal and refresh list securely
                    setConfirmState({ visible: false, title: "", message: "", type: "info" });
                    setConfirmInput("");
                    setConfirmTargetCode("");
                    loadTenants(1, false);
                } catch (err: any) {
                    console.error("Delete error:", err);
                    setConfirmState({
                        visible: true,
                        title: "Error",
                        message: "Failed to delete resident. Please try again.",
                        type: "danger",
                        singleButton: true,
                        cancelText: "Review",
                        onClose: () => setConfirmState(prev => ({ ...prev, visible: false }))
                    });
                }
            }
        });
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadTenants = useCallback(async (pageNum = 1, shouldAppend = false) => {
        // Prevent duplicate concurrent calls using a ref (not state, to avoid re-render loops)
        if (loadingRef.current && pageNum === 1) return;
        loadingRef.current = true;
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const [tenantResponse, pgsData, roomsData, bedsData]: [any, any, any, any] = await Promise.all([
                tenantAPI.search({
                    page: pageNum,
                    limit: 10,
                    search: debouncedSearch,
                    status: filters.status === "ALL" ? undefined : filters.status,
                    profession: filters.profession === "ALL" ? undefined : filters.profession,
                    pgId: filters.propertyId === "ALL" || filters.propertyId === "" ? undefined : filters.propertyId,
                    floor: filters.floor === "ALL" ? undefined : filters.floor,
                    roomId: filters.room === "ALL" ? undefined : filters.room,
                    sortBy: filters.sortBy,
                    sortOrder: filters.sortOrder,
                }),
                pageNum === 1 ? Promise.all([pgAPI.getAll(), pgAPI.getArchived()]).then((res: any[]) => [...(Array.isArray(res[0]) ? res[0] : (res[0]?.data || [])), ...(Array.isArray(res[1]) ? res[1] : (res[1]?.data || []))]) : Promise.resolve(pgs),
                pageNum === 1 ? Promise.all([roomAPI.getAll(), roomAPI.getArchived()]).then((res: any[]) => [...(Array.isArray(res[0]) ? res[0] : (res[0]?.data || [])), ...(Array.isArray(res[1]) ? res[1] : (res[1]?.data || []))]) : Promise.resolve(rooms),
                pageNum === 1 ? Promise.all([bedAPI.getAll(), bedAPI.getArchived()]).then((res: any[]) => [...(Array.isArray(res[0]) ? res[0] : (res[0]?.data || [])), ...(Array.isArray(res[1]) ? res[1] : (res[1]?.data || []))]) : Promise.resolve(beds)
            ]);

            // tenantAPI.search returns { data: [...] } or { items: [...] } or direct array [...]
            const tenantList = Array.isArray(tenantResponse)
                ? tenantResponse
                : (tenantResponse?.data || tenantResponse?.items || []);
            const count = tenantResponse?.count ?? tenantResponse?.total ?? tenantList.length;

            if (shouldAppend) {
                setTenants(prev => [...prev, ...tenantList]);
            } else {
                setTenants(tenantList);
            }

            setTotalCount(count);
            setHasMore(tenantList.length === 10 && (pageNum * 10) < count);
            if (pageNum === 1) {
                setPgs(Array.isArray(pgsData) ? pgsData : []);
                setRooms(Array.isArray(roomsData) ? roomsData : []);
                setBeds(Array.isArray(bedsData) ? bedsData : []);
            }
            setPage(pageNum);
        } catch (error) {
            console.error("Failed to fetch Resident Directory data:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
            loadingRef.current = false;
        }
    }, [debouncedSearch, filters]);

    useEffect(() => {
        if (isFocused) {
            setPage(1);
            setHasMore(true);
            loadTenants(1, false);
        }
    }, [debouncedSearch, filters, isFocused]);

    useRefreshOnForeground(() => loadTenants(1, false), isFocused);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            loadTenants(page + 1, true);
        }
    };

    const fetchFloors = useCallback(async (pgId: string) => {
        if (!pgId || pgId === "ALL") return [];
        try {
            const data: any = await roomAPI.getByPgId(pgId);
            const rooms = Array.isArray(data) ? data : (data?.data || []);
            const uniqueFloors = [...new Set(rooms.map((room: any) => room.floor))]
                .filter((f) => f !== null && f !== undefined && f !== "")
                .sort((a: any, b: any) => Number(a) - Number(b))
                .map((f) => ({
                    label: f === 0 || f === "0" ? "Ground Floor" : `Floor ${f}`,
                    value: String(f),
                }));
            return uniqueFloors;
        } catch (error) {
            console.error("Error fetching floors:", error);
            return [];
        }
    }, []);

    const fetchRoomFilterList = useCallback(async (pgId: string, floor: string) => {
        if (!pgId || pgId === "ALL") return [];
        try {
            const data: any = await roomAPI.getByPgId(pgId);
            let rooms = Array.isArray(data) ? data : (data?.data || []);
            if (floor && floor !== "ALL") rooms = rooms.filter((r: any) => String(r.floor) === floor);
            return rooms;
        } catch (error) {
            console.error("Error fetching rooms for filter sheet:", error);
            return [];
        }
    }, []);

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
        setPage(1);
        setHasMore(true);
        loadTenants(1, false);
    };

    const filteredTenants = tenants;

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

    const getTenantBalance = (tenant: any) => {
        // ALWAYS use the invoice-derived balance from V2
        return Number(tenant.outstanding_balance || 0);
    };

    const getDailyStayInfo = (tenant: any) => {
        if (tenant.stay_type !== 'DAILY') return null;
        const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
        const vacateDateStr = tenant.vacate_date || daily?.vacate_date;
        if (!vacateDateStr) return null;

        const vacateDate = new Date(vacateDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = vacateDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            dateStr: vacateDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            daysLeft: diffDays
        };
    };

    const handleBulkDelete = () => {
        if (selectedTenantIds.length === 0) return;
        const deleteCode = Math.floor(1000 + Math.random() * 9000).toString();
        setConfirmTargetCode(deleteCode);
        setConfirmInput("");

        setConfirmState({
            visible: true,
            title: "Bulk Delete?",
            message: `Delete ${selectedTenantIds.length} residents? This action is irreversible.`,
            type: "danger",
            confirmText: "Delete Selected",
            cancelText: "Cancel",
            needsInput: true,
            inputPlaceholder: `Type "${deleteCode}"`,
            onConfirm: async () => {
                try {
                    setConfirmState(prev => ({ ...prev, loading: true }));
                    const promises = selectedTenantIds.map(async (id) => {
                        const tenant = tenants.find(t => t.id === id);
                        if (!tenant) return;
                        if (tenant.bed_id) await bedAPI.update(tenant.bed_id, { status: "AVAILABLE", tenant_id: null });
                        await tenantAPI.update(tenant.id, { status: "DELETED" });
                        if (tenant.room_id) await roomAPI.recalculateOccupancy(tenant.room_id);
                    });
                    await Promise.all(promises);
                    setConfirmState({
                        visible: true,
                        title: "Success",
                        message: "Bulk delete successful.",
                        type: "success",
                        singleButton: true,
                        cancelText: "Done",
                        onClose: () => {
                            setConfirmState(prev => ({ ...prev, visible: false }));
                            setSelectedTenantIds([]);
                            onRefresh();
                        }
                    });
                } catch (err) {
                    console.error("Bulk delete error:", err);
                }
            }
        });
    };

    const eligibleTenants = filteredTenants.filter(t => getTenantBalance(t) <= 0);
    const allEligibleSelected = eligibleTenants.length > 0 && eligibleTenants.every(t => selectedTenantIds.includes(t.id));

    const toggleSelectAll = () => {
        if (allEligibleSelected) {
            setSelectedTenantIds(prev => prev.filter(id => !eligibleTenants.some(t => t.id === id)));
        } else {
            setSelectedTenantIds(prev => {
                const combined = [...prev, ...eligibleTenants.map(t => t.id)];
                return Array.from(new Set(combined));
            });
        }
    };

    const toggleTenantSelection = (id: string, balance: number) => {
        if (balance > 0) return;
        setSelectedTenantIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
    };

    const ResidentCard = ({ item }: { item: any }) => {
        const initials = (item.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
        const balance = getTenantBalance(item);
        const isDaily = item.stay_type === 'DAILY';
        const stayInfo = isDaily ? getDailyStayInfo(item) : null;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("ResidentDetail", { tenant: item })}
            >
                {/* Card Top: Avatar, Name, Status */}
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: COLORS.primary + "10" }]}>
                            {isDaily ? (
                                <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.warning} />
                            ) : (
                                <Text style={[styles.avatarText, { color: COLORS.primary }]}>{initials}</Text>
                            )}
                        </View>
                        {balance <= 0 && (
                            <TouchableOpacity
                                style={styles.selectionOverlay}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                onPress={(e) => { e.stopPropagation(); toggleTenantSelection(item.id, balance); }}
                            >
                                <View style={[styles.checkbox, selectedTenantIds.includes(item.id) && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                                    {selectedTenantIds.includes(item.id) && <Feather name="check" size={12} color="#fff" />}
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.headerMain}>
                        <View style={styles.titleRow}>
                            <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "12" }]}>
                                <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                            </View>
                        </View>

                        {balance > 0 && (
                            <View style={styles.dueAmountRow}>
                                <Text style={styles.dueAmountValue}>₹{Number(balance || 0).toLocaleString()} PENDING</Text>
                            </View>
                        )}

                        <View style={styles.assignmentRow}>
                            <Feather name="home" size={12} color={COLORS.textMuted} />
                            <Text style={styles.assignmentText} numberOfLines={1}>
                                {item.pgs?.name || pgs.find(p => p.id === item.pg_id)?.name || "N/A"} • {(item.floor ?? item.rooms?.floor ?? rooms.find(r => r.id === item.room_id)?.floor ?? 0) === 0 ? "GF" : `F${item.floor ?? item.rooms?.floor ?? rooms.find(r => r.id === item.room_id)?.floor}`} • {item.rooms?.room_number || rooms.find(r => r.id === item.room_id)?.room_number || "N/A"}{item.beds?.bed_number || beds.find(b => b.id === item.bed_id)?.bed_number ? ` (${item.beds?.bed_number || beds.find(b => b.id === item.bed_id)?.bed_number})` : ""}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Grouped Attributes */}
                <View style={styles.attributeGrid}>
                    <View style={styles.attributeItem}>
                        <Feather name="phone" size={11} color={COLORS.textMuted} />
                        <Text style={styles.attributeValue}>{item.phone || "No Phone"}</Text>
                    </View>
                    {isDaily && stayInfo && (
                        <View style={styles.attributeItem}>
                            <Feather name="log-out" size={11} color={COLORS.textMuted} />
                            <Text style={styles.attributeValue}>
                                {stayInfo.dateStr}
                                <Text style={{ color: stayInfo.daysLeft <= 1 ? COLORS.danger : COLORS.warning, fontWeight: '800' }}>
                                    {stayInfo.daysLeft > 0 ? ` (${stayInfo.daysLeft}d)` : " (Today)"}
                                </Text>
                            </Text>
                        </View>
                    )}
                </View>

                {/* Card Action Bar */}
                <View style={styles.actionRowContainer}>
                    <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${item.phone}`); }}>
                        <Feather name="phone" size={16} color={COLORS.primary} />
                        <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); Linking.openURL(`sms:${item.phone}`); }}>
                        <Feather name="message-square" size={16} color={COLORS.primary} />
                        <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>SMS</Text>
                    </TouchableOpacity>

                    {balance > 0 && (
                        <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); navigation.navigate("Finance", { tenantId: item.id }); }}>
                            <MaterialCommunityIcons name="currency-inr" size={18} color={COLORS.success} />
                            <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Pay</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleEditTenant(item); }}>
                        <Feather name="edit-2" size={16} color={COLORS.textMuted} />
                        <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleDeleteTenant(item); }}>
                        <Feather name="trash-2" size={16} color={COLORS.danger} />
                        <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader
                title="Resident Directory"
                onLeftPress={() => navigation.openDrawer()}
                rightElement={
                    <TouchableOpacity onPress={onRefresh} style={styles.appBarIconButton}>
                        <Feather name="refresh-cw" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                }
            />

            <FlatList
                data={filteredTenants}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ResidentCard item={item} />}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? (<View style={{ paddingVertical: 20 }}><ActivityIndicator color={COLORS.primary} /></View>) : null}
                ListHeaderComponent={
                    <View style={styles.searchSection}>
                        <View style={styles.searchBox}>
                            <Feather name="search" size={18} color={COLORS.textMuted} />
                            <TextInput
                                placeholder="Search residents..."
                                placeholderTextColor={COLORS.textMuted}
                                style={styles.searchInput}
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                            />
                            {searchTerm !== "" && (
                                <TouchableOpacity onPress={() => setSearchTerm("")} style={{ marginRight: 8 }}>
                                    <View style={styles.clearBadge}><Feather name="x" size={10} color={COLORS.bg} /></View>
                                </TouchableOpacity>
                            )}
                            <View style={styles.searchDivider} />
                            <TouchableOpacity
                                style={styles.filterTrigger}
                                onPress={() => { setPendingFilters(filters); setFilterSheetVisible(true); }}
                            >
                                <View>
                                    <Feather name="sliders" size={18} color={(filters.propertyId !== "ALL" || filters.status !== "ALL" || filters.profession !== "ALL" || filters.floor !== "ALL" || filters.room !== "ALL") && (filters.propertyId !== "") ? COLORS.primary : COLORS.textMuted} />
                                    {((filters.propertyId && filters.propertyId !== "ALL" ? 1 : 0) + (filters.status !== "ALL" ? 1 : 0) + (filters.profession !== "ALL" ? 1 : 0) + (filters.floor !== "ALL" ? 1 : 0) + (filters.room !== "ALL" ? 1 : 0)) > 0 && (
                                        <View style={styles.filterBadge}>
                                            <Text style={styles.filterBadgeText}>
                                                {((filters.propertyId && filters.propertyId !== "ALL" ? 1 : 0) + (filters.status !== "ALL" ? 1 : 0) + (filters.profession !== "ALL" ? 1 : 0) + (filters.floor !== "ALL" ? 1 : 0) + (filters.room !== "ALL" ? 1 : 0))}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.metaRow}>
                            <View style={styles.selectionGroup}>
                                <TouchableOpacity
                                    onPress={toggleSelectAll}
                                    style={styles.selectionCheck}
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                >
                                    <View style={[styles.checkbox, allEligibleSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                                        {allEligibleSelected && <Feather name="check" size={12} color="#fff" />}
                                    </View>
                                </TouchableOpacity>
                                <Text style={styles.resultCountText}>{loading && page === 1 ? "SEARCHING..." : `${totalCount} RESIDENTS`}</Text>
                            </View>
                            <View style={styles.metaActions}>
                                {selectedTenantIds.length > 0 && (
                                    <TouchableOpacity onPress={handleBulkDelete} style={styles.bulkDeleteBtn}>
                                        <Text style={styles.bulkDeleteText}>Delete {selectedTenantIds.length}</Text>
                                        <Feather name="trash-2" size={12} color={COLORS.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyView}>
                        {loading ? (<ActivityIndicator color={COLORS.primary} size="large" />) : (
                            <>
                                <View style={styles.emptyIconCircle}><Feather name="users" size={40} color={COLORS.textMuted} /></View>
                                <Text style={styles.emptyTitle}>No residents found</Text>
                            </>
                        )}
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={handleAddTenant} activeOpacity={0.9}>
                <Feather name="user-plus" size={24} color="#fff" />
            </TouchableOpacity>

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="Resident Filters"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => { setFilters(pendingFilters); setFilterSheetVisible(false); }}
                onReset={() => { const d = createDefaultTenantFilters(); setFilters(d); setPendingFilters(d); setFilterSheetVisible(false); }}
            >
                <DropdownSelector
                    label="Property"
                    options={[{ label: "All Properties", value: "ALL" }, ...pgs.map(pg => ({ label: pg.archived ? `${pg.name} (Archived)` : pg.name, value: pg.id }))]}
                    value={pendingFilters.propertyId}
                    onChange={(v) => setPendingFilters(p => ({ ...p, propertyId: v, floor: "ALL", room: "ALL" }))}
                />
                <DropdownSelector
                    label="Status"
                    options={[{ label: "All Status", value: "ALL" }, ...RESIDENT_STATUS_OPTIONS.filter(s => s !== "ALL").map(s => ({ label: s, value: s }))]}
                    value={pendingFilters.status}
                    onChange={(v) => setPendingFilters(p => ({ ...p, status: v }))}
                />
            </FilterBottomSheet>

            <UnifiedStayManager
                visible={isOnboardingVisible}
                onClose={() => setOnboardingVisible(false)}
                onSuccess={() => { loadTenants(); setOnboardingVisible(false); }}
                editingTenant={editingTenant}
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
                needsInput={confirmState.needsInput}
                inputPlaceholder={confirmState.inputPlaceholder}
                inputValue={confirmInput}
                onInputChange={setConfirmInput}
                confirmDisabled={confirmState.needsInput && confirmInput !== confirmTargetCode}
            />
        </SafeAreaView>
    );
};

const createStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    appBarIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center"
    },
    searchSection: { padding: 16, paddingBottom: 8 },
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
    clearBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.textMuted, justifyContent: 'center', alignItems: 'center' },
    searchDivider: { width: 1, height: 24, backgroundColor: COLORS.border, marginHorizontal: 12 },
    filterTrigger: { padding: 4 },
    filterBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.danger, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.card, paddingHorizontal: 4 },
    filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 4, paddingHorizontal: 4 },
    selectionGroup: { flexDirection: 'row', alignItems: 'center' },
    selectionCheck: { marginRight: 10 },
    resultCountText: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
    metaActions: { flexDirection: 'row', gap: 12 },
    bulkDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.danger + '12', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
    bulkDeleteText: { fontSize: 11, fontWeight: '800', color: COLORS.danger },
    listContent: { paddingBottom: 100, paddingHorizontal: 16 },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', marginBottom: 16 },
    avatarContainer: { position: 'relative', marginRight: 16 },
    avatar: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 20, fontWeight: '900' },
    selectionOverlay: { position: 'absolute', top: -4, left: -4, padding: 4 },
    checkbox: { width: 18, height: 18, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
    headerMain: { flex: 1, justifyContent: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    name: { fontSize: 18, fontWeight: '800', color: COLORS.text, flex: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    dueAmountRow: { marginBottom: 6 },
    dueAmountValue: { fontSize: 12, fontWeight: '800', color: COLORS.danger },
    assignmentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    assignmentText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
    attributeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border + '40' },
    attributeItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    attributeValue: { fontSize: 12, fontWeight: '700', color: COLORS.text },
    actionRowContainer: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border + '40', justifyContent: 'space-between' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
    actionBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
    fab: { position: 'absolute', bottom: 30, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 10 },
    emptyView: { marginTop: 60, alignItems: 'center', paddingHorizontal: 40 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
});

export default TenantsScreen;
