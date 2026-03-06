import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tenantAPI, pgAPI } from "../services/api";
import { billingService } from "../services/billing.service";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import { useRefreshOnForeground } from "../hooks/useRefreshOnForeground";
import FilterBottomSheet from "../components/common/FilterBottomSheet";
import DropdownSelector from "../components/common/DropdownSelector";

const { width } = Dimensions.get("window");

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
    const isFocused = useIsFocused();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

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
        if (loading || loadingMore) return;

        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const [pgsRes, tenantsRes]: any = await Promise.all([
                pageNum === 1 ? pgAPI.getAll() : Promise.resolve(pgs),
                tenantAPI.search({
                    page: pageNum,
                    limit: 10,
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

            // V2 Balance Fetching
            const balances = await Promise.all(
                tenantList.map((t: any) => billingService.getOutstandingBalance(t.id).catch(() => 0))
            );
            tenantList.forEach((t: any, i: number) => {
                t.outstanding_balance = balances[i] || 0;
            });

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

    useEffect(() => {
        if (isFocused) {
            setPage(1);
            setHasMore(true);
            fetchData(1, false);
        }
    }, [debouncedSearch, filters, isFocused]);

    useRefreshOnForeground(() => fetchData(1, false), isFocused);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            fetchData(page + 1, true);
        }
    };

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
            case 'DUE': return COLORS.danger;
            default: return COLORS.textMuted;
        }
    };

    const ResultCard = ({ item }: { item: any }) => {
        const initials = (item.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
        const rent = item.rent_per_month || item.rent || item.rooms?.rent || 0;
        const deposit = item.security_deposit || item.rooms?.deposit || 0;
        const balance = Number(item.outstanding_balance || 0);

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("ResidentDetail", { tenant: item })}
            >
                {/* Header: Name, Status & Major Info */}
                <View style={styles.cardHeader}>
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary + "10" }]}>
                        <Text style={[styles.avatarText, { color: COLORS.primary }]}>{initials}</Text>
                    </View>
                    <View style={styles.headerMain}>
                        <View style={styles.titleRow}>
                            <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "12" }]}>
                                <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                            </View>
                        </View>

                        <View style={styles.subTitleRow}>
                            <View style={[styles.typePill, { backgroundColor: COLORS.bg }]}>
                                <Text style={styles.typePillText}>{item.stay_type || "MONTHLY"}</Text>
                            </View>
                            <Text style={styles.phoneText}>{item.phone || "No Phone"}</Text>
                        </View>
                    </View>
                </View>

                {/* Assignment Info */}
                <View style={styles.assignmentBox}>
                    <Feather name="home" size={12} color={COLORS.textMuted} />
                    <Text style={styles.assignmentText} numberOfLines={1}>
                        {item.pgs?.name || "N/A"} • Room {item.rooms?.room_number || "N/A"}{item.beds?.bed_number ? ` (${item.beds.bed_number})` : ""}
                    </Text>
                </View>

                {/* Financial Grid 2x2 */}
                <View style={styles.financeGrid}>
                    <View style={styles.financeCell}>
                        <Text style={styles.financeLabel}>RENT</Text>
                        <Text style={styles.financeValue}>₹{Number(rent).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeCell}>
                        <Text style={styles.financeLabel}>DEPOSIT</Text>
                        <Text style={styles.financeValue}>₹{Number(deposit).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeCell}>
                        <Text style={styles.financeLabel}>MAINT.</Text>
                        <Text style={styles.financeValue}>₹{Number(item.maintenance_amount || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeCell}>
                        <Text style={styles.financeLabel}>BALANCE</Text>
                        <Text style={[styles.financeValue, balance > 0 && { color: COLORS.danger, fontWeight: '900' }]}>
                            ₹{balance.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Compact Top App Bar */}
            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.appBarButton}>
                    <Feather name="menu" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Smart Tenant Finder</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                    <Feather name="refresh-cw" size={18} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            {/* Optimized Search Section */}
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
                            <View style={styles.clearBadge}>
                                <Feather name="x" size={12} color={COLORS.bg} />
                            </View>
                        </TouchableOpacity>
                    )}
                    <View style={styles.searchDivider} />
                    <TouchableOpacity
                        style={styles.filterTrigger}
                        onPress={() => {
                            setPendingFilters(filters);
                            setFilterSheetVisible(true);
                        }}
                    >
                        <Feather
                            name="sliders"
                            size={18}
                            color={(filters.propertyId !== "ALL" || filters.status !== "ALL" || filters.profession !== "ALL") ? COLORS.primary : COLORS.textMuted}
                        />
                    </TouchableOpacity>
                </View>

                <Text style={styles.metaText}>
                    {loading && page === 1 ? "SEARCHING..." : `${totalCount} RESIDENTS MATCHING`}
                </Text>
            </View>

            {/* Results List */}
            {loading && !refreshing && page === 1 ? (
                <View style={styles.centerView}>
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
                        <View style={styles.emptyView}>
                            <View style={styles.emptyIconCircle}>
                                <Feather name="search" size={40} color={COLORS.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>No residents found</Text>
                            <Text style={styles.emptySubtitle}>Try different keywords or property filters</Text>
                        </View>
                    }
                />
            )}

            <FilterBottomSheet
                visible={isFilterSheetVisible}
                title="Finder Filters"
                onClose={() => setFilterSheetVisible(false)}
                onApply={() => {
                    setFilters(pendingFilters);
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
                />

                <DropdownSelector
                    label="Status"
                    options={[
                        { label: "All Status", value: "ALL" },
                        ...STATUS_OPTIONS.filter(s => s !== "ALL").map(stat => ({ label: stat, value: stat }))
                    ]}
                    value={pendingFilters.status}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, status: value }))}
                />

                <DropdownSelector
                    label="Profession"
                    options={[
                        { label: "All Professions", value: "ALL" },
                        ...PROFESSION_OPTIONS.filter(p => p !== "ALL").map(prof => ({ label: prof, value: prof }))
                    ]}
                    value={pendingFilters.profession}
                    onChange={(value) => setPendingFilters(prev => ({ ...prev, profession: value }))}
                />

                <DropdownSelector
                    label="Sort"
                    options={SORT_PRESETS.map(preset => ({ label: preset.label, value: `${preset.sortBy}:${preset.sortOrder}` }))}
                    value={`${pendingFilters.sortBy}:${pendingFilters.sortOrder}`}
                    onChange={(value) => {
                        const [sortBy, sortOrder] = value.split(':');
                        setPendingFilters(prev => ({ ...prev, sortBy, sortOrder }));
                    }}
                />
            </FilterBottomSheet>
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
        appBarButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        appBarTitle: {
            fontSize: 17,
            fontWeight: '800',
            color: COLORS.text,
            letterSpacing: -0.5,
        },

        // Search Section
        searchSection: {
            padding: 16,
            paddingBottom: 8,
        },
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
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
        },
        searchInput: {
            flex: 1,
            marginLeft: 12,
            fontSize: 15,
            fontWeight: '600',
            color: COLORS.text,
        },
        clearBadge: {
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: COLORS.textMuted,
            justifyContent: 'center',
            alignItems: 'center',
        },
        searchDivider: {
            width: 1,
            height: 24,
            backgroundColor: COLORS.border,
            marginHorizontal: 12,
        },
        filterTrigger: {
            padding: 4,
        },
        metaText: {
            fontSize: 10,
            fontWeight: '800',
            color: COLORS.textMuted,
            marginTop: 16,
            marginLeft: 4,
            letterSpacing: 1,
        },

        // List & Cards
        listContent: {
            paddingHorizontal: 16,
            paddingBottom: 40,
        },
        card: {
            backgroundColor: COLORS.card,
            borderRadius: 16, // Consistent 16px radius
            marginBottom: 16,
            padding: 16, // Consistent 16px padding
            borderWidth: 1,
            borderColor: COLORS.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 2,
        },
        cardHeader: {
            flexDirection: 'row',
            marginBottom: 12,
        },
        avatar: {
            width: 48,
            height: 48,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        avatarText: {
            fontSize: 18,
            fontWeight: '900',
        },
        headerMain: {
            flex: 1,
        },
        titleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
        },
        name: {
            fontSize: 16,
            fontWeight: '800',
            color: COLORS.text,
            flex: 1,
        },
        statusBadge: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
        },
        statusBadgeText: {
            fontSize: 9,
            fontWeight: '900',
            textTransform: 'uppercase',
        },
        subTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        typePill: {
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        typePillText: {
            fontSize: 9,
            fontWeight: '800',
            color: COLORS.textMuted,
        },
        phoneText: {
            fontSize: 12,
            color: COLORS.textMuted,
            fontWeight: '600',
        },

        assignmentBox: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border + '40',
        },
        assignmentText: {
            fontSize: 13,
            fontWeight: '600',
            color: COLORS.textMuted,
        },

        // Finance Grid 2x2
        financeGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: -8,
        },
        financeCell: {
            width: '50%',
            paddingHorizontal: 8,
            marginBottom: 8,
        },
        financeLabel: {
            fontSize: 9,
            fontWeight: '800',
            color: COLORS.textMuted,
            marginBottom: 2,
            letterSpacing: 0.5,
        },
        financeValue: {
            fontSize: 14,
            fontWeight: '800',
            color: COLORS.text,
        },

        // Helper Views
        centerView: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emptyView: {
            marginTop: 60,
            alignItems: 'center',
            paddingHorizontal: 40,
        },
        emptyIconCircle: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: COLORS.card,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        emptyTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: COLORS.text,
            marginBottom: 8,
        },
        emptySubtitle: {
            fontSize: 14,
            color: COLORS.textMuted,
            textAlign: 'center',
            lineHeight: 20,
        },
    });

export default SmartTenantFinder;
