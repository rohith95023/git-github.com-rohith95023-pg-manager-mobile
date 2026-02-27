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
import { tenantAPI } from "../services/api";
import { Feather } from "@expo/vector-icons";

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
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    avatarContainer: { marginRight: 12 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 16, justifyContent: "center", alignItems: "center" },
    avatarText: { fontSize: 20, fontWeight: "900" },
    tenantBasicInfo: { flex: 1 },
    tenantName: { fontSize: 17, fontWeight: "800" },
    tenantSub: { fontSize: 12, fontWeight: "600", marginTop: 2 },
    statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
    divider: { height: 1, width: "100%", backgroundColor: "rgba(0,0,0,0.05)", marginBottom: 16 },
    infoGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
    infoItem: { flex: 1, gap: 4 },
    infoLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    infoValue: { fontSize: 13, fontWeight: "700" },
    contactRow: { flexDirection: "row", gap: 12 },
    contactButton: {
        flex: 1,
        height: 40,
        borderRadius: 12,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8
    },
    contactButtonText: { fontSize: 13, fontWeight: "700" },
    emptyState: { alignItems: "center", marginTop: 60, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: "600" }
});

const TenantsScreen = ({ navigation }: any) => {
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tenants, setTenants] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const maskAadhaar = (num: any) => {
        if (!num) return "ID: N/A";
        const s = String(num);
        if (s.length < 12) return s;
        return `XXXX XXXX ${s.slice(-4)}`;
    };

    const fetchTenants = useCallback(async () => {
        try {
            const response: any = await tenantAPI.search({ page: 1, limit: 100 });
            setTenants(response.data || []);
        } catch (error) {
            console.error("Failed to fetch tenants:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTenants();
    };

    const filteredTenants = tenants.filter(t =>
        (t.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.phone || "").includes(searchTerm)
    );

    const calculateDues = (item: any) => {
        let due = 0;
        if (item.stay_type === 'DAILY') {
            const daily = Array.isArray(item.daily_stay_details) ? item.daily_stay_details[0] : item.daily_stay_details;
            if (daily?.move_in_date && daily?.vacate_date) {
                const start = new Date(daily.move_in_date);
                const end = new Date(daily.vacate_date);
                let diffDays = 1;
                if (end > start) {
                    diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                }
                const rentBase = diffDays * Number(daily.rent_per_day || item.rent_per_day || 0);
                const maintenanceBase = Number(daily.maintenance_amount || item.maintenance_amount || 0);
                const totalRent = rentBase + maintenanceBase;
                due = Math.max(0, totalRent - Number(daily.paid_amount || 0));
            } else {
                due = Number(item.daily_stay_details?.balance_amount || item.balance_amount || 0);
            }
        } else {
            due = Number(item.balance || 0);
        }
        return due;
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE': return '#10b981';
            case 'UPCOMING': return '#3b82f6';
            case 'OVERDUE': return '#ef4444';
            case 'INACTIVE': return '#6b7280';
            default: return colors.textSecondary;
        }
    };

    const renderTenantItem = ({ item }: { item: any }) => {
        const dues = calculateDues(item);
        const statusColor = getStatusColor(item.status);

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.avatarText, { color: colors.primary }]}>
                                {(item.full_name || "U")[0].toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.tenantBasicInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.tenantName, { color: colors.text }]}>{item.full_name}</Text>
                            {item.stay_type === 'DAILY' && (
                                <View style={{ backgroundColor: '#f59e0b', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>DAILY</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.tenantSub, { color: colors.textSecondary }]}>{item.profession || "No Profession"}</Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>🪪 {maskAadhaar(item.id_number)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Feather name="home" size={14} color={colors.textSecondary} />
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Property</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                            {item.pgs?.name || "N/A"}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Feather name="box" size={14} color={colors.textSecondary} />
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Room</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                            {item.rooms?.room_number || "N/A"}{item.beds?.bed_number ? ` - ${item.beds.bed_number}` : ""}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Feather name="credit-card" size={14} color={colors.textSecondary} />
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Balance</Text>
                        <Text style={[styles.infoValue, { color: dues > 0 ? '#ef4444' : '#10b981' }]}>
                            ₹{dues.toLocaleString()}
                        </Text>
                    </View>
                </View>

                <View style={[styles.contactRow, { marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="calendar" size={14} color={colors.textSecondary} />
                        <View>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>JOINED</Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                                {new Date(item.move_in_date || item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                    {item.stay_type === 'DAILY' && (
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b' }}>ENDS</Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#f59e0b' }}>
                                {new Date(item.daily_stay_details?.vacate_date || item.vacate_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.contactRow}>
                    <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.background }]}>
                        <Feather name="phone" size={16} color={colors.primary} />
                        <Text style={[styles.contactButtonText, { color: colors.text }]}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.background }]}>
                        <Feather name="message-square" size={16} color={colors.primary} />
                        <Text style={[styles.contactButtonText, { color: colors.text }]}>Message</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Residents</Text>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
                    <Feather name="plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    placeholder="Search name, phone, email..."
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
                    data={filteredTenants}
                    renderItem={renderTenantItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Feather name="users" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No residents found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};


export default TenantsScreen;
