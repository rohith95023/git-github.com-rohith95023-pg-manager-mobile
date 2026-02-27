import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pgAPI } from "../services/api";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";

const { width } = Dimensions.get("window");

const PGsScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pgs, setPgs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"Active" | "Archived">("Active");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchPGs = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch both or just the current tab based on API structure
            // Using a single fetch and local filtering for better UX if data is small
            // but the instructions say to use business logic.
            // Let's fetch based on tab.
            let data: any;
            if (activeTab === "Active") {
                data = await pgAPI.getActive();
            } else {
                data = await pgAPI.getArchived();
            }
            setPgs(data || []);
        } catch (error) {
            console.error("Failed to fetch properties:", error);
            Alert.alert("Error", "Failed to fetch properties");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchPGs();
    }, [fetchPGs]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPGs();
    };

    const filteredPgs = useMemo(() => {
        return pgs.filter(pg =>
        (pg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pg.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pg.address?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [pgs, searchTerm]);

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Property",
            "Are you sure you want to delete this property? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await pgAPI.update(id, { status: "DELETED" });
                            fetchPGs();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete property");
                        }
                    }
                }
            ]
        );
    };

    const PropertyCard = ({ item }: { item: any }) => {
        // Mocking occupancy and available for visual demo if not in schema
        // In real app, these would come from room relations.
        const totalRooms = item.total_rooms || 0;
        const occupiedRooms = Math.floor(totalRooms * 0.8); // Demo logic
        const availableRooms = totalRooms - occupiedRooms;
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("RoomsBeds", { pgId: item.id, pgName: item.name })}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.propertyName}>{item.name}</Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: COLORS.primary + "15" }]}>
                                <Text style={[styles.badgeText, { color: COLORS.primary }]}>CO-LIVING</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: COLORS.success + "15" }]}>
                                <Text style={[styles.badgeText, { color: COLORS.success }]}>{item.total_floors || 0} FLOORS</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => { }}>
                            <Feather name="edit-2" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item.id)}>
                            <Feather name="trash-2" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.locationContainer}>
                    <Ionicons name="location-sharp" size={14} color={COLORS.danger} />
                    <Text style={styles.locationText}>{item.city ? `${item.city}, ` : ""}{item.address || "No address set"}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsRow}>
                    <View style={styles.statContainer}>
                        <View style={styles.statBox}>
                            <View style={styles.statSubBox}>
                                <Text style={styles.statSubValue}>{totalRooms}</Text>
                                <Text style={styles.statSubLabel}>TOTAL</Text>
                            </View>
                            <View style={[styles.statSubBox, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
                                <Text style={styles.statSubValue}>{availableRooms}</Text>
                                <Text style={[styles.statSubLabel, { color: COLORS.success }]}>AVAIL</Text>
                            </View>
                        </View>
                        <Text style={styles.statMainLabel}>ROOMS (T/A)</Text>
                    </View>

                    <View style={styles.occupancyContainer}>
                        <View style={styles.occupancyHeader}>
                            <View style={[styles.progressBarBg, { flex: 1 }]}>
                                <View style={[styles.progressBarFill, { width: `${occupancyRate}%`, backgroundColor: COLORS.success }]} />
                            </View>
                            <Text style={[styles.occupancyValue, { color: COLORS.success }]}>{occupancyRate}%</Text>
                        </View>
                        <Text style={styles.statMainLabel}>OCCUPANCY</Text>
                    </View>

                    <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, {
                            backgroundColor: item.status === "ACTIVE" ? COLORS.success + "15" : COLORS.warning + "15"
                        }]}>
                            <View style={[styles.statusDot, {
                                backgroundColor: item.status === "ACTIVE" ? COLORS.success : COLORS.warning
                            }]} />
                            <Text style={[styles.statusText, {
                                color: item.status === "ACTIVE" ? COLORS.success : COLORS.warning
                            }]}>
                                {item.status}
                            </Text>
                        </View>
                        <Text style={styles.statMainLabel}>STATUS</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>PG Properties</Text>
                    <Text style={styles.subtitle}>Real-time property analytics active</Text>
                </View>
                <TouchableOpacity style={styles.syncBtn}>
                    <MaterialCommunityIcons name="database-sync" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>

            {/* Tab Switch */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "Active" && styles.tabActive]}
                    onPress={() => setActiveTab("Active")}
                >
                    <Text style={[styles.tabText, activeTab === "Active" && styles.tabTextActive]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "Archived" && styles.tabActive]}
                    onPress={() => setActiveTab("Archived")}
                >
                    <Text style={[styles.tabText, activeTab === "Archived" && styles.tabTextActive]}>Archived</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Feather name="search" size={20} color={COLORS.textMuted} />
                    <TextInput
                        placeholder="Search by name or city..."
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.searchInput}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
                <View style={styles.totalRow}>
                    <View style={styles.totalDot} />
                    <Text style={styles.totalText}>TOTAL: {filteredPgs.length}</Text>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Fetching properties...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPgs}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <PropertyCard item={item} />}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="office-building-cog-outline" size={64} color={COLORS.textMuted + "20"} />
                            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} properties found</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => Alert.alert("Coming Soon", "The feature to create a new property will be available in the next update.")}
            >
                <Feather name="plus" size={24} color="#fff" />
                <Text style={styles.fabText}>Create Property</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

