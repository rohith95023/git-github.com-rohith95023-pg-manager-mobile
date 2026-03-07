import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import useThemePalette from "../../hooks/useThemePalette";
import { bedAPI, maintenanceAPI, pgAPI, roomAPI } from "../../services/api";
import DropdownSelector from "../common/DropdownSelector";

interface MaintenanceModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingRequest?: any;
}

const MaintenanceModal = ({ visible, onClose, onSuccess, editingRequest }: MaintenanceModalProps) => {
    const COLORS = useThemePalette();
    const [loading, setLoading] = useState(false);
    const [fetchingOptions, setFetchingOptions] = useState(false);

    // Form State
    const [type, setType] = useState<'ROOM' | 'BED' | 'GENERAL'>('ROOM');
    const [entityId, setEntityId] = useState("");
    const [pgId, setPgId] = useState("");
    const [description, setDescription] = useState("");
    const [cost, setCost] = useState("");
    const [status, setStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'RESOLVED'>('PENDING');

    // Options State
    const [pgs, setPgs] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);

    useEffect(() => {
        if (visible) {
            if (editingRequest) {
                setType(editingRequest.entity_type || 'ROOM');
                setEntityId(editingRequest.entity_id || "");
                setPgId(editingRequest.pg_id || "");
                setDescription(editingRequest.description || "");
                setCost(editingRequest.cost?.toString() || "");
                setStatus(editingRequest.status || 'PENDING');
            } else {
                resetForm();
            }
            fetchOptions();
        }
    }, [visible, editingRequest]);

    const resetForm = () => {
        setType('ROOM');
        setEntityId("");
        setPgId("");
        setDescription("");
        setCost("");
        setStatus('PENDING');
    };

    const fetchOptions = async () => {
        try {
            setFetchingOptions(true);
            const [pgsData, roomsData, bedsData] = await Promise.all([
                pgAPI.getAll(),
                roomAPI.getAll(),
                bedAPI.getAll()
            ]);
            setPgs(Array.isArray(pgsData) ? pgsData : []);
            setRooms(Array.isArray(roomsData) ? roomsData : []);
            setBeds(Array.isArray(bedsData) ? bedsData : []);
        } catch (error) {
            console.error("Failed to fetch options:", error);
        } finally {
            setFetchingOptions(false);
        }
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            Alert.alert("Missing Information", "Please provide a description of the issue.");
            return;
        }

        if (type !== 'GENERAL' && !entityId) {
            Alert.alert("Missing Information", `Please select a ${type.toLowerCase()}.`);
            return;
        }

        try {
            setLoading(true);
            const payload = {
                entity_type: type,
                entity_id: entityId,
                pg_id: pgId,
                description,
                cost: parseFloat(cost) || 0,
                status,
                // These are for denormalized display in the list
                room_number: type === 'ROOM' ? rooms.find(r => r.id === entityId)?.room_number : null,
                bed_number: type === 'BED' ? beds.find(b => b.id === entityId)?.bed_number : null,
                pg_name: pgs.find(p => p.id === pgId)?.name || null
            };

            if (editingRequest) {
                await maintenanceAPI.update(editingRequest.id, payload);
            } else {
                await maintenanceAPI.create(payload);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Save maintenance error:", error);
            Alert.alert("Error", "Failed to save maintenance request.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Request",
            "Are you sure you want to delete this maintenance record?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await maintenanceAPI.delete(editingRequest.id);
                            onSuccess();
                            onClose();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete request.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const filteredRooms = rooms.filter(r => !pgId || r.pg_id === pgId);
    const filteredBeds = beds.filter(b => {
        if (!entityId && type === 'BED') return true; // Show all if no room selected yet? Actually we should probably group by room
        return b.room_id === entityId;
    });

    const styles = StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
        },
        container: {
            backgroundColor: COLORS.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            maxHeight: '90%',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
        },
        title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
        content: { padding: 20 },

        label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 16 },
        input: {
            backgroundColor: COLORS.bg,
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
            color: COLORS.text,
            borderWidth: 1,
            borderColor: COLORS.border,
        },
        textArea: {
            height: 100,
            textAlignVertical: 'top',
        },

        typeContainer: {
            flexDirection: 'row',
            backgroundColor: COLORS.bg,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 8
        },
        typeButton: {
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            borderRadius: 8
        },
        typeButtonActive: {
            backgroundColor: COLORS.primary,
        },
        typeText: {
            fontSize: 13,
            fontWeight: '700',
            color: COLORS.textMuted
        },
        typeTextActive: {
            color: '#fff'
        },

        footer: {
            flexDirection: 'row',
            gap: 12,
            padding: 20,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
        },
        submitButton: {
            flex: 2,
            backgroundColor: COLORS.primary,
            height: 54,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
        },
        deleteButton: {
            flex: 1,
            backgroundColor: COLORS.danger + '12',
            height: 54,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.danger + '20',
        },
        buttonText: { color: "#fff", fontSize: 16, fontWeight: '800' },
    });

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{editingRequest ? "Edit Task" : "New Maintenance Task"}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>Issue Source</Text>
                        <View style={styles.typeContainer}>
                            {(['ROOM', 'BED', 'GENERAL'] as const).map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.typeButton, type === t && styles.typeButtonActive]}
                                    onPress={() => { setType(t); setEntityId(""); }}
                                >
                                    <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <DropdownSelector
                            label="Property"
                            options={pgs.map(p => ({ label: p.name, value: p.id }))}
                            value={pgId}
                            onChange={(val) => { setPgId(val); setEntityId(""); }}
                        />

                        {type === 'ROOM' && (
                            <DropdownSelector
                                label="Select Room"
                                options={filteredRooms.map(r => ({ label: `Room ${r.room_number}`, value: r.id }))}
                                value={entityId}
                                onChange={setEntityId}
                            />
                        )}

                        {type === 'BED' && (
                            <>
                                <DropdownSelector
                                    label="Select Room"
                                    options={filteredRooms.map(r => ({ label: `Room ${r.room_number}`, value: r.id }))}
                                    value={rooms.find(r => r.beds?.some((b: any) => b.id === entityId))?.id || ""}
                                    onChange={(val) => { /* Filtering beds handled by filteredBeds logic if we add a room ref */ }}
                                />
                                <DropdownSelector
                                    label="Select Bed"
                                    options={beds.filter(b => !pgId || b.rooms?.pg_id === pgId).map(b => ({ label: `${b.bed_number} (Room ${b.rooms?.room_number})`, value: b.id }))}
                                    value={entityId}
                                    onChange={setEntityId}
                                />
                            </>
                        )}

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe the issue in detail..."
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                        />

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Estimated Cost (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="numeric"
                                    value={cost}
                                    onChangeText={setCost}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Status</Text>
                                <View style={{ height: 52 }}>
                                    <DropdownSelector
                                        label=""
                                        options={[
                                            { label: 'Pending', value: 'PENDING' },
                                            { label: 'In Progress', value: 'IN_PROGRESS' },
                                            { label: 'Resolved', value: 'RESOLVED' },
                                        ]}
                                        value={status}
                                        onChange={(val) => setStatus(val as any)}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    <View style={styles.footer}>
                        {editingRequest && (
                            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                                <Feather name="trash-2" size={20} color={COLORS.danger} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <Text style={styles.buttonText}>{editingRequest ? "Update Task" : "Create Task"}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default MaintenanceModal;
