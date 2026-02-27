import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Pressable,
    TextInput,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { pgAPI, roomAPI } from "../../services/api";

type TabKey = "ACTIVE" | "ARCHIVED";

type RoomMetrics = {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    capacity: number;
    occupiedBeds: number;
};

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
    { key: "ACTIVE", label: "Active" },
    { key: "ARCHIVED", label: "Archived" },
];

const PGPropertiesScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [activeProperties, setActiveProperties] = useState<any[]>([]);
    const [archivedProperties, setArchivedProperties] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState<TabKey>("ACTIVE");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = useCallback(async () => {
        try {
            const [active, archived, roomData] = await Promise.all([
                pgAPI.getActive(),
                pgAPI.getArchived(),
                roomAPI.getAll()
            ]);
            setActiveProperties((active || []) as any[]);
            setArchivedProperties((archived || []) as any[]);
            setRooms((roomData || []) as any[]);
        } catch (error) {
            console.error("Failed to load properties:", error);
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

    const roomMetricsByPg = useMemo(() => {
        return rooms.reduce<Record<string, RoomMetrics>>((acc, room) => {
            const pgId = room?.pg_id;
            if (!pgId) return acc;
            const existing = acc[pgId] ?? {
                totalRooms: 0,
                availableRooms: 0,
                occupiedRooms: 0,
                capacity: 0,
                occupiedBeds: 0
            };
            existing.totalRooms += 1;
            if (room.status === "AVAILABLE") existing.availableRooms += 1;
            if ((room.current_occupancy || 0) > 0) existing.occupiedRooms += 1;
            existing.capacity += room.capacity || 0;
            existing.occupiedBeds += room.current_occupancy || 0;
            acc[pgId] = existing;
            return acc;
        }, {});
    }, [rooms]);

    const propertyList = selectedTab === "ACTIVE" ? activeProperties : archivedProperties;

    const filteredProperties = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return propertyList;
        return propertyList.filter(
            (pg) =>
                (pg?.name || "").toLowerCase().includes(term) ||
                (pg?.city || "").toLowerCase().includes(term)
        );
    }, [propertyList, searchTerm]);

    const formatTypeLabel = (value?: string) => {
        if (!value) return "Co-living";
        return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const showActionAlert = (title: string, message: string) => {
        Alert.alert(title, message, [{ text: "OK" }]);
    };

    const renderPropertyCard = ({ item }: { item: any }) => {
        const metrics = roomMetricsByPg[item.id] ?? {
            totalRooms: 0,
            availableRooms: 0,
            occupiedRooms: 0,
            capacity: 0,
            occupiedBeds: 0
        };

        const occupancyPercent =
            metrics.capacity > 0
                ? Math.round((metrics.occupiedBeds / metrics.capacity) * 100)
                : metrics.totalRooms > 0
                    ? Math.round((metrics.occupiedRooms / metrics.totalRooms) * 100)
                    : 0;

        const totalRooms = metrics.totalRooms || item.total_rooms || 0;
        const availableRooms =
            metrics.availableRooms > 0
                ? metrics.availableRooms
                : Math.max(0, totalRooms - metrics.occupiedRooms);
        const isActive = item.status === "ACTIVE";
        const badgeColor = isActive ? "#10b981" : "#f97316";

        return (
            <Pressable
                style={[styles.card, { backgroundColor: colors.card, shadowColor: "#000" }]}
                onPress={() => navigation.navigate("Rooms", { pgId: item.id, pgName: item.name })}
                android_ripple={{ color: colors.border }}
            >
                <View style={styles.cardTopRow}>
                    <View style={[styles.iconShell, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={{ color: colors.primary, fontSize: 20 }}>{"\u{1F3E2}"}</Text>
                    </View>
                    <View style={styles.centerColumn}>
                        <Text style={[styles.propertyName, { color: colors.text }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <View style={styles.badgeRow}>
                        <View style={[styles.badge, { borderColor: colors.border, marginRight: 8 }]}>
                            <Text style={[styles.badgeText, { color: colors.primary }]}>
                                {formatTypeLabel(item.gender_type)}
                            </Text>
                        </View>
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                                {`${item.total_floors || "--"} Floors`}
                            </Text>
                            </View>
                        </View>
                        <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {`${item.city || "City"}, ${item.state || "State"}`}
                        </Text>
                    </View>
                    <View style={styles.rightColumn}>
                        <View style={styles.progressGroup}>
                            <Text style={[styles.progressValue, { color: colors.text }]}>{`${Math.min(
                                Math.max(occupancyPercent, 0),
                                100
                            )}%`}</Text>
                            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${Math.min(Math.max(occupancyPercent, 0), 100)}%`,
                                            backgroundColor: colors.primary
                                        }
                                    ]}
                                />
                            </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: `${badgeColor}20`, borderColor: badgeColor }]}>
                            <Text style={[styles.statusText, { color: badgeColor }]}>{isActive ? "Active" : "Archived"}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.roomsRow}>
                    <View>
                        <Text style={[styles.roomsLabel, { color: colors.textSecondary }]}>Rooms</Text>
                        <Text style={[styles.roomsValue, { color: colors.text }]}>{totalRooms}</Text>
                    </View>
                    <View>
                        <Text style={[styles.roomsLabel, { color: colors.textSecondary }]}>Available</Text>
                        <Text style={[styles.roomsValue, { color: colors.text }]}>{availableRooms}</Text>
                    </View>
                </View>

                <View style={styles.actionsRow}>
                    <Pressable
                        style={[styles.actionButton, { borderColor: colors.border }]}
                        onPress={() => showActionAlert("Edit Property", "Edit flow coming soon.")}
                    >
                        <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.actionButton, styles.deleteButton, { borderColor: colors.border }]}
                        onPress={() => showActionAlert("Delete Property", "Delete confirmation will be added later.")}
                    >
                        <Text style={[styles.actionText, { color: "#ef4444" }]}>Delete</Text>
                    </Pressable>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.wrapper}>
                <ScrollView
                    style={styles.topScroll}
                    contentContainerStyle={styles.topContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.title, { color: colors.text }]}>PG Properties</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                Real-time database sync active
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.segmentedControl, { backgroundColor: colors.card }]}>
                        {TAB_OPTIONS.map((tab) => (
                            <Pressable
                                key={tab.key}
                                style={[
                                    styles.segmentButton,
                                    selectedTab === tab.key && {
                                        backgroundColor: colors.primary,
                                        shadowColor: "#000",
                                        shadowOpacity: 0.2,
                                        shadowRadius: 4,
                                        elevation: 4
                                    }
                                ]}
                                onPress={() => setSelectedTab(tab.key)}
                            >
                                <Text
                                    style={[
                                        styles.segmentLabel,
                                        {
                                            color: selectedTab === tab.key ? "#fff" : colors.textSecondary,
                                            fontWeight: selectedTab === tab.key ? "700" : "500"
                                        }
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View
                        style={[
                            styles.searchBox,
                            { backgroundColor: colors.card, borderColor: colors.border }
                        ]}
                    >
                        <TextInput
                            placeholder="Search by name or city"
                            placeholderTextColor={colors.textSecondary}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            style={[styles.searchInput, { color: colors.text }]}
                        />
                    </View>
                </ScrollView>

                {loading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredProperties}
                        renderItem={renderPropertyCard}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    No properties match your filters.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            <Pressable
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => showActionAlert("Create Property", "Create flow coming soon.")}
            >
                <Text style={styles.fabIcon}>+</Text>
            </Pressable>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1
    },
    wrapper: {
        flex: 1,
        paddingHorizontal: 20
    },
    topScroll: {
        maxHeight: 200
    },
    topContent: {
        paddingBottom: 12
    },
    header: {
        marginTop: 16,
        marginBottom: 12
    },
    title: {
        fontSize: 28,
        fontWeight: "800"
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4
    },
    segmentedControl: {
        flexDirection: "row",
        borderRadius: 14,
        padding: 4,
        marginBottom: 12,
        borderWidth: 1
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderRadius: 12,
        marginHorizontal: 2
    },
    segmentLabel: {
        fontSize: 14
    },
    searchBox: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    searchInput: {
        fontSize: 16,
        fontWeight: "500"
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    listContent: {
        paddingTop: 8,
        paddingBottom: 140
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
        borderWidth: 1
    },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "flex-start"
    },
    iconShell: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12
    },
    centerColumn: {
        flex: 1
    },
    propertyName: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 6
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6
    },
    badge: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 3,
        paddingHorizontal: 8
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600"
    },
    locationText: {
        fontSize: 13,
        fontWeight: "500"
    },
    rightColumn: {
        width: 96,
        alignItems: "flex-end"
    },
    progressGroup: {
        width: "100%"
    },
    progressValue: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 4
    },
    progressBar: {
        width: "100%",
        height: 6,
        borderRadius: 999,
        overflow: "hidden"
    },
    progressFill: {
        height: "100%",
        borderRadius: 999
    },
    statusBadge: {
        marginTop: 12,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700"
    },
    roomsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16
    },
    roomsLabel: {
        fontSize: 12,
        fontWeight: "600"
    },
    roomsValue: {
        fontSize: 18,
        fontWeight: "800",
        marginTop: 2
    },
    actionsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12
    },
    actionButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: "center",
        marginHorizontal: 4
    },
    actionText: {
        fontSize: 14,
        fontWeight: "700"
    },
    deleteButton: {
        borderColor: "transparent"
    },
    emptyState: {
        paddingVertical: 40,
        alignItems: "center"
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "600"
    },
    fab: {
        position: "absolute",
        right: 20,
        bottom: 32,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
    },
    fabIcon: {
        color: "#fff",
        fontSize: 32,
        lineHeight: 32
    }
});

export default PGPropertiesScreen;
