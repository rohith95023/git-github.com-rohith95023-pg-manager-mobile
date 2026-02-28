import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import FormModal from "../common/FormModal";
import FormField from "../common/FormField";
import DropdownSelector from "../common/DropdownSelector";
import DatePickerField from "../common/DatePickerField";
import useThemePalette from "../../hooks/useThemePalette";
import { expenseAPI, pgAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";

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
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                ...data,
                owner_id: user?.id
            };

            if (editingExpense) {
                await expenseAPI.update(editingExpense.id, payload);
            } else {
                await expenseAPI.create(payload);
            }

            Alert.alert("Success", editingExpense ? "Expense updated" : "Expense recorded");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Something went wrong");
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
            loading={loading}
        >
            <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                    <FormField label="Description *" placeholder="What was this expense for?" value={value} onChangeText={onChange} error={errors.title?.message} icon="file-text" />
                )}
            />

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="category"
                        render={({ field: { onChange, value } }) => (
                            <DropdownSelector
                                label="Category *"
                                options={CATEGORIES.map(c => ({ label: c, value: c }))}
                                value={value}
                                onChange={onChange}
                                error={errors.category?.message}
                            />
                        )}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Controller
                        control={control}
                        name="amount"
                        render={({ field: { onChange, value } }) => (
                            <FormField label="Amount *" placeholder="0.00" value={String(value)} onChangeText={onChange} error={errors.amount?.message} keyboardType="numeric" icon="dollar-sign" />
                        )}
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Controller
                        control={control}
                        name="date"
                        render={({ field: { onChange, value } }) => (
                            <DatePickerField label="Expense Date *" value={value} onChange={onChange} error={errors.date?.message} />
                        )}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Controller
                        control={control}
                        name="pg_id"
                        render={({ field: { onChange, value } }) => (
                            <DropdownSelector
                                label="Property"
                                options={[
                                    { label: "General / All", value: "" },
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

            <Controller
                control={control}
                name="vendor_name"
                render={({ field: { onChange, value } }) => (
                    <FormField label="Vendor Name" placeholder="Who was paid?" value={value || ""} onChangeText={onChange} icon="shopping-bag" />
                )}
            />

            <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, value } }) => (
                    <FormField label="Notes" placeholder="Additional details..." value={value || ""} onChangeText={onChange} multiline numberOfLines={3} style={{ height: 80 }} />
                )}
            />
        </FormModal>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
    },
});

export default ExpenseFormModal;
