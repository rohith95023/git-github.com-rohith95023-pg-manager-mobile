import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import FormModal from "../common/FormModal";
import FormField from "../common/FormField";
import DropdownSelector from "../common/DropdownSelector";
import SegmentedControl from "../common/SegmentedControl";
import useThemePalette from "../../hooks/useThemePalette";
import ConfirmationModal from "../common/ConfirmationModal";
import { Feather } from "@expo/vector-icons";
import { pgAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";

const AMENITIES_LIST = [
    "WiFi", "AC", "Power Backup", "Parking", "CCTV",
    "Laundry", "Food", "Geyser", "Gym", "Clean Service"
];

const pgSchema = z.object({
    name: z.string().trim().min(3, "Min 3 characters").max(100),
    support_contact: z.string().trim().length(10, "Must be 10 digits").regex(/^[0-9]+$/, "Digits only"),
    total_floors: z.preprocess((val) => (val === "" || val === undefined ? undefined : Number(val)), z.number().int().min(1, "Min 1 floor").max(99, "Max 99 floors")),
    security_deposit: z.preprocess((val) => (val === "" || val === undefined ? undefined : Number(val)), z.number().min(0, "Min 0")),
    maintenance_amount: z.preprocess((val) => (val === "" || val === undefined ? 0 : Number(val)), z.number().min(0, "Min 0").optional().default(0)),
    maintenance_type: z.string().nullable().optional(),
    gender_type: z.enum(["MALE", "FEMALE", "CO-LIVING"]),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    address: z.string().trim().min(5, "Min 5 characters").max(60),
    city: z.string().trim().min(2, "Min 2 characters").max(30),
    state: z.string().trim().min(2, "Min 2 characters").max(30),
    pincode: z.string().length(6, "Must be 6 digits").regex(/^[0-9]{6}$/, "Digits only"),
    amenities: z.array(z.string()).default([]),
}).refine((data) => {
    if (data.maintenance_amount && data.maintenance_amount > 0 && !data.maintenance_type) {
        return false;
    }
    return true;
}, {
    message: "Maintenance type is required",
    path: ["maintenance_type"]
});

type PGFormData = z.infer<typeof pgSchema>;

interface PGFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingPg?: any;
}

