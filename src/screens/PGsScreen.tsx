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
    Dimensions,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pgAPI } from "../services/api";
import { supabase } from "../lib/supabaseClient";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import useThemePalette from "../hooks/useThemePalette";
import { useRefreshOnForeground } from "../hooks/useRefreshOnForeground";
import { generateDeleteCode, generatePgDeleteCode } from "../utils/security";

import PGFormModal from "../components/modals/PGFormModal";
import ConfirmationModal from "../components/common/ConfirmationModal";
import ThemeToggleButton from "../components/ThemeToggleButton";

const { width } = Dimensions.get("window");

const PGsScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const isFocused = useIsFocused();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pgs, setPgs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"Active" | "Archived">("Active");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPg, setEditingPg] = useState<any>(null);

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
        needsInput?: boolean;
        inputPlaceholder?: string;
    }>({
        visible: false,
        title: "",
        message: "",
        type: "info"
    });

    const [confirmInput, setConfirmInput] = useState("");
    const [confirmTargetCode, setConfirmTargetCode] = useState("");

    const fetchPGs = useCallback(async () => {
        try {
            setLoading(true);
            const data: any = await pgAPI.getAllWithStats(activeTab === "Active" ? "ACTIVE" : "INACTIVE");
            setPgs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch properties:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (isFocused) {
            fetchPGs();
        }
    }, [fetchPGs, isFocused]);

    useRefreshOnForeground(fetchPGs, isFocused);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPGs();
    };

    const handleAdd = () => {
        setEditingPg(null);
        setModalVisible(true);
    };

    const handleEdit = (pg: any) => {
        setEditingPg(pg);
        setModalVisible(true);
    };

    const filteredPgs = useMemo(() => {
        return pgs.filter(pg =>
        (pg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pg.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pg.address?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [pgs, searchTerm]);

    const handleArchive = async (id: string, name: string) => {
        try {
            setLoading(true);
            const { count, error } = await supabase
                .from("tenants")
                .select("id", { count: "exact", head: true })
                .eq("pg_id", id)
                .eq("status", "ACTIVE");

            setLoading(false);

            if (error) throw error;

            if (count && count > 0) {
                setConfirmState({
                    visible: true,
                    title: "Archive Blocked",
                    message: `Cannot archive PG while ${count} active tenant(s) are assigned. Please move them out first.`,
                    type: "danger",
                    singleButton: true,
                    cancelText: "Close"
                });
                return;
            }

            const deleteCode = generateDeleteCode();
            setConfirmTargetCode(deleteCode);
            setConfirmInput("");

            setConfirmState({
                visible: true,
                title: "Archive Property?",
                message: `Are you sure you want to archive "${name}"? This will also archive all its rooms and beds. You can restore it later.`,
                type: "warning",
                confirmText: "Archive Now",
                cancelText: "Cancel",
                needsInput: true,
                inputPlaceholder: `Type "${deleteCode}" to confirm`,
                onConfirm: async () => {
                    try {
                        setConfirmState(prev => ({ ...prev, loading: true }));
                        const date = new Date().toISOString().split('T')[0];
                        await pgAPI.archive(id, date);
                        await fetchPGs();
                        setConfirmState({ visible: false, title: "", message: "", type: "info" });
                        setConfirmInput("");
                        setConfirmTargetCode("");
                    } catch (error: any) {
                        setConfirmState(prev => ({ ...prev, loading: false }));
                        Alert.alert("Error", error.message || "Failed to archive property");
                    }
                }
            });
        } catch (error: any) {
            setLoading(false);
            console.error("Archive check error:", error);
            Alert.alert("Error", "Error checking tenants: " + error.message);
        }
    };

    const handleRestore = async (id: string, name: string) => {
        try {
            const restoredNameCandidate = name.split(" (Archived - ")[0];
            const conflict = pgs.find(p => p.status !== 'DELETED' && p.name.toLowerCase() === restoredNameCandidate.toLowerCase());

            if (conflict) {
                setConfirmState({
                    visible: true,
                    title: "Restore Blocked",
                    message: `Cannot restore: An active property named "${restoredNameCandidate}" already exists.`,
                    type: "danger",
                    singleButton: true,
                    cancelText: "Close"
                });
                return;
            }

            setConfirmState({
                visible: true,
                title: "Restore Property?",
                message: `Are you sure you want to restore "${restoredNameCandidate}" to active status?`,
                type: "success",
                confirmText: "Restore Now",
                cancelText: "Cancel",
                onConfirm: async () => {
                    try {
                        setConfirmState(prev => ({ ...prev, loading: true }));
                        await pgAPI.restore(id);
                        await fetchPGs();
                        setConfirmState({ visible: false, title: "", message: "", type: "info" });
                    } catch (error: any) {
                        setConfirmState(prev => ({ ...prev, loading: false }));
                        Alert.alert("Error", error.message || "Failed to restore property");
                    }
                }
            });
        } catch (error: any) {
            Alert.alert("Error", "Failed to initiate restore: " + error.message);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (activeTab === "Active") {
            handleArchive(id, name);
            return;
        }

        try {
            const deleteCode = generatePgDeleteCode(name);
            setConfirmTargetCode(deleteCode);
            setConfirmInput("");

            setConfirmState({
                visible: true,
                title: "Hard Delete Property?",
                message: `This will PERMANENTLY delete "${name}" and all related data. This action is irreversible!`,
                type: "danger",
                confirmText: "Hard Delete Now",
                cancelText: "Cancel",
                needsInput: true,
                inputPlaceholder: `Type "${deleteCode}" to confirm`,
                onConfirm: async () => {
                    try {
                        setConfirmState(prev => ({ ...prev, loading: true }));
                        await pgAPI.hardDelete(id);
                        await fetchPGs();
                        setConfirmState({ visible: false, title: "", message: "", type: "info" });
                        setConfirmInput("");
                        setConfirmTargetCode("");
                    } catch (error: any) {
                        setConfirmState(prev => ({ ...prev, loading: false }));
                        Alert.alert("Error", error.message || "Failed to delete property");
                    }
                }
            });
        } catch (error: any) {
            setLoading(false);
            Alert.alert("Error", error.message || "Something went wrong during deletion check");
        }
    };

    const showPropertyOptions = (item: any) => {
        Alert.alert(
            "Property Options",
            `Manage ${item.name}`,
            [
                { text: "Edit Details", onPress: () => handleEdit(item) },
                item.status === "ACTIVE"
                    ? { text: "Archive", onPress: () => handleArchive(item.id, item.name), style: "destructive" }
                    : { text: "Restore", onPress: () => handleRestore(item.id, item.name) },
                { text: "Delete Permanently", onPress: () => handleDelete(item.id, item.name), style: "destructive" },
                { text: "Cancel", style: "cancel" }
            ],
            { cancelable: true }
        );
    };

    const PropertyCard = ({ item }: { item: any }) => {
        const totalRooms = item.rooms?.[0]?.count || 0;
        const occupiedBeds = item.occupied_beds?.[0]?.count || 0;
        const totalBeds = item.beds?.[0]?.count || 0;
        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("RoomsBeds", { pgId: item.id, pgName: item.name })}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.propertyName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.locationContainer}>
                            <Feather name="map-pin" size={10} color={COLORS.textMuted} />
                            <Text style={styles.locationText} numberOfLines={1}>{item.city || "No location"}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCell}>
                        <Text style={styles.statValue}>{totalRooms}</Text>
                        <Text style={styles.statLabel}>Rooms</Text>
                    </View>
                    <View style={[styles.statCell, styles.statDivider]}>
                        <Text style={styles.statValue}>{totalBeds}</Text>
                        <Text style={styles.statLabel}>Total Beds</Text>
                    </View>
                    <View style={styles.statCell}>
                        <Text style={[styles.statValue, { color: COLORS.success }]}>{occupancyRate}%</Text>
                        <Text style={styles.statLabel}>Occupancy</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.badgeGroup}>
                        <View style={[styles.miniBadge, { backgroundColor: COLORS.primary + "10" }]}>
                            <Text style={[styles.miniBadgeText, { color: COLORS.primary }]}>{item.gender_type || "CO-LIVING"}</Text>
                        </View>
                        <View style={[styles.miniBadge, { backgroundColor: COLORS.success + "10" }]}>
                            <Text style={[styles.miniBadgeText, { color: COLORS.success }]}>{item.total_floors || 0} Floors</Text>
                        </View>
                        {item.status === 'ACTIVE' ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.miniBadge, { backgroundColor: COLORS.primary + "10", flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                                    onPress={() => handleEdit(item)}
                                >
                                    <Feather name="edit-2" size={10} color={COLORS.primary} />
                                    <Text style={[styles.miniBadgeText, { color: COLORS.primary }]}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.miniBadge, { backgroundColor: COLORS.warning + "10", flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                                    onPress={() => handleArchive(item.id, item.name)}
                                >
                                    <Feather name="archive" size={10} color={COLORS.warning} />
                                    <Text style={[styles.miniBadgeText, { color: COLORS.warning }]}>Archive</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[styles.miniBadge, { backgroundColor: COLORS.success + "10", flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                                    onPress={() => handleRestore(item.id, item.name)}
                                >
                                    <Feather name="refresh-ccw" size={10} color={COLORS.success} />
                                    <Text style={[styles.miniBadgeText, { color: COLORS.success }]}>Restore</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.miniBadge, { backgroundColor: COLORS.danger + "10", flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                                    onPress={() => handleDelete(item.id, item.name)}
                                >
                                    <Feather name="trash-2" size={10} color={COLORS.danger} />
                                    <Text style={[styles.miniBadgeText, { color: COLORS.danger }]}>Delete</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {item.status === 'ACTIVE' && (
                        <View style={[styles.statusIndicator, { backgroundColor: COLORS.success }]} />
                    )}
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
                <Text style={styles.appBarTitle}>PG Properties</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemeToggleButton style={{ marginRight: 12 }} />
                    <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                        <MaterialCommunityIcons name="database-sync" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Segmented Control for Tabs */}
            <View style={styles.controlsWrapper}>
                <View style={styles.segmentedControl}>
                    <TouchableOpacity
                        style={[styles.segment, activeTab === "Active" && styles.segmentActive]}
                        onPress={() => setActiveTab("Active")}
                    >
                        <Text style={[styles.segmentText, activeTab === "Active" && styles.segmentTextActive]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segment, activeTab === "Archived" && styles.segmentActive]}
                        onPress={() => setActiveTab("Archived")}
                    >
                        <Text style={[styles.segmentText, activeTab === "Archived" && styles.segmentTextActive]}>Archived</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Full Width Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Feather name="search" size={18} color={COLORS.textMuted} />
                    <TextInput
                        placeholder="Search by name or city..."
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
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredPgs}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <PropertyCard item={item} />}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyView}>
                            <MaterialCommunityIcons name="office-building-marker-outline" size={48} color={COLORS.textMuted + "30"} />
                            <Text style={styles.emptyTitle}>No properties found</Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={handleAdd}>
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>

            <PGFormModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={fetchPGs}
                editingPg={editingPg}
            />

            <ConfirmationModal
                visible={confirmState.visible}
                onClose={() => {
                    setConfirmState(prev => ({ ...prev, visible: false }));
                    setConfirmInput("");
                }}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
                confirmText={confirmTextForState(confirmState)}
                cancelText={confirmState.cancelText}
                loading={confirmState.loading}
                singleButton={confirmState.singleButton}
                needsInput={confirmState.needsInput}
                inputPlaceholder={confirmState.inputPlaceholder}
                inputValue={confirmInput}
                onInputChange={setConfirmInput}
                disableOutsideTap={confirmState.type === "danger"}
            />
        </SafeAreaView>
    );

    function confirmTextForState(state: any) {
        return state.confirmText || (state.type === 'danger' ? 'Delete' : 'Confirm');
    }
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
        appBarButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
        appBarTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },

        // Controls
        controlsWrapper: { padding: 16, paddingBottom: 8 },
        segmentedControl: {
            flexDirection: 'row',
            backgroundColor: COLORS.card,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
        segmentActive: { backgroundColor: COLORS.primary },
        segmentText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
        segmentTextActive: { color: '#fff' },

        // Search
        searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.card,
            borderRadius: 12,
            paddingHorizontal: 16,
            height: 48,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        searchInput: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: COLORS.text },

        // List
        listContent: { padding: 16, paddingBottom: 100 },
        card: {
            backgroundColor: COLORS.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 2,
        },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
        headerLeft: { flex: 1, marginRight: 12 },
        propertyName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
        locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
        locationText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
        menuBtn: { padding: 4 },

        statsGrid: {
            flexDirection: 'row',
            backgroundColor: COLORS.bg + '50',
            borderRadius: 12,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: COLORS.border + '40',
            marginBottom: 16
        },
        statCell: { flex: 1, alignItems: 'center' },
        statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border + '40' },
        statValue: { fontSize: 16, fontWeight: '900', color: COLORS.text },
        statLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },

        cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        badgeGroup: { flexDirection: 'row', gap: 8 },
        miniBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
        miniBadgeText: { fontSize: 9, fontWeight: '900' },
        statusIndicator: { width: 8, height: 8, borderRadius: 4 },

        // States
        centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        emptyView: { alignItems: 'center', marginTop: 60, gap: 12 },
        emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMuted },

        fab: {
            position: 'absolute',
            bottom: 30,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.primary,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 8,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
        }
    });

export default PGsScreen;
