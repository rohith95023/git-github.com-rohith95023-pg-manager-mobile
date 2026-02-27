import React, { useState, useEffect, useCallback } from "react";
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
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { tenantAPI, pgAPI } from "../services/api";
import { Feather } from "@expo/vector-icons";

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

const STATUS_OPTIONS = ["ALL", "ACTIVE", "UPCOMING", "OVERDUE", "INACTIVE"];

const SmartTenantFinder = () => {
    const { colors, isDark } = useTheme();
    const [tenants, setTenants] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPg, setSelectedPg] = useState("ALL");
    const [selectedProfession, setSelectedProfession] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");

    const fetchData = useCallback(async () => {
        try {
            const [pgsRes, tenantsRes]: any = await Promise.all([
                pgAPI.getAll(),
                tenantAPI.search({
                    page: 1,
                    limit: 100,
                    search: searchTerm,
                    status: selectedStatus, // Pass the status value directly ("ALL" is handled in api.ts)
                    pgId: selectedPg,       // Pass the PG ID directly ("ALL" is handled in api.ts)
                })
            ]);

            setPgs(pgsRes.data || []);

            // Filter by profession manually as the API might not support it directly in search yet
            let filtered = tenantsRes.data || [];
            if (selectedProfession !== "ALL") {
                filtered = filtered.filter((t: any) => t.profession === selectedProfession);
            }
            setTenants(filtered);
        } catch (error) {
            console.error("Failed to fetch tenant finder data:", error);
            Alert.alert("Error", "Could not load records.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchTerm, selectedPg, selectedStatus, selectedProfession]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getLiveBalance = (tenant: any) => {
        if (tenant.stay_type === "DAILY") {
            const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
            const moveIn = daily?.move_in_date || tenant.move_in_date;
            const vacate = daily?.vacate_date || tenant.vacate_date;
            if (moveIn && vacate) {
                const start = new Date(moveIn);
                const end = new Date(vacate);
                let diffDays = 1;
                if (end > start) diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const rentBase = diffDays * Number(daily?.rent_per_day || tenant.rent_per_day || 0);
                const maintBase = Number(daily?.maintenance_amount || tenant.maintenance_amount || 0);
                const totRent = rentBase + maintBase;
                return Math.max(0, totRent - Number(daily?.paid_amount || 0));
            }
            return Number(daily?.balance_amount || tenant.balance_amount || tenant.balance || 0);
        }
        return Number(tenant.balance || 0);
    };

    const renderFilterItem = (item: string, selected: boolean, onPress: () => void, key: string) => (
        <TouchableOpacity
            key={key}
            onPress={onPress}
            style={[
                styles.filterPill,
                { backgroundColor: selected ? colors.primary : colors.card, borderColor: colors.border }
            ]}
        >
            <Text style={[styles.filterText, { color: selected ? "#fff" : colors.textSecondary }]}>{item}</Text>
        </TouchableOpacity>
    );

    const renderTenant = ({ item }: { item: any }) => {
        const balance = getLiveBalance(item);
        const rent = item.rent_per_month || item.rent_per_day || item.rooms?.rent || 0;

        return (
            <TouchableOpacity style={[styles.tenantCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                        <Feather name="user" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.nameSection}>
                        <Text style={[styles.tenantName, { color: colors.text }]}>{item.full_name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={[styles.tenantSub, { color: colors.textSecondary }]}>{item.profession || "No Profession"}</Text>
                            <View style={[styles.typeBadge, { backgroundColor: item.stay_type === 'DAILY' ? '#3b82f620' : '#64748b20' }]}>
                                <Text style={[styles.typeBadgeText, { color: item.stay_type === 'DAILY' ? '#3b82f6' : '#64748b' }]}>
                                    {item.stay_type}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'ACTIVE' ? '#10b98120' : '#ef444420' }]}>
                        <Text style={[styles.statusBadgeText, { color: item.status === 'ACTIVE' ? '#10b981' : '#ef4444' }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>RENT</Text>
                        <Text style={[styles.statValue, { color: colors.primary }]}>₹{Number(rent).toLocaleString()}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>DEPOSIT</Text>
                        <Text style={[styles.statValue, { color: '#10b981' }]}>₹{Number(item.security_deposit || item.rooms?.deposit || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>BALANCE</Text>
                        <Text style={[styles.statValue, { color: balance > 0 ? '#ef4444' : '#10b981' }]}>₹{Math.round(balance).toLocaleString()}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="map-pin" size={12} color={colors.textSecondary} />
                        <Text style={[styles.footerText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.pgs?.name || "No PG"} • Room {item.rooms?.room_number || "N/A"}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.detailBtn}>
                        <Feather name="chevron-right" size={16} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    placeholder="Search name, phone, email, ID..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    style={[styles.searchInput, { color: colors.text }]}
                />
            </View>

            {/* Filters Horizontal Scroller */}
            <View style={styles.filtersWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                    {/* PG Filter */}
                    <TouchableOpacity
                        style={[styles.filterGroup, { backgroundColor: selectedPg !== 'ALL' ? colors.primary + '15' : 'transparent' }]}
                        onPress={() => setSelectedPg("ALL")}
                    >
                        <Text style={[styles.filterGroupTitle, { color: colors.textSecondary }]}>PROPERTY:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {renderFilterItem("ALL", selectedPg === "ALL", () => setSelectedPg("ALL"), "pg-all")}
                            {pgs.map(pg => renderFilterItem(pg.name, selectedPg === pg.id, () => setSelectedPg(pg.id), pg.id))}
                        </ScrollView>
                    </TouchableOpacity>

                    <View style={[styles.vDivider, { backgroundColor: colors.border }]} />

                    {/* Profession Filter */}
                    <View style={styles.filterGroup}>
                        <Text style={[styles.filterGroupTitle, { color: colors.textSecondary }]}>CAREER:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {PROFESSION_OPTIONS.map(opt => renderFilterItem(opt, selectedProfession === opt, () => setSelectedProfession(opt), `prof-${opt}`))}
                        </ScrollView>
                    </View>

                    <View style={[styles.vDivider, { backgroundColor: colors.border }]} />

                    {/* Status Filter */}
                    <View style={styles.filterGroup}>
                        <Text style={[styles.filterGroupTitle, { color: colors.textSecondary }]}>STATUS:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {STATUS_OPTIONS.map(opt => renderFilterItem(opt, selectedStatus === opt, () => setSelectedStatus(opt), `status-${opt}`))}
                        </ScrollView>
                    </View>
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={tenants}
                    renderItem={renderTenant}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Feather name="search" size={60} color={colors.textSecondary + '40'} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No matching residents found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        margin: 20,
        paddingHorizontal: 16,
        height: 54,
        borderRadius: 16,
        borderWidth: 1,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: "600" },
    filtersWrapper: { marginBottom: 10 },
    filtersScroll: { paddingLeft: 20, paddingBottom: 10, alignItems: 'center' },
    filterGroup: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    filterGroupTitle: { fontSize: 10, fontWeight: '900', marginRight: 10, opacity: 0.6 },
    filterPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 8,
    },
    filterText: { fontSize: 12, fontWeight: "700" },
    vDivider: { width: 1, height: 20, marginRight: 15, opacity: 0.5 },
    listContent: { padding: 20, paddingTop: 0 },
    tenantCard: {
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6
    },
    cardTop: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    nameSection: { flex: 1, marginLeft: 12 },
    tenantName: { fontSize: 16, fontWeight: '800' },
    tenantSub: { fontSize: 12, fontWeight: '600' },
    typeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
    typeBadgeText: { fontSize: 8, fontWeight: '900' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    statusBadgeText: { fontSize: 10, fontWeight: '800' },
    divider: { height: 1, marginVertical: 16, opacity: 0.5 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    stat: { flex: 1 },
    statLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', marginBottom: 4 },
    statValue: { fontSize: 14, fontWeight: '800' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerText: { fontSize: 11, fontWeight: '600', flex: 1 },
    detailBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, fontWeight: '700', marginTop: 16 }
});

export default SmartTenantFinder;
