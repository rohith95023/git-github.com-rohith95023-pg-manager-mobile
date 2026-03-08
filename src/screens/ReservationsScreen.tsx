import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/common/ScreenHeader";
import BookingModal from '../components/modals/BookingModal';
import useThemePalette from "../hooks/useThemePalette";
import { reservationAPI } from "../services/api";

const ReservationsScreen = ({ navigation }: any) => {
    const COLORS = useThemePalette();
    const isFocused = useIsFocused();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [bookings, setBookings] = useState<any[]>([]);
    const [isBookingModalVisible, setBookingModalVisible] = useState(false);
    const [editingBooking, setEditingBooking] = useState<any>(null);

    const loadBookings = useCallback(async () => {
        setLoading(true);
        try {
            const data: any = await reservationAPI.getAll();
            const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
            setBookings(items);
        } catch (error) {
            console.error("Failed to fetch bookings:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            loadBookings();
        }
    }, [isFocused, loadBookings]);

    const onRefresh = () => {
        setRefreshing(true);
        loadBookings();
    };

    const handleAddBooking = () => {
        setEditingBooking(null);
        setBookingModalVisible(true);
    };

    const handleEditBooking = (booking: any) => {
        setEditingBooking(booking);
        setBookingModalVisible(true);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'CONFIRMED': return COLORS.success;
            case 'PENDING': return COLORS.warning;
            case 'CANCELLED': return COLORS.danger;
            default: return COLORS.textMuted;
        }
    };

    const BookingCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
            onPress={() => handleEditBooking(item)}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: COLORS.primary + "15" }]}>
                    <Feather name="calendar" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.guestName, { color: COLORS.text }]}>{item.guest_name || "Unknown Guest"}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "15" }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Feather name="home" size={14} color={COLORS.textMuted} />
                    <Text style={[styles.infoText, { color: COLORS.textMuted }]}>
                        Room: {item.room_number || "N/A"}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Feather name="clock" size={14} color={COLORS.textMuted} />
                    <Text style={[styles.infoText, { color: COLORS.textMuted }]}>
                        {new Date(item.check_in).toLocaleDateString()} - {new Date(item.check_out).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: COLORS.bg }]}>
            <ScreenHeader
                title="Reservations"
                onLeftPress={() => navigation.openDrawer()}
            />

            <FlatList
                data={bookings}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <BookingCard item={item} />}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyView}>
                        {loading ? (
                            <ActivityIndicator color={COLORS.primary} size="large" />
                        ) : (
                            <>
                                <Feather name="calendar" size={50} color={COLORS.textMuted} />
                                <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No reservations found</Text>
                            </>
                        )}
                    </View>
                }
            />

            <TouchableOpacity style={[styles.fab, { backgroundColor: COLORS.primary }]} onPress={handleAddBooking}>
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>

            <BookingModal
                visible={isBookingModalVisible}
                onClose={() => setBookingModalVisible(false)}
                onSuccess={loadBookings}
                booking={editingBooking}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    // appBar styles removed
    listContent: { padding: 16, paddingBottom: 100 },
    card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    guestName: { fontSize: 16, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    cardBody: { gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 13, fontWeight: '500' },
    fab: { position: 'absolute', bottom: 30, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
    emptyView: { marginTop: 100, alignItems: 'center' },
    emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: '600' }
});

export default ReservationsScreen;
