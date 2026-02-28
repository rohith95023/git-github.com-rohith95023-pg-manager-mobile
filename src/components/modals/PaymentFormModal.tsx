import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import FormModal from "../common/FormModal";
import FormField from "../common/FormField";
import DropdownSelector from "../common/DropdownSelector";
import DatePickerField from "../common/DatePickerField";
import useThemePalette from "../../hooks/useThemePalette";
import ConfirmationModal from "../common/ConfirmationModal";
import { paymentAPI, pgAPI, tenantAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";

const paymentSchema = z.object({
    tenant_id: z.string().min(1, "Please select a resident"),
    pg_id: z.string().min(1, "Please select a property"),
    amount: z.coerce.number().min(1, "Amount must be > 0"),
    payment_date: z.string().min(1, "Date is required"),
    billing_month: z.string().optional().or(z.literal("")),
    type: z.enum(["RENT", "DEPOSIT", "BOOKING", "ADVANCE", "REFUND", "MAINTENANCE", "UTILITIES", "OTHER"]),
    payment_method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE"]),
    status: z.enum(["COMPLETED", "PENDING", "PARTIAL", "FAILED", "PAID"]),
    notes: z.string().optional().or(z.literal("")),
}).refine(data => {
    if (data.type === "RENT" && !data.billing_month) return false;
    return true;
}, {
    message: "Billing month is required for Rent",
    path: ["billing_month"]
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingPayment?: any;
    initialTenantId?: string;
}

const PaymentFormModal: React.FC<PaymentFormModalProps> = ({ visible, onClose, onSuccess, editingPayment, initialTenantId }) => {
    const COLORS = useThemePalette();
    const [loading, setLoading] = useState(false);
    const [tenants, setTenants] = useState<any[]>([]);
    const [pgs, setPgs] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

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

    const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema) as any,
        mode: "onChange",
        defaultValues: {
            tenant_id: "",
            pg_id: "",
            amount: 0,
            payment_date: new Date().toISOString().split('T')[0],
            billing_month: new Date().toISOString().slice(0, 7),
            type: "RENT",
            payment_method: "CASH",
            status: "COMPLETED",
            notes: "",
        }
    });

    const watchTenantId = watch("tenant_id");
    const watchPgId = watch("pg_id");
    const watchType = watch("type");

    const selectedTenant = useMemo(() => tenants.find(t => t.id === watchTenantId), [tenants, watchTenantId]);

    const getTenantBalance = (tenant: any) => {
        if (!tenant) return 0;
        if (tenant.stay_type === 'DAILY') {
            const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
            return Number(daily?.balance_amount || tenant.balance_amount || 0);
        }
        return Number(tenant.balance || 0);
    };

    useEffect(() => {
        if (visible) {
            const fetchData = async () => {
                const [pgsData, tenantsData, paymentsData]: any = await Promise.all([
                    pgAPI.getAll(),
                    supabase.from("tenants").select(`*, daily_stay_details(*), rooms!room_id(room_number, floor)`).neq("status", "DELETED"),
                    paymentAPI.getAll()
                ]);
                setPgs(pgsData || []);
                setTenants(tenantsData.data || []);
                setPayments(paymentsData || []);
            };
            fetchData();

            if (editingPayment) {
                reset({
                    tenant_id: editingPayment.tenant_id,
                    pg_id: editingPayment.pg_id,
                    amount: editingPayment.amount,
                    payment_date: editingPayment.payment_date,
                    billing_month: editingPayment.billing_month?.slice(0, 7) || "",
                    type: editingPayment.type,
                    payment_method: editingPayment.payment_method,
                    status: editingPayment.status,
                    notes: editingPayment.notes || "",
                });
            } else {
                reset({
                    tenant_id: initialTenantId || "",
                    payment_date: new Date().toISOString().split('T')[0],
                    billing_month: new Date().toISOString().slice(0, 7),
                    type: "RENT",
                    payment_method: "CASH",
                    status: "COMPLETED",
                    amount: 0,
                    notes: "",
                });
            }
        }
    }, [visible, editingPayment, reset, initialTenantId]);

    useEffect(() => {
        if (watchTenantId && !editingPayment) {
            const tenant = tenants.find(t => t.id === watchTenantId);
            if (tenant) {
                setValue("pg_id", tenant.pg_id);
                if (watchType === "RENT") {
                    setValue("amount", getTenantBalance(tenant));
                }
            }
        }
    }, [watchTenantId, watchType, tenants, editingPayment]);

    const handleFormSubmit = async (data: PaymentFormData, confirmed = false) => {
        try {
            // Duplicate Check - Strict Block per Business Logic
            if (data.type === "RENT" && !confirmed) {
                const bMonth = `${data.billing_month}-01`;
                const isDuplicate = payments.some(p =>
                    p.tenant_id === data.tenant_id &&
                    p.billing_month === bMonth &&
                    p.id !== (editingPayment?.id || "")
                );
                if (isDuplicate) {
                    setConfirmState({
                        visible: true,
                        title: "Payment Blocked",
                        message: "Payment already exists for this billing period.",
                        type: "danger",
                        singleButton: true,
                        cancelText: "Review",
                        onClose: () => setConfirmState(prev => ({ ...prev, visible: false }))
                    });
                    return;
                }
            }

            // Overpayment Check - Compare against monthly rent
            const rentAmount = selectedTenant ? Number(selectedTenant.rent_per_month || selectedTenant.rent || selectedTenant.rooms?.rent || 0) : 0;
            if (data.type === "RENT" && data.amount > rentAmount && !confirmed) {
                setConfirmState({
                    visible: true,
                    title: "Confirm Overpayment",
                    message: "Entered amount exceeds monthly rent. Continue?",
                    type: "warning",
                    confirmText: "Continue",
                    cancelText: "Cancel",
                    onConfirm: () => handleFormSubmit(data, true)
                });
                return;
            }

            setLoading(true);
            setConfirmState(prev => ({ ...prev, visible: false })); // Hide if showing
            const { data: { user } } = await supabase.auth.getUser();

            const payload: any = {
                ...data,
                billing_month: data.type === "RENT" ? `${data.billing_month}-01` : null,
                owner_id: user?.id
            };

            // Enhance payload with room/bed info if available
            if (selectedTenant) {
                payload.room_id = selectedTenant.room_id;
                payload.bed_id = selectedTenant.bed_id;
            }

            if (editingPayment) {
                await paymentAPI.update(editingPayment.id, payload);
            } else {
                await paymentAPI.create(payload);

                // Financial Side Effects
                if (data.status === "COMPLETED" || data.status === "PAID") {
                    const tenant = tenants.find(t => t.id === data.tenant_id);
                    if (tenant) {
                        if (data.type === "DEPOSIT") {
                            const currentDeposit = Number(tenant.security_deposit || 0);
                            await tenantAPI.update(tenant.id, { security_deposit: currentDeposit + data.amount });
                        } else if (data.type === "RENT") {
                            if (tenant.stay_type === 'DAILY') {
                                const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
                                const currentPaid = Number(daily?.paid_amount || tenant.paid_amount || 0);
                                const totalRent = Number(daily?.total_rent || tenant.total_rent || 0);
                                const newPaid = currentPaid + data.amount;
                                const newBalance = Math.max(0, totalRent - newPaid);
                                await tenantAPI.update(tenant.id, {
                                    paid_amount: newPaid,
                                    balance_amount: newBalance
                                });
                            } else {
                                const currentBalance = Number(tenant.balance || 0);
                                await tenantAPI.update(tenant.id, { balance: currentBalance - data.amount });
                            }
                        } else if (data.type === "REFUND") {
                            const currentDeposit = Number(tenant.security_deposit || 0);
                            await tenantAPI.update(tenant.id, { security_deposit: Math.max(0, currentDeposit - data.amount) });
                        }

                        // Maintenance Status
                        const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
                        const maintAmt = tenant.stay_type === 'DAILY' ? (daily?.maintenance_amount || 0) : (tenant.maintenance_amount || 0);
                        const maintType = tenant.stay_type === 'DAILY' ? daily?.maintenance_type : tenant.maintenance_type;

                        if (maintType === 'one_time' && !tenant.maintenance_paid) {
                            if (data.type === 'MAINTENANCE' || data.amount >= maintAmt || (data.type === 'RENT' && data.amount > 0)) {
                                await tenantAPI.update(tenant.id, { maintenance_paid: true });
                            }
                        }
                    }
                }
            }

            setConfirmState({
                visible: true,
                title: "Success",
                message: editingPayment ? "Payment updated successfully." : "Payment recorded successfully.",
                type: "success",
                singleButton: true,
                cancelText: "Done",
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
                title: "Error",
                message: error.message || "Failed to save payment record.",
                type: "danger",
                singleButton: true,
                cancelText: "Review"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            visible={visible}
            onClose={onClose}
            onSubmit={handleSubmit((data) => handleFormSubmit(data))}
            title={editingPayment ? "Edit Payment" : "Record Payment"}
            loading={loading}
        >
            <Controller
                control={control}
                name="pg_id"
                render={({ field: { onChange, value } }) => (
                    <DropdownSelector
                        label="Property *"
                        options={pgs.map(p => ({ label: p.name, value: p.id }))}
                        value={value}
                        onChange={(val) => {
                            onChange(val);
                            setValue("tenant_id", "");
                        }}
                        error={errors.pg_id?.message}
                        placeholder="Select Property"
                    />
                )}
            />

            <Controller
                control={control}
                name="tenant_id"
                render={({ field: { onChange, value } }) => (
                    <View>
                        <DropdownSelector
                            label="Resident *"
                            options={tenants
                                .filter(t => t.pg_id === watchPgId)
                                .map(t => ({
                                    label: `${t.full_name} ${t.rooms ? `(R: ${t.rooms.room_number})` : ''}`,
                                    value: t.id
                                }))}
                            value={value}
                            onChange={onChange}
                            error={errors.tenant_id?.message}
                            placeholder={watchPgId ? "Select Resident" : "Select Property First"}
                            disabled={!watchPgId}
                        />
                        {value && selectedTenant && (
                            <View style={styles.badgeRow}>
                                <View style={[styles.badge, { backgroundColor: getTenantBalance(selectedTenant) > 0 ? COLORS.danger + '20' : COLORS.success + '20' }]}>
                                    <Text style={[styles.badgeText, { color: getTenantBalance(selectedTenant) > 0 ? COLORS.danger : COLORS.success }]}>
                                        DUE: ₹{getTenantBalance(selectedTenant).toLocaleString()}
                                    </Text>
                                </View>
                                {selectedTenant.stay_type && (
                                    <View style={[styles.badge, { backgroundColor: COLORS.primary + '20' }]}>
                                        <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                                            {selectedTenant.stay_type}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}
            />

            <View style={styles.row}>
                <View style={{ flex: 1.2, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="amount"
                        render={({ field: { onChange, value } }) => (
                            <FormField label="Amount *" placeholder="0.00" value={String(value)} onChangeText={onChange} error={errors.amount?.message} keyboardType="numeric" icon="credit-card" />
                        )}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Controller
                        control={control}
                        name="type"
                        render={({ field: { onChange, value } }) => (
                            <DropdownSelector
                                label="Type *"
                                options={[
                                    { label: "Rent", value: "RENT" },
                                    { label: "Deposit", value: "DEPOSIT" },
                                    { label: "Booking", value: "BOOKING" },
                                    { label: "Maintenance", value: "MAINTENANCE" },
                                    { label: "Refund", value: "REFUND" },
                                    { label: "Other", value: "OTHER" }
                                ]}
                                value={value}
                                onChange={onChange}
                            />
                        )}
                    />
                </View>
            </View>

            {watchType === "RENT" && (
                <Controller
                    control={control}
                    name="billing_month"
                    render={({ field: { onChange, value } }) => (
                        <DatePickerField label="Billing Month *" value={value || ""} onChange={onChange} error={errors.billing_month?.message} />
                    )}
                />
            )}

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="payment_date"
                        render={({ field: { onChange, value } }) => (
                            <DatePickerField label="Transaction Date *" value={value} onChange={onChange} error={errors.payment_date?.message} />
                        )}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Controller
                        control={control}
                        name="payment_method"
                        render={({ field: { onChange, value } }) => (
                            <DropdownSelector
                                label="Method *"
                                options={[
                                    { label: "Cash", value: "CASH" },
                                    { label: "UPI", value: "UPI" },
                                    { label: "Bank", value: "BANK_TRANSFER" },
                                    { label: "Card", value: "CARD" }
                                ]}
                                value={value}
                                onChange={onChange}
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
                        label="Status *"
                        options={[
                            { label: "Completed", value: "COMPLETED" },
                            { label: "Pending", value: "PENDING" },
                            { label: "Partial", value: "PARTIAL" }
                        ]}
                        value={value}
                        onChange={onChange}
                    />
                )}
            />

            <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, value } }) => (
                    <FormField label="Notes" placeholder="Optional notes..." value={value} onChangeText={onChange} multiline numberOfLines={3} style={{ height: 80 }} />
                )}
            />

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
    badgeRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: -10,
        marginBottom: 10,
        marginLeft: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "bold",
    },
});

export default PaymentFormModal;
