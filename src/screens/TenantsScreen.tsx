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
import { tenantAPI, pgAPI, roomAPI } from "../services/api";
import ConfirmationModal from "../components/common/ConfirmationModal";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import DropdownSelector from "../components/common/DropdownSelector";
import { supabase } from "../lib/supabaseClient";
import UnifiedStayManager from "../components/modals/UnifiedStayManager";
import { generateDeleteCode } from "../utils/security";

const { width, height } = Dimensions.get("window");

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
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [tenants, setTenants] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

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
        // 100% Logic Parity: Block if balance > 0
        const balance = Number(tenant.balance || 0);

        if (balance > 0) {
            setConfirmState({
                visible: true,
                title: "Deletion Blocked",
                message: "Cannot delete tenant with pending dues.",
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
                    // 1. Free the bed
                    if (tenant.bed_id) {
                        await supabase.from("beds").update({ status: "AVAILABLE", tenant_id: null }).eq("id", tenant.bed_id);
                    }
                    // 2. Perform soft delete
                    await tenantAPI.update(tenant.id, { status: "DELETED" });
                    // 3. Recalculate room occupancy
                    if (tenant.room_id) {
                        await roomAPI.recalculateOccupancy(tenant.room_id);
                    }

                    setConfirmState({
                        visible: true,
                        title: "Success",
                        message: "Resident deleted successfully.",
                        type: "success",
                        singleButton: true,
                        cancelText: "Done",
                        onClose: () => {
                            setConfirmState(prev => ({ ...prev, visible: false }));
                            onRefresh();
                        }
                    });
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
        if (loading || loadingMore) return;

        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const [tenantResponse, pgsData]: [any, any] = await Promise.all([
                tenantAPI.search({
                    page: pageNum,
                    limit: 10,
                    search: debouncedSearch,
                    status: filters.status,
                    profession: filters.profession,
                    pgId: filters.propertyId,
                    floor: filters.floor,
                    roomId: filters.room,
                    sortBy: filters.sortBy,
                    sortOrder: filters.sortOrder,
                }),
                pageNum === 1 ? pgAPI.getAll() : Promise.resolve(pgs)
            ]);

            const tenantList = tenantResponse?.data || [];
            const count = tenantResponse?.count || 0;

            if (shouldAppend) {
                setTenants(prev => [...prev, ...tenantList]);
            } else {
                setTenants(tenantList);
            }

            setTotalCount(count);
            // Scalable check: stop when current count reaches total
            setHasMore(shouldAppend ? (tenants.length + tenantList.length < count) : (tenantList.length < count));
            if (pageNum === 1) setPgs(Array.isArray(pgsData) ? pgsData : []);
            setPage(pageNum);
        } catch (error) {
            console.error("Failed to fetch Resident Directory data:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [debouncedSearch, filters, pgs, tenants.length, loading, loadingMore, tenantAPI, pgAPI]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        loadTenants(1, false);
    }, [debouncedSearch, filters]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            loadTenants(page + 1, true);
        }
    };

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
                .sort((a: any, b: any) => {
                    const numA = Number(a);
                    const numB = Number(b);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return String(a).localeCompare(String(b));
                })
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

    // Unified effect for search/filters handled above

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

    const filteredTenants = tenants; // Rely 100% on server-side filtered data for pagination integrity

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
        if (tenant.stay_type === 'DAILY') {
            const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details?.[0] : tenant.daily_stay_details;
            const moveIn = tenant.move_in_date || daily?.move_in_date;
            const vacate = tenant.vacate_date || daily?.vacate_date;
            const rentPerDay = daily?.rent_per_day || tenant.rent_per_day || 0;
            const maintenance = daily?.maintenance_amount || tenant.maintenance_amount || 0;

            if (moveIn && vacate) {
                const start = new Date(moveIn);
                const end = new Date(vacate);
                let diffDays = 1;
                if (end > start) {
                    diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                }
                const totalRent = (diffDays * Number(rentPerDay)) + Number(maintenance);
                const paid = Number(daily?.paid_amount || tenant.paid_amount || 0);
                return Math.max(0, totalRent - paid);
            }
            return Number(daily?.balance_amount || tenant.balance_amount || tenant.balance || 0);
        }
        return Number(tenant.balance || 0);
    };

    const getTenantTotalRent = (tenant: any) => {
        if (tenant.stay_type === 'DAILY') {
            const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details?.[0] : tenant.daily_stay_details;
            const moveIn = tenant.move_in_date || daily?.move_in_date;
            const vacate = tenant.vacate_date || daily?.vacate_date;
            const rentPerDay = daily?.rent_per_day || tenant.rent_per_day || 0;
            const maintenance = daily?.maintenance_amount || tenant.maintenance_amount || 0;

            if (moveIn && vacate) {
                const start = new Date(moveIn);
                const end = new Date(vacate);
                let diffDays = 1;
                if (end > start) {
                    diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                }
                return (diffDays * Number(rentPerDay)) + Number(maintenance);
            }
            return Number(tenant.total_rent || daily?.total_rent || 0);
        }
        return Number(tenant.custom_rent || tenant.rent_per_month || tenant.rooms?.rent || 0);
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
            title: "Bulk Delete Residents?",
            message: `You are about to PERMANENTLY delete ${selectedTenantIds.length} residents and free their beds. This action is irreversible.\nNote: Only residents with no dues can be bulk deleted.`,
            type: "danger",
            confirmText: "Yes, Delete Selected",
            cancelText: "Cancel",
            needsInput: true,
            inputPlaceholder: `Type "${deleteCode}" to confirm`,
            onConfirm: async () => {
                try {
                    setConfirmState(prev => ({ ...prev, loading: true }));

                    const deletePromises = selectedTenantIds.map(async (tenantId) => {
                        const tenant = tenants.find(t => t.id === tenantId);
                        if (!tenant) return;
                        if (tenant.bed_id) {
                            await supabase.from("beds").update({ status: "AVAILABLE", tenant_id: null }).eq("id", tenant.bed_id);
                        }
                        await tenantAPI.update(tenant.id, { status: "DELETED" });
                        if (tenant.room_id) {
                            await roomAPI.recalculateOccupancy(tenant.room_id);
                        }
                    });

                    await Promise.all(deletePromises);

                    setConfirmState({
                        visible: true,
                        title: "Success",
                        message: "Selected residents deleted successfully.",
                        type: "success",
                        singleButton: true,
                        cancelText: "Done",
                        onClose: () => {
                            setConfirmState(prev => ({ ...prev, visible: false }));
                            setSelectedTenantIds([]);
                            onRefresh();
                        }
                    });
                } catch (err: any) {
                    console.error("Bulk delete error:", err);
                    setConfirmState({
                        visible: true,
                        title: "Error",
                        message: "Failed to delete selected residents. Please try again.",
                        type: "danger",
                        singleButton: true,
                        cancelText: "Review",
                        onClose: () => setConfirmState(prev => ({ ...prev, visible: false }))
                    });
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
            const newSelections = new Set([...selectedTenantIds, ...eligibleTenants.map(t => t.id)]);
            setSelectedTenantIds(Array.from(newSelections));
        }
    };

    const toggleTenantSelection = (id: string, balance: number) => {
        if (balance > 0) return; // Cannot select tenants with dues
        setSelectedTenantIds(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        );
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
                {/* Top Row: Avatar, Name, Status, Actions */}
                <View style={[styles.cardHeader, { alignItems: 'center' }]}>
                    {balance <= 0 ? (
                        <TouchableOpacity
                            style={{ marginRight: 12, padding: 4 }}
                            onPress={(e) => { e.stopPropagation(); toggleTenantSelection(item.id, balance); }}
                        >
                            <Feather name={selectedTenantIds.includes(item.id) ? "check-square" : "square"} size={22} color={selectedTenantIds.includes(item.id) ? COLORS.primary : COLORS.border} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ marginRight: 12, padding: 4, opacity: 0.3 }}>
                            <Feather name="square" size={22} color={COLORS.border} />
                        </View>
                    )}
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary + "10" }]}>
                        {isDaily ? (
                            <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.warning} />
                        ) : (
                            <Text style={[styles.avatarText, { color: COLORS.primary }]}>{initials}</Text>
                        )}
                    </View>
                    <View style={styles.headerInfo}>
                        <View style={styles.nameRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
                                {isDaily && balance > 0 && (
                                    <View style={styles.dueBadge}>
                                        <Text style={styles.dueBadgeText}>DUE: ₹{balance.toLocaleString()}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {isDaily && (
                                    <View style={[styles.stayBadge, { marginLeft: 0 }]}>
                                        <Text style={styles.stayBadgeText}>DAILY</Text>
                                    </View>
                                )}
                                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                                    <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Sub-Header: Phone, Profession, Actions */}
                <View style={styles.subHeader}>
                    <View style={{ flex: 1, gap: 8 }}>
                        <TouchableOpacity style={styles.phoneRow} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                            <Feather name="phone" size={12} color={COLORS.primary} />
                            <Text style={styles.phoneText}>{item.phone || "No Phone"}</Text>
                        </TouchableOpacity>
                        <View style={[styles.profBadge, { backgroundColor: "rgba(255,255,255,0.05)", alignSelf: 'flex-start' }]}>
                            <Text style={styles.profText}>{item.profession || "No Profession"}</Text>
                        </View>
                    </View>
                    <View style={styles.actionsRow}>
                        {balance > 0 && (
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success + "15" }]} onPress={() => navigation.navigate("Finance", { tenantId: item.id })}>
                                <MaterialCommunityIcons name="currency-inr" size={14} color={COLORS.success} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditTenant(item)}>
                            <Feather name="edit-2" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteTenant(item)}>
                            <Feather name="trash-2" size={14} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Assignment & Financial Details */}
                <View style={styles.detailsSection}>
                    <View style={styles.assignmentColumn}>
                        <Text style={styles.pgNameText}>{item.pgs?.name || "N/A"}</Text>
                        <Text style={styles.roomBedText}>
                            Room {item.rooms?.room_number || "N/A"}{item.beds?.bed_number ? ` - ${item.beds.bed_number}` : ""}
                        </Text>
                    </View>

                    <View style={styles.financialList}>
                        <View style={styles.finDetailRow}>
                            <Text style={styles.finDetailLabel}>
                                {isDaily ? 'RENT (TOTAL) : ' : 'RENT : '}
                                <Text style={[styles.finDetailValue, isDaily && { color: COLORS.success }]}>
                                    ₹{getTenantTotalRent(item).toLocaleString()}
                                </Text>
                            </Text>
                            {!isDaily && item.custom_rent && (
                                <View style={styles.customBadge}>
                                    <Text style={styles.customBadgeText}>CUSTOM</Text>
                                </View>
                            )}
                        </View>

                        {stayInfo && (
                            <View style={styles.finDetailRow}>
                                <Text style={styles.finDetailLabel}>
                                    Checkout : <Text style={styles.finDetailValue}>{stayInfo.dateStr}</Text>
                                    <Text style={[styles.finDetailSubText, { color: stayInfo.daysLeft <= 1 ? COLORS.danger : COLORS.warning }]}>
                                        {stayInfo.daysLeft > 0 ? ` (${stayInfo.daysLeft} days left)` : (stayInfo.daysLeft === 0 ? " (Today)" : " (Passed)")}
                                    </Text>
                                </Text>
                            </View>
                        )}

                        {Number(item.maintenance_amount || 0) > 0 && (
                            <View style={styles.finDetailRow}>
                                <Text style={styles.finDetailLabel}>
                                    + ₹{Number(item.maintenance_amount).toLocaleString()} MAINT
                                    <Text style={styles.finDetailSubText}> ({item.maintenance_type || "ONE_TIME"})</Text>
                                </Text>
                                <View style={[styles.maintStatusBadge, item.maintenance_paid ? styles.maintPaidBadge : styles.maintUnpaidBadge]}>
                                    <Text style={[styles.maintStatusText, { color: item.maintenance_paid ? COLORS.success : COLORS.danger }]}>
                                        {item.maintenance_paid ? 'PAID' : 'PENDING'}
                                    </Text>
                                </View>
                            </View>
                        )}
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
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Resident Directory</Text>
            </View>

            <FlatList
                data={filteredTenants}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ResidentCard item={item} />}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator color={COLORS.primary} />
                        </View>
                    ) : null
                }
                ListHeaderComponent={
                    <View style={styles.topSection}>
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
                                style={[
                                    styles.filterButton,
                                    (filters.propertyId || filters.status !== "ALL" || filters.profession !== "ALL" || filters.floor !== "ALL" || filters.room !== "ALL") && { backgroundColor: COLORS.success }
                                ]}
                                onPress={() => {
                                    setPendingFilters(filters);
                                    setFilterSheetVisible(true);
                                }}
                            >
                                <Feather name="sliders" size={18} color="#fff" />
                                <Text style={styles.filterButtonText}>Filter</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterStatusRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TouchableOpacity style={{ padding: 4 }} onPress={toggleSelectAll}>
                                    <Feather
                                        name={allEligibleSelected ? "check-square" : "square"}
                                        size={22}
                                        color={allEligibleSelected ? COLORS.primary : COLORS.border}
                                    />
                                </TouchableOpacity>
                                <Text style={styles.countText}>
                                    {loading && page === 1 ? "Finding residents..." : `Found ${totalCount} residents`}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                {selectedTenantIds.length > 0 && (
                                    <TouchableOpacity
                                        onPress={handleBulkDelete}
                                        style={[styles.clearFiltersBtn, { backgroundColor: COLORS.danger + '15', borderColor: 'transparent' }]}
                                    >
                                        <Text style={[styles.clearFiltersText, { color: COLORS.danger, fontWeight: '700' }]}>Delete ({selectedTenantIds.length})</Text>
                                        <Feather name="trash-2" size={14} color={COLORS.danger} />
                                    </TouchableOpacity>
                                )}
                                {(filters.propertyId || filters.status !== "ALL" || filters.profession !== "ALL" || filters.floor !== "ALL" || filters.room !== "ALL") && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            const defaults = createDefaultTenantFilters();
                                            setFilters(defaults);
                                            setPendingFilters(defaults);
                                        }}
                                        style={styles.clearFiltersBtn}
                                    >
                                        <Text style={styles.clearFiltersText}>Clear All</Text>
                                        <Feather name="x" size={12} color={COLORS.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>
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
                description=""
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
                <DropdownSelector
                    label="Property"
                    options={[
                        { label: "All Properties", value: "ALL" },
                        ...pgs.map(pg => ({ label: pg.name, value: pg.id }))
                    ]}
                    value={pendingFilters.propertyId}
                    onChange={(value) => {
                        setPendingFilters(prev => ({ ...prev, propertyId: value, floor: "ALL", room: "ALL" }));
                        setHighlightProperty(false);
                    }}
                    placeholder="Select property..."
                    highlight={highlightProperty}
                />

                <DropdownSelector
                    label="Status"
                    options={[
                        { label: "All Status", value: "ALL" },
                        ...RESIDENT_STATUS_OPTIONS.filter(s => s !== "ALL").map(stat => ({ label: stat, value: stat }))
                    ]}
                    value={pendingFilters.status}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, status: value }))}
                    placeholder="Select status..."
                />

                <DropdownSelector
                    label="Profession"
                    options={[
                        { label: "All Professions", value: "ALL" },
                        ...PROFESSION_OPTIONS.map(prof => ({ label: prof, value: prof }))
                    ]}
                    value={pendingFilters.profession}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, profession: value }))}
                    placeholder="Select profession..."
                />

                <DropdownSelector
                    label="Floor"
                    options={[
                        { label: "All Floors", value: "ALL" },
                        ...sheetFloorOptions.map((floor: any) => ({ label: floor.label, value: floor.value }))
                    ]}
                    value={pendingFilters.floor}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, floor: value, room: "ALL" }))}
                    placeholder="Select property first..."
                    disabled={!pendingFilters.propertyId || pendingFilters.propertyId === "ALL"}
                    onDisabledPress={() => {
                        setHighlightProperty(true);
                        setTimeout(() => setHighlightProperty(false), 2000);
                    }}
                />

                <DropdownSelector
                    label="Room"
                    options={[
                        { label: "All Rooms", value: "ALL" },
                        ...sheetRoomOptions.map(room => ({ label: `Room ${room.room_number}`, value: room.id }))
                    ]}
                    value={pendingFilters.room}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, room: value }))}
                    placeholder="Select property first..."
                    disabled={!pendingFilters.propertyId || pendingFilters.propertyId === "ALL"}
                    onDisabledPress={() => {
                        setHighlightProperty(true);
                        setTimeout(() => setHighlightProperty(false), 2000);
                    }}
                />

                <DropdownSelector
                    label="Sort By"
                    options={SORT_OPTIONS.map(opt => ({ label: opt.label, value: `${opt.sortBy}:${opt.sortOrder}` }))}
                    value={`${pendingFilters.sortBy}:${pendingFilters.sortOrder}`}
                    onChange={(value) => {
                        const [sortBy, sortOrder] = value.split(':');
                        setPendingFilters(prev => ({ ...prev, sortBy, sortOrder }));
                    }}
                    placeholder="Select sort..."
                />
            </FilterBottomSheet>

            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={handleAddTenant}
            >
                <Feather name="plus" size={24} color="#fff" />
                <Text style={styles.fabText}>Add Resident</Text>
            </TouchableOpacity>

            <UnifiedStayManager
                visible={isOnboardingVisible}
                onClose={() => setOnboardingVisible(false)}
                onSuccess={() => {
                    loadTenants();
                    setOnboardingVisible(false);
                }}
                editingTenant={editingTenant}
            />

            <ConfirmationModal
                visible={confirmState.visible}
                onClose={() => {
                    const callback = (confirmState as any).onClose;
                    setConfirmState(prev => ({ ...prev, visible: false }));
                    if (callback) callback();
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
                needsInput={confirmState.needsInput}
                inputPlaceholder={confirmState.inputPlaceholder}
                inputValue={confirmInput}
                onInputChange={(val) => setConfirmInput(val)}
                confirmDisabled={confirmState.needsInput && confirmInput !== confirmTargetCode}
                disableOutsideTap={confirmState.type === "danger"}
                secondaryText={confirmState.secondaryText}
                onSecondary={confirmState.onSecondary}
            />
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

        filterStatusRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 4,
            paddingHorizontal: 4
        },
        countText: {
            fontSize: 12,
            fontWeight: "700",
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.5
        },
        clearFiltersBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 8,
            backgroundColor: COLORS.danger + "10",
        },
        clearFiltersText: {
            fontSize: 11,
            fontWeight: "800",
            color: COLORS.danger,
            textTransform: "uppercase"
        },

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

        detailsSection: { gap: 16 },
        assignmentColumn: { gap: 4 },
        pgNameText: { fontSize: 13, fontWeight: "700", color: COLORS.primary, letterSpacing: 0.5 },
        roomBedText: { fontSize: 16, fontWeight: "800", color: COLORS.text },

        financialList: { gap: 8 },
        finDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        finDetailLabel: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
        finDetailValue: { color: COLORS.text, fontWeight: '800' },
        finDetailSubText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },

        stayBadge: { backgroundColor: COLORS.warning + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
        stayBadgeText: { fontSize: 9, fontWeight: "900", color: COLORS.warning },

        dueBadge: { backgroundColor: COLORS.danger + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' },
        dueBadgeText: { fontSize: 9, fontWeight: "900", color: COLORS.danger },

        customBadge: { backgroundColor: COLORS.success + "15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
        customBadgeText: { fontSize: 8, fontWeight: "900", color: COLORS.success },

        maintStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
        maintPaidBadge: { backgroundColor: COLORS.success + "15" },
        maintUnpaidBadge: { backgroundColor: COLORS.danger + "15" },
        maintStatusText: { fontSize: 8, fontWeight: "900" },

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

export default TenantsScreen;
