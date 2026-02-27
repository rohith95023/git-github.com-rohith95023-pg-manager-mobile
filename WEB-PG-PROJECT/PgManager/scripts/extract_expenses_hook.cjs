const fs = require('fs');

const code = fs.readFileSync('src/pages/Expenses/Expenses.jsx', 'utf8');

const hookStartStr = 'const [expenses, setExpenses]';
const hookEndStr = 'const getCategoryIcon = (category)';

const startIdx = code.indexOf(hookStartStr);
const endIdx = code.indexOf(hookEndStr);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const hookBodyRaw = code.substring(startIdx, endIdx);

// Remove the getCategoryIcon dependencies if any
const hookBody = hookBodyRaw.trim();

const hookFile = `import { useState, useEffect, useMemo } from "react";
import { expenseAPI, pgAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";
import { z } from "zod";

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  date: z.string().refine((val) => {
    const selectedDate = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate <= today;
  }, {
    message: "Future dates are not allowed",
    path: ["date"],
  }),
});

export const DEFAULT_CATEGORIES = ["MAINTENANCE", "REPAIRS", "UTILITIES", "SALARY", "FOOD", "INTERNET", "CLEANING", "OTHER"];

export const useExpenses = ({ theme }) => {
  ${hookBody}

  return {
    expenses, setExpenses,
    pgs, setPgs,
    loading, setLoading,
    isModalOpen, setIsModalOpen,
    formMode, setFormMode,
    formData, setFormData,
    errors, setErrors,
    toast, setToast,
    confirmDeleteModal, setConfirmDeleteModal,
    searchQuery, setSearchQuery,
    filterCategory, setFilterCategory,
    filterMonth, setFilterMonth,
    showToast,
    fetchData,
    handleInputChange,
    validateForm,
    handleSubmit,
    resetForm,
    handleEdit,
    handleDelete,
    confirmDelete,
    filteredExpenses,
    totalExpenses
  };
};
`;

fs.writeFileSync('src/hooks/useExpenses.ts', hookFile);

const originalSchemaBlock = code.match(/const expenseSchema = z\.object\(\{[\s\S]*?\}\);/)[0];
const originalCategoriesMatch = code.match(/const DEFAULT_CATEGORIES = \[.*?\];/);
const originalCategories = originalCategoriesMatch ? originalCategoriesMatch[0] : '';


let newCode = code.replace(hookBodyRaw, `const { 
    expenses, loading, isModalOpen, formMode, formData, errors, toast, confirmDeleteModal, 
    searchQuery, filterCategory, filterMonth, filteredExpenses, totalExpenses,
    setIsModalOpen, setFormMode, setFormData, setToast, setConfirmDeleteModal, setSearchQuery, setFilterCategory, setFilterMonth,
    handleInputChange, handleSubmit, resetForm, handleEdit, handleDelete, confirmDelete 
} = useExpenses({ theme });\n\n  `);

newCode = newCode.replace(originalSchemaBlock, '');
if (originalCategories) {
    newCode = newCode.replace(originalCategories, 'import { useExpenses, DEFAULT_CATEGORIES } from "../../hooks/useExpenses";');
}

fs.writeFileSync('src/pages/Expenses/Expenses.jsx', newCode);

console.log("Extraction complete!");
