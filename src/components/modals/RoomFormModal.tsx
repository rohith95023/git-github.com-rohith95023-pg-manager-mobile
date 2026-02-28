import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FormModal from "../common/FormModal";
import FormField from "../common/FormField";
import DropdownSelector from "../common/DropdownSelector";
import useThemePalette from "../../hooks/useThemePalette";
import ConfirmationModal from "../common/ConfirmationModal";
import { pgAPI, roomAPI } from "../../services/api";

const ROOM_TYPES = [
    { label: "1 Share", value: "SINGLE", capacity: 1 },
    { label: "2 Share", value: "DOUBLE", capacity: 2 },
    { label: "3 Share", value: "TRIPLE", capacity: 3 },
    { label: "4 Share", value: "FOUR_SHARE", capacity: 4 },
    { label: "5 Share", value: "FIVE_SHARE", capacity: 5 },
    { label: "Others", value: "OTHERS", capacity: 0 },
];

const roomSchema = z.object({
    pgId: z.string().min(1, "Property is required"),
    floor: z.coerce.number().int().min(0, "Invalid floor"),
    roomNumber: z.string().trim().min(1, "Room number is required"),
    roomType: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "FOUR_SHARE", "FIVE_SHARE", "OTHERS"]),
    capacity: z.coerce.number().int().min(1, "Min 1").max(99, "Max 99"),
    rent: z.coerce.number().min(0, "Cannot be negative"),
    deposit: z.coerce.number().min(0, "Cannot be negative"),
    status: z.enum(["AVAILABLE", "MAINTENANCE", "INACTIVE"]),
});

type RoomFormData = z.infer<typeof roomSchema>;

interface RoomFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingRoom?: any;
    initialPgId?: string;
}

