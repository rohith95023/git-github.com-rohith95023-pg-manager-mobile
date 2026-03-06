import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import FormModal from "../common/FormModal";
import FormField from "../common/FormField";
import DropdownSelector from "../common/DropdownSelector";
import SegmentedControl from "../common/SegmentedControl";
import DatePickerField from "../common/DatePickerField";
import useThemePalette from "../../hooks/useThemePalette";
import ConfirmationModal from "../common/ConfirmationModal";
import { pgAPI, roomAPI, bedAPI, tenantAPI, paymentAPI } from "../../services/api";
import { billingService } from "../../services/billing.service";
import { supabase } from "../../lib/supabaseClient";
import NotificationService from "../../services/NotificationService";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

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
    rentAmount: z.preprocess((val) => (val === "" || val === undefined || val === null ? -1 : Number(val)), z.number().min(0, "Rent amount is required")),
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

    if (data.stayType === "DAILY" && data.vacateDate && data.joinedDate) {
        if (new Date(data.vacateDate) < new Date(data.joinedDate)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Vacate date cannot be before join date",
                path: ["vacateDate"],
            });
        }
    }
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface UnifiedStayManagerProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingTenant?: any;
}

const DEFAULT_VALUES: OnboardingFormData = {
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
    rentAmount: "" as any,
    securityDeposit: 0,
    maintenanceAmount: 0,
    maintenanceType: null,
    paidAmount: 0,
    paymentMethod: "CASH",
};

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
        defaultValues: DEFAULT_VALUES
    });

    const watchPgId = watch("pgId");
    const watchRoomId = watch("roomId");
    const watchStayType = watch("stayType");
    const watchRentAmount = watch("rentAmount");
    const watchMaintenanceAmount = watch("maintenanceAmount");
    const watchJoinedDate = watch("joinedDate");
    const watchVacateDate = watch("vacateDate");
    const watchSecurityDeposit = watch("securityDeposit");

    // Data fetching
    useEffect(() => {
        if (visible) {
            const fetchPgs = async () => {
                const data = await pgAPI.getActive();
                setPgs((data as any) || []);
            };
            fetchPgs();

            if (editingTenant) {
                const daily = editingTenant.daily_stay_details?.[0] || editingTenant.daily_stay_details;
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
                    vacateDate: editingTenant.vacate_date || daily?.vacate_date || "",
                    rentPaymentType: editingTenant.rent_cycle || "FIXED_FIRST_DAY",
                    rentAmount: editingTenant.stay_type === "DAILY"
                        ? (daily?.rent_per_day || editingTenant.rent_per_day || 0)
                        : (editingTenant.custom_rent || editingTenant.rent_per_month || editingTenant.rooms?.rent || 0),
                    securityDeposit: editingTenant.security_deposit || 0,
                    maintenanceAmount: editingTenant.maintenance_amount || daily?.maintenance_amount || 0,
                    maintenanceType: editingTenant.maintenance_type || daily?.maintenance_type || null,
                    paidAmount: 0,
                    paymentMethod: "CASH",
                });
            } else {
                reset(DEFAULT_VALUES);
                setRooms([]);
                setBeds([]);
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

                // Check for ANY available beds in the entire PG and ignore inactive/maintenance rooms
                const { data: availableBedsInPg, error } = await supabase
                    .from("beds")
                    .select("id, rooms!inner(pg_id, status)")
                    .eq("rooms.pg_id", watchPgId)
                    .neq("rooms.status", "INACTIVE")
                    .neq("rooms.status", "MAINTENANCE")
                    .eq("status", "AVAILABLE");

                // If no available beds found, show warning (unless we are editing)
                if (!error && (!availableBedsInPg || availableBedsInPg.length === 0) && !editingTenant) {
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

            // Auto-fill rent/maintenance from room info ONLY for monthly
            const room = rooms.find(r => r.id === watchRoomId);
            if (room && watchStayType === "MONTHLY" && !editingTenant) {
                setValue("rentAmount", Number(room.rent || 0));
            }
        } else {
            setBeds([]);
        }
    }, [watchRoomId, watchStayType]); // rent relies on both room and stayType

    // Handle Stay Type switching
    useEffect(() => {
        if (watchStayType === "DAILY") {
            setValue("rentPaymentType", "JOIN_DATE_BASED");
            if (!editingTenant) {
                setValue("rentAmount", "" as any);
                setValue("maintenanceAmount", 0);
                setValue("maintenanceType", "");
                setValue("securityDeposit", 0);
            }
        } else if (watchStayType === "MONTHLY" && watchPgId && !editingTenant) {
            const pg = pgs.find(p => p.id === watchPgId);
            if (pg) {
                setValue("maintenanceAmount", pg.maintenance_amount || 0);
                setValue("maintenanceType", pg.maintenance_type || "");
                setValue("securityDeposit", pg.security_deposit || 0);
                setValue("rentPaymentType", "FIXED_FIRST_DAY");
            }
            const room = rooms.find(r => r.id === watchRoomId);
            if (room) {
                setValue("rentAmount", Number(room.rent || 0));
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

            // V2: Balances are handled by invoices. Local calculation removed to prevent drift.
            const initialBalance = 0;
            const totalDailyRent = 0; // Legacy placeholder

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
                // balance_amount: initialBalance, // REMOVED v2

                custom_rent: data.stayType === "MONTHLY" ? (Number(data.rentAmount) || 0) : null,
                maintenance_amount: Number(data.maintenanceAmount) || 0,
                maintenance_type: data.maintenanceType || null,
                security_deposit: Number(data.securityDeposit) || 0,
                status: "ACTIVE",
                owner_id: user?.id
            };

            // balance fields removed per V2 rules


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

                // Invoice creation is now automatically handled in tenantAPI.create for monthly tenants

                // Occupy bed
                await bedAPI.update(data.bedId, { status: "OCCUPIED", tenant_id: tenantId });
            }

            // Always sync current room occupancy
            await roomAPI.recalculateOccupancy(data.roomId);

            // 2. handle Payment
            if (data.paidAmount > 0) {
                const newPayment: any = await paymentAPI.create({
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

                const paymentId = newPayment?.id;
                if (paymentId) {
                    try {
                        await billingService.allocatePayment(paymentId, tenantId, data.paidAmount);
                    } catch (allocErr) {
                        console.warn("Onboarding allocation failed:", allocErr);
                    }
                }
            }

            // 3. Handle Notifications
            try {
                if (data.stayType === "MONTHLY") {
                    await NotificationService.scheduleMonthlyRentReminder(
                        tenantId,
                        data.fullName,
                        data.joinedDate
                    );
                } else if (data.stayType === "DAILY" && data.vacateDate) {
                    await NotificationService.scheduleCheckoutReminder(
                        tenantId,
                        data.fullName,
                        data.vacateDate
                    );
                }
            } catch (notifErr) {
                console.warn("Failed to schedule notification:", notifErr);
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
            submitLabel={currentStep === 1 ? "Next: Stay Details" : (editingTenant ? "Update Resident" : "Complete Onboarding")}
        >
            {/* Visual Progress Indicator */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: COLORS.border }]}>
                    <View style={[styles.progressFill, { backgroundColor: COLORS.primary, width: currentStep === 1 ? '50%' : '100%' }]} />
                </View>
                <View style={styles.stepIcons}>
                    <View style={[styles.stepIcon, currentStep >= 1 && { backgroundColor: COLORS.primary }]}>
                        <Feather name="user" size={14} color={currentStep >= 1 ? "#fff" : COLORS.textMuted} />
                    </View>
                    <View style={[styles.stepIcon, currentStep >= 2 && { backgroundColor: COLORS.primary }]}>
                        <Feather name="home" size={14} color={currentStep >= 2 ? "#fff" : COLORS.textMuted} />
                    </View>
                </View>
            </View>

            <View style={{ display: currentStep === 1 ? "flex" : "none" }}>
                <Controller
                    control={control}
                    name="fullName"
                    render={({ field: { onChange, value } }) => (
                        <FormField label="Full Name *" placeholder="Resident's Name" value={value} onChangeText={onChange} error={errors.fullName?.message} />
                    )}
                />
                <View style={styles.row}>
                    <View style={{ flex: 1.2, marginRight: 8 }}>
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field: { onChange, value } }) => (
                                <FormField label="Phone *" placeholder="10-digit number" value={value} onChangeText={onChange} error={errors.phone?.message} keyboardType="phone-pad" maxLength={10} />
                            )}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Controller
                            control={control}
                            name="gender"
                            render={({ field: { onChange, value } }) => (
                                <SegmentedControl
                                    label="Gender *"
                                    options={[
                                        { label: 'Male', value: 'MALE' },
                                        { label: 'Female', value: 'FEMALE' }
                                    ]}
                                    value={value}
                                    onChange={onChange}
                                    error={errors.gender?.message}
                                />
                            )}
                        />
                    </View>
                </View>

                <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, value } }) => (
                        <FormField label="Email Address" placeholder="resident@example.com" value={value} onChangeText={onChange} error={errors.email?.message} keyboardType="email-address" autoCapitalize="none" />
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

                <View style={styles.flatterSection}>
                    <Text style={[styles.label, { color: COLORS.textMuted, marginBottom: 12 }]}>IDENTITY PROOF</Text>
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

                <View style={styles.flatterSection}>
                    <Text style={[styles.label, { color: COLORS.textMuted, marginBottom: 12 }]}>GUARDIAN INFO (FOR MINORS)</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Controller
                                control={control}
                                name="guardianName"
                                render={({ field: { onChange, value } }) => (
                                    <FormField label="Guardian Name" placeholder="Full Name" value={value} onChangeText={onChange} error={errors.guardianName?.message} />
                                )}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Controller
                                control={control}
                                name="guardianPhone"
                                render={({ field: { onChange, value } }) => (
                                    <FormField label="Guardian Phone" placeholder="10-digit" value={value} onChangeText={onChange} error={errors.guardianPhone?.message} keyboardType="phone-pad" maxLength={10} />
                                )}
                            />
                        </View>
                    </View>
                </View>
            </View>

            <View style={{ display: currentStep === 2 ? "flex" : "none" }}>
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
                                        label: `Bed ${b.bed_number}${b.status !== 'AVAILABLE' ? ' (Full)' : ''}`,
                                        value: b.id,
                                        disabled: b.status !== 'AVAILABLE' && b.id !== editingTenant?.bed_id
                                    }))}
                                    value={value}
                                    onChange={onChange}
                                    error={errors.bedId?.message}
                                    placeholder="Select"
                                    disabled={!watchRoomId}
                                />
                            )}
                        />
                    </View>
                </View>

                <View style={styles.flatterSection}>
                    <Text style={[styles.label, { color: COLORS.textMuted, marginBottom: 12 }]}>STAY CONFIGURATION</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Controller
                                control={control}
                                name="stayType"
                                render={({ field: { onChange, value } }) => (
                                    <SegmentedControl
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
                                    <FormField
                                        label={watchStayType === "DAILY" ? "Rent /Day" : "Rent /Mo"}
                                        placeholder="0"
                                        value={value !== undefined && value !== -1 && value !== 0 ? String(value) : ""}
                                        onChangeText={(t) => {
                                            const sanitized = t.replace(/[^0-9]/g, '');
                                            onChange(sanitized === "" ? "" : sanitized);
                                        }}
                                        error={errors.rentAmount?.message}
                                        keyboardType="number-pad"
                                    />
                                )}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Controller
                                control={control}
                                name="securityDeposit"
                                render={({ field: { onChange, value } }) => (
                                    <FormField
                                        label="Deposit"
                                        placeholder="0"
                                        value={value !== undefined && value !== 0 ? String(value) : ""}
                                        onChangeText={(t) => {
                                            const sanitized = t.replace(/[^0-9]/g, '');
                                            onChange(sanitized === "" ? 0 : sanitized);
                                        }}
                                        error={errors.securityDeposit?.message}
                                        keyboardType="number-pad"
                                    />
                                )}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Controller
                                control={control}
                                name="maintenanceAmount"
                                render={({ field: { onChange, value } }) => (
                                    <FormField
                                        label="Maint. Fee"
                                        placeholder="0"
                                        value={value !== undefined && value !== 0 ? String(value) : ""}
                                        onChangeText={(t) => {
                                            const sanitized = t.replace(/[^0-9]/g, '');
                                            onChange(sanitized === "" ? 0 : sanitized);
                                        }}
                                        error={errors.maintenanceAmount?.message}
                                        keyboardType="number-pad"
                                    />
                                )}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Controller
                                control={control}
                                name="maintenanceType"
                                render={({ field: { onChange, value } }) => (
                                    <DropdownSelector
                                        label="Type"
                                        options={[
                                            { label: "None", value: "" },
                                            { label: "One Time", value: "one_time" },
                                            { label: "Monthly", value: "monthly" }
                                        ]}
                                        value={value || ""}
                                        onChange={onChange}
                                    />
                                )}
                            />
                        </View>
                    </View>

                    {/* Compact Estimates */}
                    {watchStayType === 'DAILY' && watchJoinedDate && watchVacateDate && Number(watchRentAmount) >= 0 && (
                        <View style={[styles.estimateCard, { backgroundColor: COLORS.bg, borderColor: COLORS.border }]}>
                            <View style={styles.estimateHeader}>
                                <Text style={[styles.label, { color: COLORS.textMuted }]}>TOTAL STAY RENT</Text>
                                <Text style={[styles.dayRangeText, { color: COLORS.primary }]}>
                                    {(() => {
                                        const start = new Date(watchJoinedDate);
                                        const end = new Date(watchVacateDate);
                                        const diff = end.getTime() - start.getTime();
                                        const diffDays = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
                                        return `${diffDays} Days Stay`;
                                    })()}
                                </Text>
                            </View>

                            <View style={styles.estimateBody}>
                                <Text style={[styles.estimateValue, { color: COLORS.text }]}>
                                    ₹{(() => {
                                        const start = new Date(watchJoinedDate);
                                        const end = new Date(watchVacateDate);
                                        const diff = end.getTime() - start.getTime();
                                        const diffDays = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
                                        const total = (diffDays * Number(watchRentAmount || 0)) + Number(watchMaintenanceAmount || 0);
                                        return total.toLocaleString();
                                    })()}
                                </Text>
                                <Text style={[styles.estimateBreakdown, { color: COLORS.textMuted }]}>
                                    Incl. {Number(watchMaintenanceAmount || 0) > 0 ? `₹${Number(watchMaintenanceAmount).toLocaleString()} fees` : "all fees"}
                                </Text>
                            </View>
                        </View>
                    )}

                    {watchStayType === 'MONTHLY' && Number(watchRentAmount) >= 0 && (
                        <View style={[styles.estimateCard, { backgroundColor: COLORS.bg, borderColor: COLORS.border }]}>
                            <View style={styles.estimateHeader}>
                                <Text style={[styles.label, { color: COLORS.textMuted }]}>TOTAL JOINING AMOUNT</Text>
                                <View style={[styles.miniBadge, { backgroundColor: COLORS.success + "12" }]}>
                                    <Text style={[styles.miniBadgeText, { color: COLORS.success }]}>Monthly Stay</Text>
                                </View>
                            </View>

                            <View style={styles.estimateBody}>
                                <Text style={[styles.estimateValue, { color: COLORS.text }]}>
                                    ₹{(Number(watchRentAmount || 0) + Number(watchSecurityDeposit || 0) + Number(watchMaintenanceAmount || 0)).toLocaleString()}
                                </Text>
                                <Text style={[styles.estimateBreakdown, { color: COLORS.textMuted }]}>
                                    Rent + Deposit + Maint.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.flatterSection}>
                    <Text style={[styles.label, { color: COLORS.textMuted, marginBottom: 12 }]}>INITIAL PAYMENT</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1.5, marginRight: 8 }}>
                            <Controller
                                control={control}
                                name="paidAmount"
                                render={({ field: { onChange, value } }) => (
                                    <FormField
                                        label="Amount Paid Now"
                                        placeholder="₹ 0"
                                        value={value !== undefined && value !== 0 ? String(value) : ""}
                                        onChangeText={(t) => {
                                            const sanitized = t.replace(/[^0-9]/g, '');
                                            onChange(sanitized === "" ? 0 : sanitized);
                                        }}
                                        keyboardType="number-pad"
                                    />
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
        height: 30,
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
        top: 3,
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
    backBtn: {
        marginBottom: 16,
    },
    backText: {
        fontSize: 14,
        fontWeight: "700",
    },
    estimateCard: {
        marginTop: 12,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    estimateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    dayRangeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    miniBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    miniBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    estimateBody: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
    },
    estimateValue: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    estimateBreakdown: {
        fontSize: 11,
        fontWeight: '700',
    },
});

export default UnifiedStayManager;