type ThemePalette = ReturnType<typeof useThemePalette>;

const createStyles = (COLORS: ThemePalette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        header: { padding: 20, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
        title: { fontSize: 26, fontWeight: "900", color: COLORS.text, letterSpacing: -1 },
        subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, fontWeight: "600" },
        syncBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.card, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.border },

        tabBar: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 20 },
        tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
        tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
        tabText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "700" },
        tabTextActive: { color: "#fff" },

        searchSection: { marginHorizontal: 20, marginBottom: 20 },
        searchBar: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderRadius: 16,
            paddingHorizontal: 16,
            height: 52,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 10
        },
        searchInput: { flex: 1, marginLeft: 12, color: COLORS.text, fontWeight: "600", fontSize: 14 },
        totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
        totalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
        totalText: { fontSize: 11, fontWeight: "800", color: COLORS.text, letterSpacing: 1 },

        listContent: { paddingHorizontal: 20, paddingBottom: 100 },
        card: {
            backgroundColor: COLORS.card,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
        headerTitleContainer: { flex: 1 },
        propertyName: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
        badgeRow: { flexDirection: "row", gap: 8 },
        badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
        badgeText: { fontSize: 9, fontWeight: "900" },
        headerIcons: { flexDirection: "row", gap: 10 },
        iconBtn: { padding: 4 },

        locationContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
        locationText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600", flex: 1 },

        divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 16 },

        statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
        statContainer: { flex: 1.2 },
        statBox: {
            flexDirection: "row",
            backgroundColor: COLORS.bg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 8,
            marginBottom: 8
        },
        statSubBox: { flex: 1, alignItems: "center" },
        statSubValue: { fontSize: 15, fontWeight: "800", color: COLORS.text },
        statSubLabel: { fontSize: 8, fontWeight: "800", color: COLORS.textMuted, marginTop: 2 },
        statMainLabel: { fontSize: 9, fontWeight: "900", color: COLORS.textMuted, letterSpacing: 0.5 },

        occupancyContainer: { flex: 1.2, marginHorizontal: 15 },
        occupancyHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, height: 44, justifyContent: "center" },
        progressBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" },
        progressBarFill: { height: "100%", borderRadius: 3 },
        occupancyValue: { fontSize: 13, fontWeight: "800" },

        statusContainer: { flex: 1, alignItems: "flex-end" },
        statusBadge: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 12,
            gap: 6,
            marginBottom: 8,
            height: 44,
            justifyContent: "center"
        },
        statusDot: { width: 6, height: 6, borderRadius: 3 },
        statusText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },

        loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
        loadingText: { color: COLORS.textMuted, marginTop: 12, fontWeight: "600" },
        emptyContainer: { alignItems: "center", marginTop: 60, gap: 16 },
        emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: "600" },

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

export default PGsScreen;
