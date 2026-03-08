import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as z from "zod";
import useThemePalette from "../../hooks/useThemePalette";
import { authAPI, expenseAPI, pgAPI } from "../../services/api";
import ConfirmationModal from "../common/ConfirmationModal";
import DatePickerField from "../common/DatePickerField";
import DropdownSelector from "../common/DropdownSelector";
import FormField from "../common/FormField";
import FormModal from "../common/FormModal";

const expenseSchema = z.object({
    title: z.string().min(1, "Title is required"),
    category: z.string().min(1, "Category is required"),
    amount: z.coerce.number().min(1, "Amount must be > 0"),
    date: z.string().min(1, "Date is required"),
    pg_id: z.string().optional().nullable(),
    vendor_name: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const CATEGORIES = ["UTILITIES", "REPAIRS", "MAINTENANCE", "SALARY", "FOOD", "OTHER"];

interface ExpenseFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingExpense?: any;
}

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ visible, onClose, onSuccess, editingExpense }) => {
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

    const { control, handleSubmit, reset, formState: { errors } } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema) as any,
        mode: "all",
        defaultValues: {
            title: "",
            category: "MAINTENANCE",
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            pg_id: null,
            vendor_name: "",
            notes: "",
        }
    });

    useEffect(() => {
        if (visible) {
            const fetchPgs = async () => {
                const data = await pgAPI.getAll();
                setPgs((data as any) || []);
            };
            fetchPgs();

            if (editingExpense) {
                reset({
                    title: editingExpense.title || editingExpense.description,
                    category: editingExpense.category,
                    amount: editingExpense.amount,
                    date: editingExpense.date,
                    pg_id: editingExpense.pg_id,
                    vendor_name: editingExpense.vendor_name || "",
                    notes: editingExpense.notes || "",
                });
            } else {
                reset({
                    title: "",
                    category: "MAINTENANCE",
                    amount: 0,
                    date: new Date().toISOString().split('T')[0],
                    pg_id: null,
                    vendor_name: "",
                    notes: "",
                });
            }
        }
    }, [visible, editingExpense, reset]);

    const handleFormSubmit = async (data: ExpenseFormData) => {
        try {
            setLoading(true);
            const user: any = await authAPI.getUser();

            const payload = {
                ...data,
                owner_id: user?.id
            };

            if (editingExpense) {
                await expenseAPI.update(editingExpense.id, payload);
            } else {
                await expenseAPI.create(payload);
            }

            setConfirmState({
                visible: true,
                title: "Success",
                message: editingExpense ? "Expense updated successfully." : "Expense recorded successfully.",
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
                message: error.message || "Failed to log expense.",
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
            onSubmit={handleSubmit(handleFormSubmit)}
            title={editingExpense ? "Edit Expense" : "Log Expense"}
            submitLabel={editingExpense ? "Update Expense" : "Log Expense"}
            loading={loading}
        >
            <View style={styles.prominentAmountSection}>
                <Controller
                    control={control}
                    name="amount"
                    render={({ field: { onChange, value } }) => (
                        <View style={styles.amountContainer}>
                            <Text style={[styles.currencySymbol, { color: COLORS.primary }]}>₹</Text>
                            <FormField
                                label="Expense Amount *"
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

            <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                    <FormField label="What was this for? *" placeholder="e.g. Electricity bill, repair..." value={value} onChangeText={onChange} error={errors.title?.message} />
                )}
            />

            <View style={styles.flatterSection}>
                <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>CATEGORY *</Text>
                <Controller
                    control={control}
                    name="category"
                    render={({ field: { onChange, value } }) => (
                        <View style={styles.chipContainer}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => onChange(cat)}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: value === cat ? COLORS.primary : COLORS.card,
                                            borderColor: value === cat ? COLORS.primary : COLORS.border
                                        }
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            { color: value === cat ? '#FFF' : COLORS.text }
                                        ]}
                                    >
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                />
                {errors.category?.message && <Text style={[styles.errorText, { color: COLORS.danger }]}>{errors.category.message}</Text>}
            </View>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="date"
                        render={({ field: { onChange, value } }) => (
                            <DatePickerField label="Date" value={value} onChange={onChange} error={errors.date?.message} />
                        )}
                    />
                </View>
                <View style={{ flex: 1.2, marginLeft: 8 }}>
                    <Controller
                        control={control}
                        name="pg_id"
                        render={({ field: { onChange, value } }) => (
                            <DropdownSelector
                                label="PG / Property"
                                options={[
                                    { label: "General", value: "" },
                                    ...pgs.map(p => ({ label: p.name, value: p.id }))
                                ]}
                                value={value || ""}
                                onChange={onChange}
                                placeholder="Select PG"
                            />
                        )}
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="vendor_name"
                        render={({ field: { onChange, value } }) => (
                            <FormField label="Vendor" placeholder="Optional" value={value || ""} onChangeText={onChange} />
                        )}
                    />
                </View>
                <View style={{ flex: 1.5, marginLeft: 8 }}>
                    <Controller
                        control={control}
                        name="notes"
                        render={({ field: { onChange, value } }) => (
                            <FormField label="Notes" placeholder="Optional" value={value || ""} onChangeText={onChange} />
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
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    errorText: {
        fontSize: 10,
        fontWeight: "700",
        marginTop: 4,
        marginLeft: 4,
    },
});

export default ExpenseFormModal;
