import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import FormModal from "../common/FormModal";
import FormField from "../common/FormField";
import DropdownSelector from "../common/DropdownSelector";
import DatePickerField from "../common/DatePickerField";
import useThemePalette from "../../hooks/useThemePalette";
import ConfirmationModal from "../common/ConfirmationModal";
import { pgAPI, roomAPI, bedAPI, tenantAPI, paymentAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";

const PROFESSION_OPTIONS = [
    "Software Engineer", "IT Professional", "Student", "Business Owner",
    "Sales/Marketing", "Medical Professional", "Government Employee",
    "Hospitallity", "Freelancer", "Teacher/Professor", "Other"
];

const onboardingSchema = z.object({
    // Step 1: Personal Details
    fullName: z.string().trim().min(3, "Min 3 characters").regex(/^[a-zA-Z\s.]+$/, "Only letters, spaces, and dots"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().regex(/^[0-9]{10}$/, "10-digit number"),
    gender: z.enum(["MALE", "FEMALE"]),
    dob: z.string().min(1, "DOB is required"),
    profession: z.string().min(1, "Profession is required"),
    guardianName: z.string().optional().or(z.literal("")),
    guardianPhone: z.string().regex(/^[0-9]{10}$/, "10-digit number").optional().or(z.literal("")),
    idType: z.enum(["AADHAR", "PAN", "PASSPORT", "DL", "VOTER"]),
    idNumber: z.string().trim().min(5, "Min 5 characters").max(20, "Max 20 characters"),

    // Step 2: Stay Details
    pgId: z.string().min(1, "Property is required"),
    roomId: z.string().min(1, "Room is required"),
    bedId: z.string().min(1, "Bed is required"),
    stayType: z.enum(["MONTHLY", "DAILY"]),
    joinedDate: z.string().min(1, "Joined Date is required"),
    vacateDate: z.string().optional().or(z.literal("")),
    rentPaymentType: z.enum(["FIXED_FIRST_DAY", "JOIN_DATE_BASED"]),
    rentAmount: z.coerce.number().min(0),
    securityDeposit: z.coerce.number().min(0).default(0),
    maintenanceAmount: z.coerce.number().min(0).default(0),
    maintenanceType: z.string().nullable().optional(),

    // Payment during onboarding
    paidAmount: z.coerce.number().min(0).default(0),
    paymentMethod: z.enum(["CASH", "ONLINE", "UPI", "BANK_TRANSFER"]).default("CASH"),
}).superRefine((data, ctx) => {
    // 1. Step 1 Refinements (Identity)
    if (data.idType === "AADHAR" && !/^\d{12}$/.test(data.idNumber)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Aadhaar must be exactly 12 digits",
            path: ["idNumber"],
        });
    }
    if (data.idType === "PAN" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.idNumber.toUpperCase())) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid PAN format (ABCDE1234F)",
            path: ["idNumber"],
        });
    }

    // 2. Step 1 Refinements (Guardian for minors)
    const birthYear = new Date(data.dob).getFullYear();
    const currentYear = new Date().getFullYear();
    if (currentYear - birthYear < 18 && (!data.guardianName || !data.guardianPhone)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Guardian info required for minors",
            path: ["guardianName"],
        });
    }

    // 3. Step 2 Refinements (Vacate date for daily stay)
    if (data.stayType === "DAILY" && !data.vacateDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Vacate date is required for daily stay",
            path: ["vacateDate"],
        });
    }
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface UnifiedStayManagerProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingTenant?: any;
}