const PGFormModal: React.FC<PGFormModalProps> = ({ visible, onClose, onSuccess, editingPg }) => {
    const COLORS = useThemePalette();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

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

    const { control, handleSubmit, reset, watch, setValue, formState: { errors }, trigger } = useForm<PGFormData>({
        resolver: zodResolver(pgSchema) as any,
        mode: "onChange",
        shouldUnregister: false,
        defaultValues: {
            name: "",
            support_contact: "",
            total_floors: 0,
            security_deposit: 0,
            maintenance_amount: 0,
            maintenance_type: null,
            gender_type: "MALE",
            status: "ACTIVE",
            address: "",
            city: "",
            state: "",
            pincode: "",
            amenities: [],
        }
    });

    useEffect(() => {
        if (visible) {
            if (editingPg) {
                reset({
                    ...editingPg,
                    amenities: editingPg.amenities || [],
                    maintenance_type: editingPg.maintenance_type || null,
                });
            } else {
                reset({
                    name: "",
                    support_contact: "",
                    total_floors: "" as any,
                    security_deposit: "" as any,
                    maintenance_amount: "" as any,
                    maintenance_type: null,
                    gender_type: "MALE",
                    status: "ACTIVE",
                    address: "",
                    city: "",
                    state: "",
                    pincode: "",
                    amenities: [],
                });
            }
            setCurrentStep(1);
        }
    }, [visible, editingPg, reset]);

    const handleFormSubmit = async (data: PGFormData) => {
        try {
            if (currentStep === 1) {
                setLoading(true);
                const step1Fields: (keyof PGFormData)[] = ["name", "support_contact", "total_floors", "security_deposit", "maintenance_amount", "maintenance_type", "gender_type", "status"];
                const isValid = await trigger(step1Fields);

                if (isValid) {
                    setCurrentStep(2);
                } else {
                    console.log("Step 1 validation failed:", errors);
                }
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User session not found");

            const payload = {
                ...data,
                owner_id: user.id
            };

            if (editingPg) {
                await pgAPI.update(editingPg.id, payload);
                setConfirmState({
                    visible: true,
                    title: "Update Successful",
                    message: "Property details have been updated successfully.",
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
                await pgAPI.create(payload);
                setConfirmState({
                    visible: true,
                    title: "Property Created",
                    message: "New property has been registered successfully.",
                    type: "success",
                    singleButton: true,
                    cancelText: "Finish",
                    onClose: () => {
                        setConfirmState(prev => ({ ...prev, visible: false }));
                        onSuccess();
                        onClose();
                    }
                });
            }
        } catch (error: any) {
            console.error(error);
            setConfirmState({
                visible: true,
                title: "Error",
                message: error.message || "Failed to save property.",
                type: "danger",
                singleButton: true,
                cancelText: "Retry"
            });
        } finally {
            setLoading(false);
        }
    };

    const onInvalidSubmit = (errs: any) => {
        console.log("Final Submission Validation Failed:", errs);

        const step1Fields = ["name", "support_contact", "total_floors", "security_deposit", "maintenance_amount", "maintenance_type", "gender_type", "status"];
        const hasStep1Errors = step1Fields.some(field => errs[field]);

        if (hasStep1Errors) {
            setConfirmState({
                visible: true,
                title: "Validation Error",
                message: "Please verify Step 1 fields. Some data might be incomplete or invalid.",
                type: "warning",
                singleButton: true,
                cancelText: "Check Step 1",
                onClose: () => {
                    setConfirmState(prev => ({ ...prev, visible: false }));
                    setCurrentStep(1);
                }
            });
        } else {
            setConfirmState({
                visible: true,
                title: "Address Incomplete",
                message: "Please fill all required address fields in Step 2.",
                type: "warning",
                singleButton: true,
                cancelText: "Complete Address"
            });
        }
    };

    const selectedAmenities = watch("amenities") || [];

    const toggleAmenity = (amenity: string) => {
        if (selectedAmenities.includes(amenity)) {
            setValue("amenities", selectedAmenities.filter(a => a !== amenity));
        } else {
            setValue("amenities", [...selectedAmenities, amenity]);
        }
    };

    const handleFinalSubmit = handleSubmit(handleFormSubmit, onInvalidSubmit);

    return (
        <FormModal
            visible={visible}
            onClose={onClose}
            onSubmit={currentStep === 1 ? () => handleFormSubmit(watch()) : handleFinalSubmit}
            title={editingPg ? "Edit Property" : "Add Property"}
            subtitle={`Step ${currentStep} of 2`}
            loading={loading}
            submitLabel={currentStep === 1 ? "Next: Location Details" : (editingPg ? "Update Property" : "Create Property")}
        >
            {/* Visual Progress Indicator */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: COLORS.border }]}>
                    <View style={[styles.progressFill, { backgroundColor: COLORS.primary, width: currentStep === 1 ? '50%' : '100%' }]} />
                </View>
                <View style={styles.stepIcons}>
                    <View style={[styles.stepIcon, currentStep >= 1 && { backgroundColor: COLORS.primary }]}>
                        <Feather name="home" size={14} color={currentStep >= 1 ? "#fff" : COLORS.textMuted} />
                    </View>
                    <View style={[styles.stepIcon, currentStep >= 2 && { backgroundColor: COLORS.primary }]}>
                        <Feather name="map-pin" size={14} color={currentStep >= 2 ? "#fff" : COLORS.textMuted} />
                    </View>
                </View>
            </View>

            <View style={{ display: currentStep === 1 ? 'flex' : 'none' }}>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, value } }) => (
                        <FormField label="Building Name *" placeholder="E.g. Heritage Heights" value={value} onChangeText={onChange} error={errors.name?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="support_contact"
                    render={({ field: { onChange, value } }) => (
                        <FormField label="Support Contact *" placeholder="10-digit number" value={value} onChangeText={onChange} error={errors.support_contact?.message} icon="phone" keyboardType="phone-pad" maxLength={10} />
                    )}
                />
                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Controller
                            control={control}
                            name="total_floors"
                            render={({ field: { onChange, value } }) => (
                                <FormField
                                    label="Floors *"
                                    placeholder="Max 99"
                                    value={value === undefined || value === null || value === 0 ? "" : String(value)}
                                    onChangeText={(t) => {
                                        const sanitized = t.replace(/[^0-9]/g, '');
                                        onChange(sanitized === "" ? "" : sanitized);
                                    }}
                                    error={errors.total_floors?.message}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                            )}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Controller
                            control={control}
                            name="security_deposit"
                            render={({ field: { onChange, value } }) => (
                                <FormField
                                    label="Deposit *"
                                    placeholder="Per room"
                                    value={value === undefined || value === null || value === 0 ? "" : String(value)}
                                    onChangeText={(t) => {
                                        const sanitized = t.replace(/[^0-9]/g, '');
                                        onChange(sanitized === "" ? "" : sanitized);
                                    }}
                                    error={errors.security_deposit?.message}
                                    keyboardType="number-pad"
                                />
                            )}
                        />
                    </View>
                </View>

                <View style={styles.flatterSection}>
                    <Text style={[styles.label, { color: COLORS.textMuted, marginBottom: 12 }]}>MAINTENANCE CHARGES</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Controller
                                control={control}
                                name="maintenance_amount"
                                render={({ field: { onChange, value } }) => (
                                    <FormField
                                        label="Amount"
                                        placeholder="0"
                                        value={value === undefined || value === null || value === 0 ? "" : String(value)}
                                        onChangeText={(t) => {
                                            const sanitized = t.replace(/[^0-9]/g, '');
                                            onChange(sanitized === "" ? 0 : sanitized);
                                        }}
                                        error={errors.maintenance_amount?.message}
                                        keyboardType="number-pad"
                                    />
                                )}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Controller
                                control={control}
                                name="maintenance_type"
                                render={({ field: { onChange, value } }) => (
                                    <DropdownSelector
                                        label="Collection"
                                        options={[
                                            { label: "One Time", value: "one_time" },
                                            { label: "Monthly", value: "monthly" }
                                        ]}
                                        value={value || ""}
                                        onChange={onChange}
                                        placeholder="Type"
                                        error={errors.maintenance_type?.message}
                                    />
                                )}
                            />
                        </View>
                    </View>
                </View>

                <Controller
                    control={control}
                    name="gender_type"
                    render={({ field: { onChange, value } }) => (
                        <SegmentedControl
                            label="Gender Policy"
                            options={[
                                { label: "Male", value: "MALE" },
                                { label: "Female", value: "FEMALE" }
                            ]}
                            value={value}
                            onChange={onChange}
                            error={errors.gender_type?.message}
                        />
                    )}
                />
            </View>

            <View style={{ display: currentStep === 2 ? 'flex' : 'none' }}>
                <Controller
                    control={control}
                    name="address"
                    render={({ field: { onChange, value } }) => (
                        <FormField label="Full Address *" placeholder="Street, Area" value={value} onChangeText={onChange} error={errors.address?.message} />
                    )}
                />
                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Controller
                            control={control}
                            name="city"
                            render={({ field: { onChange, value } }) => (
                                <FormField label="City *" placeholder="City" value={value} onChangeText={onChange} error={errors.city?.message} />
                            )}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Controller
                            control={control}
                            name="state"
                            render={({ field: { onChange, value } }) => (
                                <FormField label="State *" placeholder="State" value={value} onChangeText={onChange} error={errors.state?.message} />
                            )}
                        />
                    </View>
                </View>
                <Controller
                    control={control}
                    name="pincode"
                    render={({ field: { onChange, value } }) => (
                        <FormField label="Pincode *" placeholder="6 digits" value={value} onChangeText={onChange} error={errors.pincode?.message} keyboardType="numeric" maxLength={6} />
                    )}
                />

                <Text style={[styles.label, { color: COLORS.textMuted, marginTop: 10 }]}>AMENITIES</Text>
                <View style={styles.amenitiesContainer}>
                    {AMENITIES_LIST.map(amenity => (
                        <TouchableOpacity
                            key={amenity}
                            onPress={() => toggleAmenity(amenity)}
                            style={[
                                styles.amenityBadge,
                                {
                                    backgroundColor: selectedAmenities.includes(amenity) ? COLORS.primary : COLORS.card,
                                    borderColor: selectedAmenities.includes(amenity) ? COLORS.primary : COLORS.border,
                                    borderWidth: 1.5
                                }
                            ]}
                        >
                            <Text style={[styles.amenityText, { color: selectedAmenities.includes(amenity) ? '#fff' : COLORS.textMuted }]}>{amenity}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
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
    row: {
        flexDirection: "row",
    },
    flatterSection: {
        marginBottom: 8,
    },
    label: {
        fontSize: 10,
        fontWeight: "900",
        marginBottom: 8,
        letterSpacing: 1,
    },
    progressContainer: {
        marginBottom: 32,
        paddingHorizontal: 20,
        position: 'relative',
        height: 30, // Fixed height to contain icons
        justifyContent: 'center',
    },
    progressBar: {
        width: '100%',
        height: 4,
        borderRadius: 2,
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    stepIcons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        position: 'absolute',
        top: 3, // Center on the bar roughly
        left: 20,
    },
    stepIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    amenitiesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 8,
    },
    amenityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    amenityText: {
        fontSize: 12,
        fontWeight: "800",
    },
    backBtn: {
        marginBottom: 16,
    },
    backText: {
        fontSize: 14,
        fontWeight: "700",
    },
});

export default PGFormModal;
