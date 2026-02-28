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
    RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tenantAPI, pgAPI } from "../services/api";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import DropdownSelector from "../components/common/DropdownSelector";

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

// Smart Tenant Finder only has: ALL, ACTIVE, INACTIVE, DUE (matching web)
const STATUS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE", "DUE"];
const SORT_PRESETS = [
    { label: "Newest First", sortBy: "move_in_date", sortOrder: "desc" },
    { label: "Oldest First", sortBy: "move_in_date", sortOrder: "asc" },
    { label: "Name (A-Z)", sortBy: "full_name", sortOrder: "asc" },
    { label: "Name (Z-A)", sortBy: "full_name", sortOrder: "desc" }
];
const DEFAULT_FINDER_FILTERS = {
    propertyId: "ALL",
    profession: "ALL",
    status: "ALL",
    sortBy: "move_in_date",
    sortOrder: "desc"
};

const SmartTenantFinder = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState(DEFAULT_FINDER_FILTERS);
    const [pendingFilters, setPendingFilters] = useState(DEFAULT_FINDER_FILTERS);
    const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchData = useCallback(async (pageNum = 1, shouldAppend = false) => {
        if (loadingMore || (loading && pageNum === 1)) return;

        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const [pgsRes, tenantsRes]: any = await Promise.all([
                pageNum === 1 ? pgAPI.getAll() : Promise.resolve(pgs),
                tenantAPI.search({
                    page: pageNum,
                    limit: 8,
                    search: debouncedSearch,
                    status: filters.status,
                    pgId: filters.propertyId,
                    profession: filters.profession,
                    sortBy: filters.sortBy,
                    sortOrder: filters.sortOrder
                })
            ]);

            const tenantList = tenantsRes.data || [];
            const count = tenantsRes.count || 0;

            if (shouldAppend) {
                setTenants(prev => [...prev, ...tenantList]);
            } else {
                setTenants(tenantList);
            }

            if (pageNum === 1) setPgs(pgsRes || []);
            setTotalCount(count);
            setHasMore(shouldAppend ? (tenants.length + tenantList.length < count) : (tenantList.length < count));
            setPage(pageNum);
        } catch (error) {
            console.error("Failed to fetch tenant finder data:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [debouncedSearch, filters, pgs, tenants.length, loading, loadingMore]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchData(1, false);
    }, [debouncedSearch, filters]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            fetchData(page + 1, true);
        }
    };

    // Unified effect for search/filters handled above

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        fetchData(1, false);
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
                <View style={styles.searchRow}>
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

                {/* Filter Status Bar */}
                <View style={styles.filterStatusRow}>
                    <Text style={styles.countText}>
                        {loading && page === 1 ? "Searching..." : `Showing ${tenants.length} of ${totalCount} matching residents`}
                    </Text>
                </View>
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
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator color={COLORS.primary} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="search" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>No residents match your search</Text>
                        </View>
                    }
                />
            )}

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="Finder Filters"
                description="Property, status, profession, and sort settings carried over from web"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    const applied = { ...pendingFilters };
                    setFilters(applied);
                    setPendingFilters(applied);
                    setFilterSheetVisible(false);
                }}
                onReset={() => {
                    setFilters(DEFAULT_FINDER_FILTERS);
                    setPendingFilters(DEFAULT_FINDER_FILTERS);
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
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, propertyId: value }))}
                    placeholder="Select property..."
                />

                <DropdownSelector
                    label="Status"
                    options={[
                        { label: "All Status", value: "ALL" },
                        ...STATUS_OPTIONS.filter(s => s !== "ALL").map(stat => ({ label: stat, value: stat }))
                    ]}
                    value={pendingFilters.status}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, status: value }))}
                    placeholder="Select status..."
                />

                <DropdownSelector
                    label="Profession"
                    options={[
                        { label: "All Professions", value: "ALL" },
                        ...PROFESSION_OPTIONS.filter(p => p !== "ALL").map(prof => ({ label: prof, value: prof }))
                    ]}
                    value={pendingFilters.profession}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, profession: value }))}
                    placeholder="Select profession..."
                />

                <DropdownSelector
                    label="Sort"
                    options={SORT_PRESETS.map(preset => ({ label: preset.label, value: `${preset.sortBy}:${preset.sortOrder}` }))}
                    value={`${pendingFilters.sortBy}:${pendingFilters.sortOrder}`}
                    onChange={(value) => {
                        const [sortBy, sortOrder] = value.split(':');
                        setPendingFilters(prev => ({ ...prev, sortBy, sortOrder }));
                    }}
                    placeholder="Select sort..."
                />
            </FilterBottomSheet>
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        topSection: { paddingVertical: 10, paddingHorizontal: 20 },
        searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
        searchBar: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderRadius: 25,
            paddingHorizontal: 20,
            height: 50,
            borderWidth: 1,
            borderColor: COLORS.border
        },
        searchInput: { flex: 1, marginLeft: 12, color: COLORS.text, fontWeight: "600", fontSize: 14 },
        filterButton: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.primary,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
            gap: 6
        },
        filterButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },

        filterStatusRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            paddingHorizontal: 4
        },
        countText: {
            fontSize: 11,
            fontWeight: "700",
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.5
        },

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
        sheetChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "10" },
        sheetChipText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
        sheetChipTextActive: { color: COLORS.primary },

        sheetSortRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
        sheetSortButton: {
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: COLORS.card
        },
        sheetSortButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "10" },
        sheetSortText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
        sheetSortTextActive: { color: COLORS.primary }
    });

export default SmartTenantFinder;
