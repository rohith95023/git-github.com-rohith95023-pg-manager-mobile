import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/common/ScreenHeader";
import MaintenanceModal from "../components/modals/MaintenanceModal";
import useThemePalette from "../hooks/useThemePalette";
import { maintenanceAPI } from "../services/api";

const MaintenanceScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const isFocused = useIsFocused();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data: any = await maintenanceAPI.getAll();
            const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
            setRequests(items);
        } catch (error) {
            console.error("Failed to fetch maintenance requests:", error);
            Alert.alert("Error", "Could not load maintenance data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [fetchData, isFocused]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleAddRequest = () => {
        setSelectedRequest(null);
        setModalVisible(true);
    };

    const handleEditRequest = (request: any) => {
        setSelectedRequest(request);
        setModalVisible(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RESOLVED': return COLORS.success;
            case 'IN_PROGRESS': return COLORS.primary;
            case 'PENDING': return COLORS.warning;
            default: return COLORS.textMuted;
        }
    };

    const filteredRequests = useMemo(() => {
        if (filter === 'ALL') return requests;
        return requests.filter(r => r.status === filter);
    }, [requests, filter]);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleEditRequest(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.entityName}>
                        {item.room_number ? `Room ${item.room_number}` : item.bed_number ? `Bed ${item.bed_number}` : 'General'}
                    </Text>
                    <Text style={styles.pgName}>{item.pg_name || 'System Request'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <Text style={styles.description} numberOfLines={2}>
                {item.description}
            </Text>

            <View style={styles.cardFooter}>
                <View style={styles.footerInfo}>
                    <Feather name="calendar" size={12} color={COLORS.textMuted} />
                    <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                {item.cost > 0 && (
                    <Text style={styles.costText}>₹{item.cost.toLocaleString()}</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.bg },
        appBarButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

        filterRow: {
            flexDirection: 'row',
            padding: 16,
            backgroundColor: COLORS.card,
            gap: 8,
        },
        filterChip: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: COLORS.bg,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        filterChipActive: {
            backgroundColor: COLORS.primary,
            borderColor: COLORS.primary,
        },
        filterChipText: {
            fontSize: 12,
            fontWeight: '700',
            color: COLORS.textMuted,
        },
        filterChipTextActive: {
            color: '#fff',
        },

        listContent: { padding: 16, paddingBottom: 100 },
        card: {
            backgroundColor: COLORS.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
        },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
        headerLeft: { flex: 1 },
        entityName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
        pgName: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
        statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
        statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
        description: { fontSize: 14, color: COLORS.textMuted, marginBottom: 16, lineHeight: 20 },
        cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        dateText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
        costText: { fontSize: 14, fontWeight: '800', color: COLORS.danger },

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
            shadowRadius: 8,
        },

        emptyContainer: {
            marginTop: 100,
            alignItems: 'center',
            justifyContent: 'center',
        },
        emptyTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: COLORS.text,
            marginTop: 16,
        },
        emptySubtitle: {
            fontSize: 14,
            color: COLORS.textMuted,
            marginTop: 8,
            textAlign: 'center',
            paddingHorizontal: 40,
        },
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader
                title="Maintenance"
                onLeftPress={() => navigation.openDrawer()}
                rightElement={
                    <TouchableOpacity onPress={onRefresh} style={styles.appBarButton}>
                        <Feather name="refresh-cw" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.filterRow}>
                {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filter === f && styles.filterChipActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                            {f.charAt(0) + f.slice(1).toLowerCase().replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={filteredRequests}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="wrench" size={60} color={COLORS.textMuted} />
                            <Text style={styles.emptyTitle}>No Maintenance Tasks</Text>
                            <Text style={styles.emptySubtitle}>All properties are currently in top shape!</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={handleAddRequest}>
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>

            <MaintenanceModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={fetchData}
                editingRequest={selectedRequest}
            />
        </SafeAreaView>
    );
};

export default MaintenanceScreen;
