import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
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

const DEFAULT_PAYMENT_VALUES: any = {
    tenant_id: "",
    pg_id: "",
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    billing_month: new Date().toISOString().slice(0, 7),
    type: "RENT",
    payment_method: "CASH",
    status: "COMPLETED",
    notes: "",
};

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
        defaultValues: DEFAULT_PAYMENT_VALUES
    });

    const watchTenantId = watch("tenant_id");
    const watchPgId = watch("pg_id");
    const watchType = watch("type");
    const watchAmount = watch("amount");

    const selectedTenant = useMemo(() => tenants.find(t => t.id === watchTenantId), [tenants, watchTenantId]);

    const outstandingBalance = useMemo(() => {
        if (!selectedTenant) return 0;
        if (selectedTenant.stay_type === 'DAILY') {
            const daily = Array.isArray(selectedTenant.daily_stay_details) ? selectedTenant.daily_stay_details[0] : selectedTenant.daily_stay_details;
            return Number(daily?.balance_amount || selectedTenant.balance_amount || 0);
        }
        return Number(selectedTenant.balance || 0);
    }, [selectedTenant]);

    const remainingBalance = useMemo(() => {
        const amt = Number(watchAmount) || 0;
        if (watchType === 'RENT') {
            return Math.max(0, outstandingBalance - amt);
        }
        return outstandingBalance;
    }, [outstandingBalance, watchAmount, watchType]);

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
                    ...DEFAULT_PAYMENT_VALUES,
                    tenant_id: initialTenantId || "",
                });
            }
        }
    }, [visible, editingPayment, reset, initialTenantId]);

    useEffect(() => {
        if (watchTenantId && !editingPayment) {
            const tenant = tenants.find(t => t.id === watchTenantId);
            if (tenant) {
                setValue("pg_id", tenant.pg_id);
                // Removed auto-fill of amount per user request to prevent accidental overpayment warnings
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
                        title: "Possible Duplicate",
                        message: "A payment record for this resident in this billing period already exists. Do you want to record another one?",
                        type: "warning",
                        confirmText: "Yes, Proceed",
                        cancelText: "Cancel",
                        onConfirm: () => handleFormSubmit(data, true)
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
            submitLabel={editingPayment ? "Update Payment" : "Record Payment"}
            loading={loading}
        >
            <View style={styles.headerSelection}>
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
                    )}
                />
            </View>

            <View style={styles.prominentAmountSection}>
                <Controller
                    control={control}
                    name="amount"
                    render={({ field: { onChange, value } }) => (
                        <View style={styles.amountContainer}>
                            <Text style={[styles.currencySymbol, { color: COLORS.primary }]}>₹</Text>
                            <FormField
                                label="Payment Amount *"
                                placeholder="0"
                                value={value !== 0 ? String(value) : ""}
                                onChangeText={(t) => {
                                    const sanitized = t.replace(/[^0-9]/g, '');
                                    onChange(sanitized === "" ? 0 : sanitized);
                                }}
                                error={errors.amount?.message}
                                keyboardType="number-pad"
                                containerStyle={styles.amountField}
                                innerContainerStyle={{ borderWidth: 0, backgroundColor: 'transparent' }}
                                style={styles.amountInput}
                                hideLabel
                            />
                        </View>
                    )}
                />
            </View>

            <View style={styles.flatterSection}>
                <Controller
                    control={control}
                    name="type"
                    render={({ field: { onChange, value } }) => (
                        <SegmentedControl
                            label="Payment For *"
                            options={[
                                { label: "Rent", value: "RENT" },
                                { label: "Deposit", value: "DEPOSIT" },
                                { label: "Booking", value: "BOOKING" },
                                { label: "Maint.", value: "MAINTENANCE" },
                                { label: "Other", value: "OTHER" }
                            ]}
                            value={value}
                            onChange={onChange}
                            error={errors.type?.message}
                        />
                    )}
                />
            </View>

            {watchTenantId && selectedTenant && (
                <View style={[styles.summaryCard, { backgroundColor: COLORS.bg, borderColor: COLORS.border }]}>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>OUTSTANDING</Text>
                        <Text style={[styles.summaryValue, { color: COLORS.danger }]}>₹{outstandingBalance.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>NEW BALANCE</Text>
                        <Text style={[styles.summaryValue, { color: COLORS.text, opacity: watchAmount > 0 ? 1 : 0.5 }]}>
                            ₹{remainingBalance.toLocaleString()}
                        </Text>
                    </View>
                </View>
            )}

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="payment_date"
                        render={({ field: { onChange, value } }) => (
                            <DatePickerField label="Date" value={value} onChange={onChange} error={errors.payment_date?.message} />
                        )}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    {watchType === "RENT" && (
                        <Controller
                            control={control}
                            name="billing_month"
                            render={({ field: { onChange, value } }) => (
                                <DatePickerField label="Month" value={value || ""} onChange={onChange} error={errors.billing_month?.message} />
                            )}
                        />
                    )}
                </View>
            </View>

            <View style={styles.flatterSection}>
                <Controller
                    control={control}
                    name="payment_method"
                    render={({ field: { onChange, value } }) => (
                        <SegmentedControl
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

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="status"
                        render={({ field: { onChange, value } }) => (
                            <DropdownSelector
                                label="Status"
                                options={[
                                    { label: "Done", value: "COMPLETED" },
                                    { label: "Pending", value: "PENDING" }
                                ]}
                                value={value}
                                onChange={onChange}
                            />
                        )}
                    />
                </View>
                <View style={{ flex: 1.5, marginLeft: 8 }}>
                    <Controller
                        control={control}
                        name="notes"
                        render={({ field: { onChange, value } }) => (
                            <FormField label="Notes" placeholder="Receipt no..." value={value} onChangeText={onChange} />
                        )}
                    />
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
    headerSelection: {
        marginBottom: 8,
    },
    prominentAmountSection: {
        marginVertical: 12,
        alignItems: 'center',
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    currencySymbol: {
        fontSize: 32,
        fontWeight: '900',
        marginRight: 8,
        marginTop: 4,
    },
    amountField: {
        flex: 1,
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    amountInput: {
        fontSize: 48,
        fontWeight: '900',
        textAlign: 'left',
        height: 70,
        letterSpacing: -1,
    },
    flatterSection: {
        marginBottom: 16,
    },
    summaryCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        marginBottom: 20,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '900',
    },
    summaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
});

export default PaymentFormModal;
