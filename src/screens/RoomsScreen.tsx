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
    Pressable
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { roomAPI, bedAPI, pgAPI } from "../services/api";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const COLORS = {
    bg: "#0f172a",
    card: "#1e293b",
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    text: "#ffffff",
    textMuted: "#94a3b8",
    border: "rgba(255,255,255,0.05)"
};

const RoomsScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [viewMode, setViewMode] = useState<"ROOMS" | "BEDS">("ROOMS");
    const [statusMode, setStatusMode] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPg, setSelectedPg] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [roomsData, bedsData, pgsData] = await Promise.all([
                roomAPI.getAll(),
                bedAPI.getAll(),
                pgAPI.getAll()
            ]);
            setRooms(roomsData || []);
            setBeds(bedsData || []);
            setPgs(pgsData || []);
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

    // Filter Logic
    const filteredContent = useMemo(() => {
        if (viewMode === "ROOMS") {
            return rooms.filter(r => {
                const matchesSearch = (r.room_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (r.pgs?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
                const matchesPg = !selectedPg || r.pg_id === selectedPg;
                const matchesStatus = statusMode === "ACTIVE" ? r.status !== "DELETED" : r.status === "DELETED";
                return matchesSearch && matchesPg && matchesStatus;
            });
        } else {
            return beds.filter(b => {
                const matchesSearch = (b.bed_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (b.rooms?.room_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (b.tenants?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());
                const matchesPg = !selectedPg || b.rooms?.pg_id === selectedPg;
                const matchesStatus = statusMode === "ACTIVE" ? b.status !== "DELETED" : b.status === "DELETED";
                return matchesSearch && matchesPg && matchesStatus;
            });
        }
    }, [viewMode, statusMode, rooms, beds, searchTerm, selectedPg]);

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
                    <Text style={styles.cardSub}>{item.pgs?.name || "N/A"} • Floor {item.floor}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>MONTHLY RENT</Text>
                    <Text style={styles.footerValue}>₹{item.rent?.toLocaleString()}</Text>
                </View>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>DEPOSIT</Text>
                    <Text style={styles.footerValue}>₹{item.security_deposit?.toLocaleString()}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Feather name="edit-2" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
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
                            onPress={() => setStatusMode("ACTIVE")}
                        >
                            <Text style={[styles.subSegmentText, statusMode === "ACTIVE" && styles.subSegmentTextActive]}>Available</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subSegment, statusMode === "ARCHIVED" && styles.subSegmentActive]}
                            onPress={() => setStatusMode("ARCHIVED")}
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

                        {/* Search and Filters */}
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

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                                <TouchableOpacity
                                    style={[styles.chip, !selectedPg && styles.chipActive]}
                                    onPress={() => setSelectedPg(null)}
                                >
                                    <Text style={[styles.chipText, !selectedPg && styles.chipTextActive]}>All Properties</Text>
                                </TouchableOpacity>
                                {pgs.map((pg) => (
                                    <TouchableOpacity
                                        key={pg.id}
                                        style={[styles.chip, selectedPg === pg.id && styles.chipActive]}
                                        onPress={() => setSelectedPg(pg.id)}
                                    >
                                        <Text style={[styles.chipText, selectedPg === pg.id && styles.chipTextActive]}>{pg.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
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

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => console.log(`Add ${viewMode === "ROOMS" ? "Room" : "Bed"}`)}
            >
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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

    filterSection: { paddingHorizontal: 20, marginBottom: 12 },
    searchBar: {
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
    chipsScroll: { marginTop: 16, marginHorizontal: -20, paddingLeft: 20 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: COLORS.card,
        marginRight: 10,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
    chipTextActive: { color: "#fff" },

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

export default RoomsScreen;
