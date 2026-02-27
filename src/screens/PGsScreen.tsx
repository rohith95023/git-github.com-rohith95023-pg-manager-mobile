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
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { pgAPI } from "../services/api";
import { Feather } from "@expo/vector-icons";

const PGsScreen = ({ navigation }: any) => {
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pgs, setPgs] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchPGs = useCallback(async () => {
        try {
            const data = await pgAPI.getAll();
            setPgs((data || []) as any[]);
        } catch (error) {
            console.error("Failed to fetch PGs:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchPGs();
    }, [fetchPGs]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPGs();
    };

    const filteredPgs = pgs.filter(pg =>
        pg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pg.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderPgItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate("Rooms", { pgId: item.id, pgName: item.name })}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Feather name="home" size={20} color={colors.primary} />
                </View>
                <View style={styles.statusBadge}>
                    <Text style={[styles.statusText, { color: item.status === 'ACTIVE' ? '#10b981' : '#f59e0b' }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <Text style={[styles.pgName, { color: colors.text }]}>{item.name}</Text>

            <View style={styles.infoRow}>
                <Feather name="map-pin" size={14} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    {item.city}, {item.state}
                </Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{item.total_floors || 0}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Floors</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>₹{(item.security_deposit || 0).toLocaleString()}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Deposit</Text>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.viewButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate("Rooms", { pgId: item.id, pgName: item.name })}
            >
                <Text style={styles.viewButtonText}>View Rooms</Text>
                <Feather name="chevron-right" size={16} color="#fff" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Properties</Text>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
                    <Feather name="plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    placeholder="Search properties..."
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
                    data={filteredPgs}
                    renderItem={renderPgItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Feather name="home" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No properties found</Text>
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
    title: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
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
    iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
    statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
    pgName: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    infoText: { fontSize: 13, marginLeft: 6, fontWeight: "500" },
    statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    statItem: { flex: 1 },
    statValue: { fontSize: 16, fontWeight: "700" },
    statLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
    statDivider: { width: 1, height: 24, marginHorizontal: 16 },
    viewButton: {
        height: 44,
        borderRadius: 12,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8
    },
    viewButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    emptyState: { alignItems: "center", marginTop: 60, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: "600" }
});

export default PGsScreen;
