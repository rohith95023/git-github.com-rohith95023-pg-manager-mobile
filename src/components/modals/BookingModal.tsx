import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { reservationAPI, roomAPI } from '../../services/api';
import DropdownSelector from '../common/DropdownSelector';

interface BookingModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    booking?: any;
}

const BookingModal: React.FC<BookingModalProps> = ({ visible, onClose, onSuccess, booking }) => {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState<any[]>([]);

    // Form State
    const [guestName, setGuestName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [status, setStatus] = useState('PENDING');

    useEffect(() => {
        if (visible) {
            fetchRooms();
            if (booking) {
                setGuestName(booking.guest_name);
                setRoomId(booking.room_id);
                setCheckIn(booking.check_in.split('T')[0]);
                setCheckOut(booking.check_out.split('T')[0]);
                setStatus(booking.status);
            } else {
                setGuestName('');
                setRoomId('');
                setCheckIn(new Date().toISOString().split('T')[0]);
                setCheckOut(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
                setStatus('PENDING');
            }
        }
    }, [visible, booking]);

    const fetchRooms = async () => {
        try {
            const data: any = await roomAPI.getAll();
            setRooms(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching rooms:", error);
        }
    };

    const handleSubmit = async () => {
        if (!guestName || !roomId || !checkIn || !checkOut) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                guest_name: guestName,
                room_id: roomId,
                check_in: checkIn,
                check_out: checkOut,
                status: status
            };

            if (booking) {
                await reservationAPI.update(booking.id, payload);
            } else {
                await reservationAPI.create(payload);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to save booking.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Booking",
            "Are you sure you want to delete this reservation?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await reservationAPI.delete(booking.id);
                            onSuccess();
                            onClose();
                        } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed to delete booking.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            {booking ? "Edit Reservation" : "New Reservation"}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Guest Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="Full Name"
                            placeholderTextColor={colors.textSecondary}
                            value={guestName}
                            onChangeText={setGuestName}
                        />

                        <DropdownSelector
                            label="Room"
                            options={rooms.map(r => ({ label: `Room ${r.room_number}`, value: r.id }))}
                            value={roomId}
                            onChange={setRoomId}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Check In (YYYY-MM-DD)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.textSecondary}
                            value={checkIn}
                            onChangeText={setCheckIn}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Check Out (YYYY-MM-DD)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.textSecondary}
                            value={checkOut}
                            onChangeText={setCheckOut}
                        />

                        <DropdownSelector
                            label="Status"
                            options={[
                                { label: 'Pending', value: 'PENDING' },
                                { label: 'Confirmed', value: 'CONFIRMED' },
                                { label: 'Cancelled', value: 'CANCELLED' },
                            ]}
                            value={status}
                            onChange={setStatus}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: colors.primary }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save Reservation</Text>}
                        </TouchableOpacity>

                        {booking && (
                            <TouchableOpacity
                                style={[styles.deleteButton, { borderColor: colors.danger }]}
                                onPress={handleDelete}
                                disabled={loading}
                            >
                                <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete Reservation</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: '800' },
    form: { marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 16 },
    input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, fontWeight: '600' },
    submitButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    deleteButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 12, borderWidth: 1 },
    deleteButtonText: { fontSize: 16, fontWeight: '700' },
});

export default BookingModal;