const RoomFormModal: React.FC<RoomFormModalProps> = ({ visible, onClose, onSuccess, editingRoom, initialPgId }) => {
    const COLORS = useThemePalette();
    const [loading, setLoading] = useState(false);
    const [pgs, setPgs] = useState<any[]>([]);

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
        onClose?: () => void;
    }>({
        visible: false,
        title: "",
        message: "",
        type: "info"
    });

    const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RoomFormData>({
        resolver: zodResolver(roomSchema) as any,
        mode: "all",
        defaultValues: {
            pgId: initialPgId || "",
            floor: 0,
            roomNumber: "",
            roomType: "SINGLE",
            capacity: 1,
            rent: 0,
            deposit: 0,
            status: "AVAILABLE",
        }
    });

    const selectedPgId = watch("pgId");
    const selectedRoomType = watch("roomType");

    const selectedPg = useMemo(() => pgs.find(p => p.id === selectedPgId), [pgs, selectedPgId]);

    const floorOptions = useMemo(() => {
        if (!selectedPg) return [];
        const floors = [];
        for (let i = 0; i <= (selectedPg.total_floors || 0); i++) {
            floors.push({
                label: i === 0 ? "Ground Floor" : `Floor ${i}`,
                value: String(i)
            });
        }
        return floors;
    }, [selectedPg]);

    useEffect(() => {
        const fetchPgs = async () => {
            const data = await pgAPI.getActive();
            setPgs((data as any) || []);
        };
        if (visible) fetchPgs();
    }, [visible]);

    useEffect(() => {
        if (visible) {
            if (editingRoom) {
                reset({
                    ...editingRoom,
                    pgId: editingRoom.pg_id,
                    floor: editingRoom.floor,
                    roomNumber: editingRoom.room_number,
                    roomType: editingRoom.room_type,
                    capacity: editingRoom.capacity,
                    rent: Number(editingRoom.rent),
                    deposit: Number(editingRoom.deposit || 0),
                    status: editingRoom.status === "OCCUPIED" ? "AVAILABLE" : editingRoom.status,
                });
            } else {
                reset({
                    pgId: initialPgId || "",
                    floor: "" as any,
                    roomNumber: "",
                    roomType: "SINGLE",
                    capacity: 1,
                    rent: "" as any,
                    deposit: selectedPg?.security_deposit || "" as any,
                    status: "AVAILABLE",
                });
            }
        }
    }, [visible, editingRoom, reset, initialPgId]);

    useEffect(() => {
        if (selectedRoomType !== "OTHERS") {
            const type = ROOM_TYPES.find(r => r.value === selectedRoomType);
            if (type) setValue("capacity", type.capacity);
        }
    }, [selectedRoomType, setValue]);

    useEffect(() => {
        if (selectedPg && !editingRoom) {
            setValue("deposit", selectedPg.security_deposit || 0);
        }
    }, [selectedPg, editingRoom, setValue]);

    const onSubmit = async (data: RoomFormData) => {
        try {
            setLoading(true);
            const submissionData = {
                pg_id: data.pgId,
                floor: data.floor,
                room_number: data.roomNumber,
                room_type: data.roomType,
                capacity: data.capacity,
                rent: data.rent,
                deposit: data.deposit,
                status: data.status,
            };

            if (editingRoom) {
                await roomAPI.update(editingRoom.id, submissionData);
                setConfirmState({
                    visible: true,
                    title: "Room Updated",
                    message: "The room details have been saved successfully.",
                    type: "success",
                    singleButton: true,
                    cancelText: "Great",
                    onClose: () => {
                        setConfirmState(prev => ({ ...prev, visible: false }));
                        onSuccess();
                        onClose();
                    }
                });
            } else {
                await roomAPI.create(submissionData);
                setConfirmState({
                    visible: true,
                    title: "Room Created",
                    message: "New room and its beds have been generated successfully.",
                    type: "success",
                    singleButton: true,
                    cancelText: "Awesome",
                    onClose: () => {
                        setConfirmState(prev => ({ ...prev, visible: false }));
                        onSuccess();
                        onClose();
                    }
                });
            }
        } catch (error: any) {
            setConfirmState({
                visible: true,
                title: "Error",
                message: error.message || "Something went wrong while saving the room.",
                type: "danger",
                singleButton: true,
                cancelText: "Retry"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            visible={visible}
            onClose={onClose}
            onSubmit={handleSubmit(onSubmit)}
            title={editingRoom ? "Edit Room" : "Add Room"}
            subtitle="Manage your room inventory"
            loading={loading}
        >
            <View style={styles.sectionHeader}>
                <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>ROOM PLACEMENT</Text>
            </View>

            <Controller
                control={control}
                name="pgId"
                render={({ field: { onChange, value } }) => (
                    <DropdownSelector
                        label="Select Property *"
                        options={pgs.map(p => ({ label: p.name, value: p.id }))}
                        value={value}
                        onChange={onChange}
                        placeholder="Select PG"
                    />
                )}
            />

            <Controller
                control={control}
                name="floor"
                render={({ field: { onChange, value } }) => (
                    <DropdownSelector
                        label="Floor Number *"
                        options={floorOptions}
                        value={value !== undefined && value !== null ? String(value) : ""}
                        onChange={(val) => onChange(val === "" ? "" : Number(val))}
                        placeholder={selectedPgId ? "Select Floor" : "Select Property First"}
                        disabled={!selectedPgId}
                    />
                )}
            />

            <View style={styles.sectionHeader}>
                <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>ROOM SPECIFICATIONS</Text>
            </View>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="roomNumber"
                        render={({ field: { onChange, value } }) => (
                            <FormField label="Room Number *" placeholder="e.g. 101" value={value} onChangeText={onChange} error={errors.roomNumber?.message} />
                        )}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Controller
                        control={control}
                        name="roomType"
                        render={({ field: { onChange, value } }) => (
                            <DropdownSelector
                                label="Room Type *"
                                options={ROOM_TYPES.map(t => ({ label: t.label, value: t.value }))}
                                value={value}
                                onChange={onChange}
                            />
                        )}
                    />
                </View>
            </View>

            {selectedRoomType === "OTHERS" && (
                <Controller
                    control={control}
                    name="capacity"
                    render={({ field: { onChange, value } }) => (
                        <FormField label="Sharing Count (Max 99) *" placeholder="Enter capacity" value={value ? String(value) : ""} onChangeText={onChange} error={errors.capacity?.message} keyboardType="numeric" maxLength={2} />
                    )}
                />
            )}

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="rent"
                        render={({ field: { onChange, value } }) => (
                            <FormField
                                label="Monthly Rent (₹) *"
                                placeholder="3000"
                                value={value !== undefined && value !== null ? String(value) : ""}
                                onChangeText={(text) => onChange(text === "" ? "" : Number(text))}
                                error={errors.rent?.message}
                                keyboardType="numeric"
                            />
                        )}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Controller
                        control={control}
                        name="deposit"
                        render={({ field: { onChange, value } }) => (
                            <FormField
                                label="Security Deposit (₹) *"
                                placeholder="5000"
                                value={value !== undefined && value !== null ? String(value) : ""}
                                onChangeText={(text) => onChange(text === "" ? "" : Number(text))}
                                error={errors.deposit?.message}
                                keyboardType="numeric"
                            />
                        )}
                    />
                </View>
            </View>

            <Controller
                control={control}
                name="status"
                render={({ field: { onChange, value } }) => (
                    <DropdownSelector
                        label="Initial Status *"
                        options={[
                            { label: "Active", value: "AVAILABLE" },
                            { label: "Maintenance", value: "MAINTENANCE" },
                            { label: "Inactive", value: "INACTIVE" }
                        ]}
                        value={value}
                        onChange={onChange}
                    />
                )}
            />

            <View style={[styles.hintCard, { backgroundColor: COLORS.primary + "10", borderColor: COLORS.primary + "20" }]}>
                <MaterialCommunityIcons name="bed-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.hintText, { color: COLORS.primary }]}>
                    AUTO: {watch("capacity") || 0} BEDS WILL BE GENERATED
                </Text>
            </View>

            <ConfirmationModal
                visible={confirmState.visible}
                onClose={() => {
                    const callback = confirmState.onClose;
                    setConfirmState(prev => ({ ...prev, visible: false }));
                    if (callback) callback();
                }}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                loading={confirmState.loading}
                singleButton={confirmState.singleButton}
            />
        </FormModal>
    );
};

const styles = StyleSheet.create({
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
        marginBottom: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1,
    },
    row: {
        flexDirection: "row",
    },
    hintCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
    },
    hintText: {
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 0.5,
    },
});

export default RoomFormModal;
