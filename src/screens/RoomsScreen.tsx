import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { roomAPI } from "../services/api";
import { Feather } from "@expo/vector-icons";

const RoomsScreen = ({ route, navigation }: any) => {
    const { pgId, pgName } = route.params || {};
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rooms, setRooms] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchRooms = useCallback(async () => {
        try {
            const data = await roomAPI.getAll();
            // If pgId is provided, filter by property
            const filtered = pgId ? data.filter((r: any) => (r.pg_id || r.pgId) === pgId) : data;
            setRooms(filtered || []);
        } catch (error) {
            console.error("Failed to fetch rooms:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [pgId]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRooms();
    };

    const filteredRooms = rooms.filter(room =>
        (room.room_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.pgs?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return '#10b981';
            case 'PARTIAL': return '#3b82f6';
            case 'FULL': return '#ef4444';
            case 'MAINTENANCE': return '#f59e0b';
            default: return colors.textSecondary;
        }
    };

    const renderRoomItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
            <View style={styles.cardHeader}>
                <View style={styles.roomBadge}>
                    <Text style={[styles.roomNumber, { color: colors.text }]}>Room {item.room_number}</Text>
                    <Text style={[styles.floorText, { color: colors.textSecondary }]}>Floor {item.floor}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            {!pgId && (
                <View style={styles.pgInfo}>
                    <Feather name="home" size={14} color={colors.textSecondary} />
                    <Text style={[styles.pgName, { color: colors.textSecondary }]}>{item.pgs?.name || "Unknown PG"}</Text>
                </View>
            )}

            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <Feather name="users" size={16} color={colors.primary} />
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                        {item.current_occupancy || 0}/{item.capacity}
                    </Text>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Occupancy</Text>
                </View>
                <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailItem}>
                    <Feather name="credit-card" size={16} color={colors.primary} />
                    <Text style={[styles.detailValue, { color: colors.text }]}>₹{(item.rent || 0).toLocaleString()}</Text>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Rent</Text>
                </View>
            </View>

            <View style={[styles.typeBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.typeText, { color: colors.textSecondary }]}>{item.room_type}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {pgName ? `${pgName} Rooms` : "All Rooms"}
                    </Text>
                    {pgName && (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
                            <Feather name="arrow-left" size={14} color={colors.primary} />
                            <Text style={[styles.backText, { color: colors.primary }]}>Back to PGs</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
                    <Feather name="plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    placeholder="Search by room number..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    style={[styles.searchInput, { color: colors.text }]}
                />
            </View>

            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
            ) : (
                <FlatList
                    data={filteredRooms}
                    renderItem={renderRoomItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Feather name="box" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No rooms found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16
    },
    title: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
    backLink: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
    backText: { fontSize: 13, fontWeight: "700" },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        elevation: 4
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16
    },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: "500" },
    listContent: { padding: 20, paddingTop: 0 },
    card: {
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    roomBadge: {},
    roomNumber: { fontSize: 18, fontWeight: "800" },
    floorText: { fontSize: 12, fontWeight: "600", marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: "800" },
    pgInfo: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
    pgName: { fontSize: 13, fontWeight: "600" },
    detailsRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
    detailItem: { flex: 1, alignItems: "center" },
    detailValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
    detailLabel: { fontSize: 10, fontWeight: "600", marginTop: 2, textTransform: "uppercase" },
    detailDivider: { width: 1, height: 30 },
    typeBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 12 },
    typeText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
    emptyState: { alignItems: "center", marginTop: 60, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: "600" }
});

export default RoomsScreen;
