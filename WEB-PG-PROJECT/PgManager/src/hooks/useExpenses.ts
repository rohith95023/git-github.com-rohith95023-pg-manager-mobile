import { useState, useEffect, useMemo, ChangeEvent, FormEvent } from "react";
// @ts-ignore
import { expenseAPI, pgAPI } from "../services/api";
// @ts-ignore
import { supabase } from "../lib/supabaseClient";
import { z } from "zod";
import { Database } from "../types/supabase";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type PG = Database["public"]["Tables"]["pgs"]["Row"];

interface UseExpensesProps {
  _theme?: any; // Marked as internal if needed, or remove if truly unused
}

interface ExpenseFormData {
  title: string;
  category: string;
  amount: string;
  date: string;
  pg_id: string;
  vendor_name: string;
  notes: string;
}

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  date: z.string().refine((val) => {
    // Avoid timezone offset issues by directly comparing YYYY-MM-DD strings in local time
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return val <= todayStr;
  }, {
    message: "FUTURE DATES ARE NOT ALLOWED",
    path: ["date"],
  }),
  pg_id: z.string().nullable().optional(),
  vendor_name: z.string().optional(),
  notes: z.string().optional(),
});

export const DEFAULT_CATEGORIES = ["MAINTENANCE", "REPAIRS", "UTILITIES", "SALARY", "FOOD", "INTERNET", "CLEANING", "OTHER"];

export const useExpenses = (_props: UseExpensesProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pgs, setPgs] = useState<PG[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
    isLoading: boolean;
  }>({ isOpen: false, id: null, isLoading: false });
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const showToast = (message: string, type: string = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [formData, setFormData] = useState<ExpenseFormData>({
    title: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    pg_id: "all",
    vendor_name: "",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const expensesRes: any = await expenseAPI.getAll();
      const pgsRes: any = await pgAPI.getAll();
      setExpenses(expensesRes || []);
      setPgs(pgsRes || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // specific subscription for expenses
    const channel = supabase
      .channel('expenses-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
        console.log('[Expenses] Realtime update:', payload);
        fetchData();
      })
      .subscribe();

    // Load draft from localStorage on mount
    const savedDraft = localStorage.getItem('pg_expense_form_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft && typeof draft === 'object') {
          setFormData(prev => ({ ...prev, ...draft } as ExpenseFormData));
        }
      } catch (e: any) {
        console.error("Failed to parse expense draft", e);
      }
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync formData to localStorage
  useEffect(() => {
    if (Object.values(formData).some(val => val !== "" && val !== "all")) {
      localStorage.setItem('pg_expense_form_draft', JSON.stringify(formData));
    }
  }, [formData]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof ExpenseFormData;
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (formErrors[fieldName]) {
      setFormErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const validateForm = (): { success: true; data: z.infer<typeof expenseSchema> } | { success: false } => {
    try {
      setFormErrors({});
      const payload = {
        title: formData.title.trim(),
        category: formData.category.trim().toUpperCase(),
        amount: parseFloat(formData.amount) || 0,
        date: formData.date || new Date().toISOString().split('T')[0],
        pg_id: formData.pg_id === "all" ? null : formData.pg_id,
        vendor_name: formData.vendor_name || "",
        notes: formData.notes || "",
      };

      const validatedData = expenseSchema.parse(payload);
      return { success: true, data: validatedData };
    } catch (error: any) {
      // Robustly extract validation issues from Zod or other sources
      const issues = (error as any)?.issues || (error as any)?.errors || (error instanceof z.ZodError ? error.issues : null);

      if (issues && Array.isArray(issues)) {
        const errors: Record<string, string> = {};
        issues.forEach((err: any) => {
          const path = String(err.path?.[0] || "");
          if (path) errors[path] = err.message;
        });
        setFormErrors(errors);
      } else {
        console.error("Unexpected validation error:", error);
        showToast("Invalid form data. Please check all fields.", "error");
      }
      return { success: false };
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateForm();

    if (!validation.success) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingExpense && editingExpense.id) {
        await (expenseAPI as any).update(editingExpense.id, validation.data);
      } else {
        await (expenseAPI as any).create(validation.data);
      }
      await fetchData();
      showToast(editingExpense ? "Expense updated" : "Expense logged");
      setShowModal(false);
      setEditingExpense(null);
      resetForm();
      localStorage.removeItem('pg_expense_form_draft');
    } catch (err: any) {
      console.error("Expense saving error:", err);
      showToast(err.message || "Failed to save expense", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      category: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      pg_id: "all",
      vendor_name: "",
      notes: "",
    });
    setFormErrors({});
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: (expense.title || expense.description) ?? "",
      category: expense.category ?? "",
      amount: expense.amount.toString(),
      date: expense.date ?? new Date().toISOString().split('T')[0],
      pg_id: expense.pg_id || "all",
      vendor_name: expense.vendor_name || "",
      notes: expense.notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ isOpen: true, id, isLoading: false });
  };

  const confirmDelete = async () => {
    const { id } = deleteConfirm;
    if (!id) return;
    setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
    try {
      await (expenseAPI as any).delete(id);
      showToast("Expense deleted");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      showToast("Error deleting expense: " + (error.message || "Unknown error"), "error");
    } finally {
      setDeleteConfirm({ isOpen: false, id: null, isLoading: false });
    }
  };

  // Helper Stats Calculation
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter expenses for current month AND selected context
    const relevantExpenses = expenses.filter(e => {
      if (!e.date) return false;
      const eDate = new Date(e.date);
      const isSameMonth = eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;

      if (!isSameMonth) return false;

      // Context filter
      if (formData.pg_id === "all") return true;
      return e.pg_id === formData.pg_id;
    });

    const total = relevantExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    return { total, count: relevantExpenses.length };
  }, [expenses, formData.pg_id]);


  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = filterCategory ? expense.category === filterCategory : true;
    const searchLow = searchTerm.toLowerCase();
    const titleMatch = (expense.title || expense.description || "").toLowerCase().includes(searchLow);
    const vendorMatch = (expense.vendor_name || "").toLowerCase().includes(searchLow);

    return matchesCategory && (titleMatch || vendorMatch);
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return {
    expenses, setExpenses,
    pgs, setPgs,
    loading, setLoading,
    showModal, setShowModal,
    editingExpense, setEditingExpense,
    filterCategory, setFilterCategory,
    searchTerm, setSearchTerm,
    formErrors, setFormErrors,
    isSubmitting, setIsSubmitting,
    deleteConfirm, setDeleteConfirm,
    toast, setToast,
    expandedRow, setExpandedRow,
    showToast,
    formData, setFormData,
    fetchData,
    handleInputChange,
    validateForm,
    handleSubmit,
    resetForm,
    handleEdit,
    handleDelete,
    confirmDelete,
    currentMonthStats,
    filteredExpenses,
    totalExpenses
  };
};