const UnifiedStayManager: React.FC<UnifiedStayManagerProps> = ({ visible, onClose, onSuccess, editingTenant }) => {
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

    const [pgs, setPgs] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);

    const { control, handleSubmit, reset, watch, setValue, trigger, formState: { errors } } = useForm<OnboardingFormData>({
        resolver: zodResolver(onboardingSchema) as any,
        mode: "all",
        defaultValues: {
            fullName: "",
            email: "",
            phone: "",
            gender: "MALE",
            dob: "",
            profession: "",
            guardianName: "",
            guardianPhone: "",
            idType: "AADHAR",
            idNumber: "",
            pgId: "",
            roomId: "",
            bedId: "",
            stayType: "MONTHLY",
            joinedDate: new Date().toISOString().split('T')[0],
            vacateDate: "",
            rentPaymentType: "FIXED_FIRST_DAY",
            rentAmount: 0,
            securityDeposit: 0,
            maintenanceAmount: 0,
            maintenanceType: null,
            paidAmount: 0,
            paymentMethod: "CASH",
        }
    });

    const watchPgId = watch("pgId");
    const watchRoomId = watch("roomId");
    const watchStayType = watch("stayType");

    // Data fetching
    useEffect(() => {
        if (visible) {
            const fetchPgs = async () => {
                const data = await pgAPI.getActive();
                setPgs((data as any) || []);
            };
            fetchPgs();

            if (editingTenant) {
                // Map database fields to form fields
                reset({
                    fullName: editingTenant.full_name,
                    email: editingTenant.email || "",
                    phone: editingTenant.phone,
                    gender: editingTenant.gender,
                    dob: editingTenant.dob,
                    profession: editingTenant.profession,
                    guardianName: editingTenant.guardian_name || "",
                    guardianPhone: editingTenant.guardian_phone || "",
                    idType: editingTenant.id_type,
                    idNumber: editingTenant.id_number,
                    pgId: editingTenant.pg_id,
                    roomId: editingTenant.room_id,
                    bedId: editingTenant.bed_id,
                    stayType: editingTenant.stay_type,
                    joinedDate: editingTenant.move_in_date,
                    vacateDate: editingTenant.vacate_date || "",
                    rentPaymentType: editingTenant.rent_cycle || "FIXED_FIRST_DAY",
                    rentAmount: editingTenant.custom_rent || editingTenant.rent_per_month || editingTenant.rent_per_day || 0,
                    securityDeposit: editingTenant.security_deposit || 0,
                    maintenanceAmount: editingTenant.maintenance_amount || 0,
                    maintenanceType: editingTenant.maintenance_type || null,
                    paidAmount: 0, // Reset payment for editing
                    paymentMethod: "CASH",
                });
            } else {
                reset();
                setCurrentStep(1);
            }
        }
    }, [visible, editingTenant, reset]);

    useEffect(() => {
        // Only clear if not in editing mode initialization
        if (!editingTenant || watch("idType") !== editingTenant.id_type) {
            setValue("idNumber", "");
        }
    }, [watch("idType"), setValue, editingTenant]);

    useEffect(() => {
        if (watchPgId) {
            const fetchRooms = async () => {
                const data = await roomAPI.getActiveByPgId(watchPgId);
                const roomsData = (data as any) || [];
                setRooms(roomsData);

                // Check for ANY available beds in the entire PG
                const { count, error } = await supabase
                    .from("beds")
                    .select("id", { count: "exact", head: true })
                    .eq("pg_id", watchPgId)
                    .eq("status", "AVAILABLE");

                if (!error && count === 0 && !editingTenant) {
                    setConfirmState({
                        visible: true,
                        title: "Property Full",
                        message: "No beds available in selected property. Please select another property or free up a bed first.",
                        type: "danger",
                        singleButton: true,
                        cancelText: "Go Back",
                        onClose: () => {
                            setValue("pgId", "");
                            setConfirmState(prev => ({ ...prev, visible: false }));
                        }
                    });
                }
            };
            fetchRooms();
        } else {
            setRooms([]);
        }
    }, [watchPgId]);

    useEffect(() => {
        if (watchRoomId) {
            const fetchBeds = async () => {
                const data = await bedAPI.getByRoomId(watchRoomId);
                const bedsData = (data as any) || [];

                // Check if this specific room has available beds
                const hasAvailable = bedsData.some((b: any) => b.status === "AVAILABLE" || b.id === editingTenant?.bed_id);
                if (!hasAvailable && !editingTenant) {
                    setConfirmState({
                        visible: true,
                        title: "Room Full",
                        message: "No beds available in this room. Please select another room.",
                        type: "warning",
                        singleButton: true,
                        cancelText: "Select Another",
                        onClose: () => {
                            setValue("roomId", "");
                            setConfirmState(prev => ({ ...prev, visible: false }));
                        }
                    });
                }

                // Sort to put available beds first
                const sorted = bedsData.sort((a: any, b: any) => {
                    if (a.status === "AVAILABLE" && b.status !== "AVAILABLE") return -1;
                    if (a.status !== "AVAILABLE" && b.status === "AVAILABLE") return 1;
                    return a.bed_number.localeCompare(b.bed_number, undefined, { numeric: true });
                });
                setBeds(sorted);
            };
            fetchBeds();

            // Auto-fill rent/maintenance from room info
            const room = rooms.find(r => r.id === watchRoomId);
            if (room && watchStayType === "MONTHLY") {
                setValue("rentAmount", Number(room.rent || 0));
            }
        } else {
            setBeds([]);
        }
    }, [watchRoomId, watchStayType]); // rent relies on both room and stayType

    useEffect(() => {
        if (watchStayType === "DAILY") {
            setValue("maintenanceAmount", 0);
            setValue("securityDeposit", 0);
            setValue("rentPaymentType", "JOIN_DATE_BASED");
        } else if (watchStayType === "MONTHLY" && watchPgId) {
            const pg = pgs.find(p => p.id === watchPgId);
            if (pg) {
                setValue("maintenanceAmount", pg.maintenance_amount || 0);
                setValue("maintenanceType", pg.maintenance_type);
                setValue("securityDeposit", pg.security_deposit || 0);
                setValue("rentPaymentType", "FIXED_FIRST_DAY");
            }
        }
    }, [watchStayType, watchPgId, pgs]);

    const handleFormSubmit = async (data: OnboardingFormData) => {
        if (currentStep === 1) {
            const fieldsToValidate: any[] = [
                "fullName", "phone", "gender", "dob", "profession",
                "idType", "idNumber", "guardianName", "guardianPhone"
            ];
            const isValid = await trigger(fieldsToValidate);
            if (isValid) {
                // Check if user is minor
                const birthYear = new Date(data.dob).getFullYear();
                const currentYear = new Date().getFullYear();
                if (currentYear - birthYear < 18 && (!data.guardianName || !data.guardianPhone)) {
                    Alert.alert("Error", "Guardian name and phone are required for residents under 18 years.");
                    return;
                }

                // Check for duplicate ID
                try {
                    setLoading(true);
                    const { data: exists } = await supabase
                        .from("tenants")
                        .select("id")
                        .eq("id_type", data.idType)
                        .eq("id_number", data.idNumber)
                        .neq("id", editingTenant?.id || "00000000-0000-0000-0000-000000000000")
                        .maybeSingle();

                    if (exists) {
                        setConfirmState({
                            visible: true,
                            title: "Resident Exists",
                            message: `A resident with this ${data.idType} is already registered in the system. Please verify details.`,
                            type: "danger",
                            singleButton: true,
                            cancelText: "Close"
                        });
                    } else {
                        setCurrentStep(2);
                    }
                } catch (err) {
                    console.error("Duplicate ID check error:", err);
                } finally {
                    setLoading(false);
                }
            } else {
                console.log("Step 1 Validation Errors:", errors);
            }
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            // Calculate Initial Dues and Balance
            let initialDue = 0;
            let totalDailyRent = 0;

            if (data.stayType === "DAILY" && data.vacateDate) {
                const start = new Date(data.joinedDate);
                const end = new Date(data.vacateDate);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                totalDailyRent = (Number(data.rentAmount) || 0) * diffDays;
                initialDue = totalDailyRent + (Number(data.maintenanceAmount) || 0);
            } else {
                // Monthly: Initial Due = Rent + Maintenance (if any)
                initialDue = (Number(data.rentAmount) || 0) + (Number(data.maintenanceAmount) || 0);
            }

            const initialBalance = Math.max(0, initialDue - (Number(data.paidAmount) || 0));

            const payload: any = {
                full_name: data.fullName,
                email: data.email || null,
                phone: data.phone,
                gender: data.gender,
                dob: data.dob || null,
                profession: data.profession || null,
                guardian_name: data.guardianName || null,
                guardian_phone: data.guardianPhone || null,
                id_type: data.idType,
                id_number: data.idNumber,
                pg_id: data.pgId,
                room_id: data.roomId,
                bed_id: data.bedId,
                stay_type: data.stayType,
                rent_cycle: data.rentPaymentType,
                move_in_date: data.joinedDate,
                vacate_date: data.stayType === "DAILY" ? data.vacateDate : null,
                rent_per_month: data.stayType === "MONTHLY" ? (Number(data.rentAmount) || 0) : null,
                rent_per_day: data.stayType === "DAILY" ? (Number(data.rentAmount) || 0) : null,
                total_rent: data.stayType === "DAILY" ? totalDailyRent : null,
                paid_amount: Number(data.paidAmount) || 0,
                balance_amount: initialBalance,
                custom_rent: data.stayType === "MONTHLY" ? (Number(data.rentAmount) || 0) : null,
                maintenance_amount: Number(data.maintenanceAmount) || 0,
                maintenance_type: data.maintenanceType || null,
                security_deposit: Number(data.securityDeposit) || 0,
                status: "ACTIVE",
                owner_id: user?.id
            };

            // Only set balance for new onboards, don't override on edit
            if (!editingTenant) {
                payload.balance = initialBalance;
            }

            let tenantId = editingTenant?.id;

            if (editingTenant) {
                await tenantAPI.update(editingTenant.id, payload);
                // Handle Bed Change
                if (editingTenant.bed_id !== data.bedId) {
                    // Free old bed
                    await bedAPI.update(editingTenant.bed_id, { status: "AVAILABLE", tenant_id: null });
                    // Occupy new bed
                    await bedAPI.update(data.bedId, { status: "OCCUPIED", tenant_id: tenantId });
                    // Sync occupancy
                    await roomAPI.recalculateOccupancy(editingTenant.room_id);
                }
            } else {
                const tenant = await tenantAPI.create(payload);
                tenantId = tenant.id;
                // Occupy bed
                await bedAPI.update(data.bedId, { status: "OCCUPIED", tenant_id: tenantId });
            }

            // Always sync current room occupancy
            await roomAPI.recalculateOccupancy(data.roomId);

            // 2. handle Payment
            if (data.paidAmount > 0) {
                await paymentAPI.create({
                    tenant_id: tenantId,
                    pg_id: data.pgId,
                    amount: data.paidAmount,
                    payment_date: data.joinedDate,
                    status: "COMPLETED",
                    type: "RENT",
                    payment_method: data.paymentMethod,
                    billing_month: `${data.joinedDate.slice(0, 7)}-01`,
                    notes: `Onboarding payment: ₹${data.paidAmount}`,
                    owner_id: user?.id
                });
            }

            setConfirmState({
                visible: true,
                title: "Success",
                message: editingTenant ? "Resident profile updated successfully." : "Resident onboarded successfully.",
                type: "success",
                singleButton: true,
                cancelText: "Great",
                onClose: () => {
                    setConfirmState(prev => ({ ...prev, visible: false }));
                    onSuccess();
                    onClose();
                }
            });
        } catch (error: any) {
            console.error(error);
            setConfirmState({
                visible: true,
                title: "Operation Failed",
                message: error.message || "Something went wrong during onboarding/update.",
                type: "danger",
                singleButton: true,
                cancelText: "Review Form"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            visible={visible}
            onClose={onClose}
            onSubmit={currentStep === 1
                ? () => handleFormSubmit(watch())
                : handleSubmit(handleFormSubmit, (err) => console.log("Step 2 Validation Errors:", err))}
            title={editingTenant ? "Edit Resident" : "Resident Onboarding"}
            subtitle={`Step ${currentStep} of 2`}
            loading={loading}
            submitLabel={currentStep === 1 ? "Next Step" : (editingTenant ? "Update Resident" : "Complete Onboarding")}
        >
            <View style={{ display: currentStep === 1 ? "flex" : "none" }}>
                <Controller
                    control={control}
                    name="fullName"
                    render={({ field: { onChange, value } }) => (
                        <FormField label="Full Name *" placeholder="Resident's Name" value={value} onChangeText={onChange} error={errors.fullName?.message} icon="user" />
                    )}
                />
                <View style={styles.row}>
                    <View style={{ flex: 1.2, marginRight: 8 }}>
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field: { onChange, value } }) => (
                                <FormField label="Phone *" placeholder="10-digit number" value={value} onChangeText={onChange} error={errors.phone?.message} icon="phone" keyboardType="phone-pad" maxLength={10} />
                            )}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Controller
                            control={control}
                            name="gender"
                            render={({ field: { onChange, value } }) => (
                                <DropdownSelector label="Gender *" options={[{ label: 'Male', value: 'MALE' }, { label: 'Female', value: 'FEMALE' }]} value={value} onChange={onChange} error={errors.gender?.message} />
                            )}
                        />
                    </View>
                </View>

                <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, value } }) => (
                        <FormField label="Email Address" placeholder="resident@example.com" value={value} onChangeText={onChange} error={errors.email?.message} icon="mail" keyboardType="email-address" autoCapitalize="none" />
                    )}
                />

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Controller
                            control={control}
                            name="dob"
                            render={({ field: { onChange, value } }) => (
                                <DatePickerField label="Date of Birth *" value={value} onChange={onChange} error={errors.dob?.message} />
                            )}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Controller
                            control={control}
                            name="profession"
                            render={({ field: { onChange, value } }) => (
                                <DropdownSelector label="Profession *" options={PROFESSION_OPTIONS.map(p => ({ label: p, value: p }))} value={value} onChange={onChange} error={errors.profession?.message} />
                            )}
                        />
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                    <Text style={[styles.sectionTitle, { color: COLORS.textMuted }]}>IDENTITY PROOF</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Controller
                                control={control}
                                name="idType"
                                render={({ field: { onChange, value } }) => (
                                    <DropdownSelector label="ID Type *" options={['AADHAR', 'PAN', 'PASSPORT', 'DL', 'VOTER'].map(p => ({ label: p, value: p }))} value={value} onChange={onChange} />
                                )}
                            />
                        </View>
                        <View style={{ flex: 1.5, marginLeft: 8 }}>
                            <Controller
                                control={control}
                                name="idNumber"
                                render={({ field: { onChange, value } }) => {
                                    const idType = watch("idType");
                                    let keyboardType: any = "default";
                                    let maxLength = 20;
                                    let autoCap: any = "none";
                                    let placeholder = "Enter ID Details";

                                    if (idType === "AADHAR") {
                                        keyboardType = "number-pad";
                                        maxLength = 12;
                                        placeholder = "12 digit number";
                                    } else if (idType === "PAN") {
                                        maxLength = 10;
                                        autoCap = "characters";
                                        placeholder = "ABCDE1234F";
                                    }

                                    return (
                                        <FormField
                                            label="ID Number *"
                                            placeholder={placeholder}
                                            value={value}
                                            onChangeText={(text) => {
                                                const cleanText = idType === "AADHAR" ? text.replace(/[^0-9]/g, '') : text;
                                                onChange(cleanText);
                                            }}
                                            error={errors.idNumber?.message}
                                            keyboardType={keyboardType}
                                            maxLength={maxLength}
                                            autoCapitalize={autoCap}
                                        />
                                    );
                                }}
                            />
                        </View>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                    <Text style={[styles.sectionTitle, { color: COLORS.textMuted }]}>GUARDIAN INFO (FOR MINORS)</Text>
                    <Controller
                        control={control}
                        name="guardianName"
                        render={({ field: { onChange, value } }) => (
                            <FormField label="Guardian Name" placeholder="Parent/Guardian Name" value={value} onChangeText={onChange} error={errors.guardianName?.message} />
                        )}
                    />
                    <Controller
                        control={control}
                        name="guardianPhone"
                        render={({ field: { onChange, value } }) => (
                            <FormField label="Guardian Phone" placeholder="10-digit number" value={value} onChangeText={onChange} error={errors.guardianPhone?.message} keyboardType="phone-pad" maxLength={10} />
                        )}
                    />
                </View>
            </View>

            <View style={{ display: currentStep === 2 ? "flex" : "none" }}>
                <TouchableOpacity onPress={() => setCurrentStep(1)} style={styles.backBtn}>
                    <Text style={[styles.backText, { color: COLORS.primary }]}>← Back to Personal Details</Text>
                </TouchableOpacity>

                <Controller
                    control={control}
                    name="pgId"
                    render={({ field: { onChange, value } }) => (
                        <DropdownSelector
                            label="Property *"
                            options={pgs.map(p => ({ label: p.name, value: p.id }))}
                            value={value}
                            onChange={onChange}
                            error={errors.pgId?.message}
                            placeholder="Select PG"
                        />
                    )}
                />

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Controller
                            control={control}
                            name="roomId"
                            render={({ field: { onChange, value } }) => (
                                <DropdownSelector
                                    label="Room *"
                                    options={rooms.map(r => ({ label: `Room ${r.room_number}`, value: r.id }))}
                                    value={value}
                                    onChange={onChange}
                                    error={errors.roomId?.message}
                                    placeholder="Select Room"
                                    disabled={!watchPgId}
                                />
                            )}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Controller
                            control={control}
                            name="bedId"
                            render={({ field: { onChange, value } }) => (
                                <DropdownSelector
                                    label="Bed *"
                                    options={beds.map(b => ({
                                        label: `Bed ${b.bed_number}${b.status !== 'AVAILABLE' ? ' (Occupied)' : ''}`,
                                        value: b.id,
                                        disabled: b.status !== 'AVAILABLE' && b.id !== editingTenant?.bed_id
                                    }))}
                                    value={value}
                                    onChange={onChange}
                                    error={errors.bedId?.message}
                                    placeholder="Select Bed"
                                    disabled={!watchRoomId}
                                />
                            )}
                        />
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                    <Text style={[styles.sectionTitle, { color: COLORS.textMuted }]}>STAY CONFIGURATION</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Controller
                                control={control}
                                name="stayType"
                                render={({ field: { onChange, value } }) => (
                                    <DropdownSelector
                                        label="Stay Type *"
                                        options={[
                                            { label: "Monthly", value: "MONTHLY" },
                                            { label: "Daily", value: "DAILY" }
                                        ]}
                                        value={value}
                                        onChange={onChange}
                                    />
                                )}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Controller
                                control={control}
                                name="joinedDate"
                                render={({ field: { onChange, value } }) => (
                                    <DatePickerField label="Join Date *" value={value} onChange={onChange} error={errors.joinedDate?.message} />
                                )}
                            />
                        </View>
                    </View>

                    {watchStayType === 'DAILY' && (
                        <Controller
                            control={control}
                            name="vacateDate"
                            render={({ field: { onChange, value } }) => (
                                <DatePickerField label="Vacate Date *" value={value || ""} onChange={onChange} error={errors.vacateDate?.message} />
                            )}
                        />
                    )}

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Controller
                                control={control}
                                name="rentAmount"
                                render={({ field: { onChange, value } }) => (
                                    <FormField label="Rent Amount *" placeholder="0" value={value !== undefined ? String(value) : ""} onChangeText={(t) => onChange(t === "" ? 0 : Number(t))} error={errors.rentAmount?.message} keyboardType="numeric" />
                                )}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Controller
                                control={control}
                                name="securityDeposit"
                                render={({ field: { onChange, value } }) => (
                                    <FormField label="Security Deposit" placeholder="0" value={value !== undefined ? String(value) : ""} onChangeText={(t) => onChange(t === "" ? 0 : Number(t))} error={errors.securityDeposit?.message} keyboardType="numeric" />
                                )}
                            />
                        </View>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                    <Text style={[styles.sectionTitle, { color: COLORS.textMuted }]}>INITIAL PAYMENT</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1.5, marginRight: 8 }}>
                            <Controller
                                control={control}
                                name="paidAmount"
                                render={({ field: { onChange, value } }) => (
                                    <FormField label="Amount Paid Now" placeholder="₹ 0.00" value={value !== undefined ? String(value) : ""} onChangeText={(t) => onChange(t === "" ? 0 : Number(t))} keyboardType="numeric" icon="credit-card" />
                                )}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Controller
                                control={control}
                                name="paymentMethod"
                                render={({ field: { onChange, value } }) => (
                                    <DropdownSelector
                                        label="Method"
                                        options={[
                                            { label: "Cash", value: "CASH" },
                                            { label: "UPI", value: "UPI" },
                                            { label: "Bank", value: "BANK_TRANSFER" },
                                            { label: "Online", value: "ONLINE" }
                                        ]}
                                        value={value}
                                        onChange={onChange}
                                    />
                                )}
                            />
                        </View>
                    </View>
                </View>
            </View>

            <ConfirmationModal
                visible={confirmState.visible}
                onClose={() => {
                    const callback = (confirmState as any).onClose;
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
    section: {
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: "900",
        marginBottom: 10,
        letterSpacing: 1,
    },
    backBtn: {
        marginBottom: 16,
    },
    backText: {
        fontSize: 14,
        fontWeight: "700",
    },
});

export default UnifiedStayManager;
