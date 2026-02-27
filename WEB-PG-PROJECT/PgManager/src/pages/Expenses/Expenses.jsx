import React, { useState, useEffect, useMemo } from "react";
import { expenseAPI, pgAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Pencil, Trash2, X, IndianRupee, Wrench, Hammer, Zap, User, HelpCircle, Search, Filter, Calendar, Building2, Store, AlertCircle, ChevronRight } from "lucide-react";
import { z } from "zod";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "../../context/ThemeContext";
import AmountInput from "../../components/AmountInput";
import ThemeToggle from "../../components/ThemeToggle";
import ConfirmationModal from "../../components/ConfirmationModal";
import Toast from "../../components/Toast";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}



import { useExpenses, DEFAULT_CATEGORIES } from "../../hooks/useExpenses";

const Expenses = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { 
    expenses, loading, showModal, formData, formErrors, toast, deleteConfirm, 
    searchTerm, filterCategory, filteredExpenses, totalExpenses, pgs,
    setShowModal, setFormData, setToast, setDeleteConfirm, setSearchTerm, setFilterCategory,
    handleInputChange, handleSubmit, resetForm, handleEdit, handleDelete, confirmDelete,
    currentMonthStats, isSubmitting, editingExpense
} = useExpenses({ theme });

  const getCategoryIcon = (category) => {
    switch (category?.toUpperCase()) {
      case "MAINTENANCE": return <Wrench size={14} />;
      case "REPAIRS": return <Hammer size={14} />;
      case "UTILITIES": return <Zap size={14} />;
      case "SALARY": return <User size={14} />;
      case "FOOD": return <Store size={14} />;
      default: return <HelpCircle size={14} />;
    }
  };

  const getCategoryStyles = (category) => {
    switch (category?.toUpperCase()) {
      case "MAINTENANCE": return "bg-blue-500/[0.03] text-blue-600/80 border-blue-200/50 dark:border-blue-500/10";
      case "REPAIRS": return "bg-amber-500/[0.03] text-amber-600/80 border-amber-200/50 dark:border-amber-500/10";
      case "UTILITIES": return "bg-purple-500/[0.03] text-purple-600/80 border-purple-200/50 dark:border-purple-500/10";
      case "SALARY": return "bg-emerald-500/[0.03] text-emerald-600/80 border-emerald-200/50 dark:border-emerald-500/10";
      case "FOOD": return "bg-orange-500/[0.03] text-orange-600/80 border-orange-200/50 dark:border-orange-500/10";
      default: return "bg-slate-500/[0.03] text-slate-600/80 border-slate-200/50 dark:border-slate-500/10";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-3.5 md:space-y-4">
      <Toast 
        isOpen={!!toast}
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className={cn("text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Expense Tracker</h1>
          <p className={cn("mt-0.5 flex items-center gap-2 text-[13px]", isDark ? "text-slate-400" : "text-slate-500")}>
            <IndianRupee size={14} /> Oversee property maintenance and operational costs
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <ThemeToggle className="flex" />
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            Log Expense
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn("p-3.5 rounded-xl flex items-center gap-4 border", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/10">
            <IndianRupee size={18} />
          </div>
          <div className="text-left">
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>Total Outflow</p>
            <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>₹{totalExpenses.toLocaleString()}</p>
          </div>
        </div>
        <div className={cn("p-3.5 rounded-xl flex items-center gap-4 border", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/10">
            <Store size={18} />
          </div>
          <div className="text-left">
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>Transactions</p>
            <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{filteredExpenses.length}</p>
          </div>
        </div>
        <div className={cn("p-3.5 rounded-xl flex items-center gap-4 border", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/10">
            <Building2 size={18} />
          </div>
          <div className="text-left">
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>Linked Properties</p>
            <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{pgs.length}</p>
          </div>
        </div>
      </div>

      <div className={cn("rounded-xl border shadow-sm", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
        <div className={cn("px-4 py-3 border-b flex flex-col md:flex-row gap-3 justify-between", isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50")}>
          <div className="flex flex-col md:flex-row items-center gap-2 flex-1">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search expenses..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn("w-full h-8 border rounded-lg pl-8 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm", isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
              />
            </div>
            <div className="flex items-center gap-1.5 w-full md:w-auto ml-0 md:-ml-0.5">
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={cn("h-8 border rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm w-full md:w-[130px]", isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
              >
                <option value="">All Categories</option>
                {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn("border-b text-[11px] font-bold uppercase tracking-wider opacity-80", isDark ? "bg-slate-900/50 text-slate-400 border-slate-800" : "bg-slate-50/50 text-slate-500 border-slate-100")}>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Property</th>
                <th className="px-5 py-3.5">Vendor</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-10 py-3.5 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("text-sm", isDark ? "divide-y divide-slate-800" : "divide-y divide-slate-100")}>
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-medium italic">No expense records found.</td></tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <React.Fragment key={expense.id}>
                  <tr 
                    className={cn(
                      "transition-colors group", 
                      isDark ? "hover:bg-slate-800/50" : "hover:bg-blue-50/[0.15]"
                    )}
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={cn("font-medium", isDark ? "text-slate-400" : "text-slate-600")}>{expense.date}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>{expense.title || expense.description}</span>
                        {(expense.notes || expense.vendor_name) && (
                          <span className="text-slate-400 text-[11px] mt-0.5 line-clamp-1 italic">
                            {expense.notes || expense.vendor_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border", getCategoryStyles(expense.category))}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className={cn("font-bold text-xs truncate max-w-[120px]", isDark ? "text-slate-200" : "text-slate-800")}>
                          {expense.pgs?.name || "All PGs"}
                        </span>
                        <span className={cn("text-slate-400 text-[10px] font-medium mt-0.5", isDark ? "text-slate-500" : "text-slate-400")}>
                          {expense.pg_id ? "Property" : "Account Context"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-500" : "text-slate-500")}>
                        {expense.vendor_name || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-[#ef5350] font-bold text-sm tracking-tight">
                        ₹{expense.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(expense)} 
                          className={cn("p-1.5 rounded transition-colors border", isDark ? "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-400" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500 shadow-sm")}
                          title="Edit"
                        >
                          <Pencil size={14}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(expense.id)} 
                          className={cn("p-1.5 rounded transition-colors border", isDark ? "bg-slate-900 border-slate-700 hover:bg-rose-500/10 text-rose-500" : "bg-white border-slate-200 hover:bg-rose-50 text-rose-500 shadow-sm")}
                          title="Delete"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

           {/* Mobile View */}
           <div className={cn("md:hidden divide-y", isDark ? "divide-slate-800" : "divide-slate-100")}>
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium italic">
              No expense records found.
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{expense.date}</span>
                    <h3 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>{expense.title || expense.description}</h3>
                    <div className="mt-1.5 flex items-center gap-2">
                       <span className={cn("px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase border", getCategoryStyles(expense.category))}>
                          {expense.category}
                        </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-rose-600 font-bold text-base">
                       ₹{expense.amount?.toLocaleString() || 0}
                    </div>
                    {expense.vendor_name && (
                      <span className="text-slate-500 text-[10px] mt-1 italic font-medium">via {expense.vendor_name}</span>
                    )}
                  </div>
                </div>

                <div className={cn("px-3 py-2 rounded-lg border", isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200")}>
                  <div className={cn("flex items-center gap-2 text-[11px]", isDark ? "text-slate-300" : "text-slate-600")}>
                    <Building2 size={12} className="text-blue-500" />
                    <span className="font-bold">{expense.pgs?.name || "General Ledger"}</span>
                    <span className="text-slate-400 font-normal">context</span>
                  </div>
                  {expense.notes && (
                    <p className="mt-2 text-[11px] text-slate-400 leading-relaxed italic line-clamp-2">
                    {expense.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button 
                    onClick={() => handleEdit(expense)}
                    className={cn("flex-1 h-10 flex items-center justify-center gap-2 rounded-lg text-xs font-bold border transition-all", isDark ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(expense.id)}
                    className={cn("flex-1 h-10 flex items-center justify-center gap-2 rounded-lg text-xs font-bold border transition-all", isDark ? "bg-slate-950 border-rose-500/20 text-rose-500 hover:bg-rose-500/10" : "bg-white border-rose-100 text-rose-600 hover:bg-rose-50")}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Classic Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className={cn("fixed inset-0 transition-opacity", isDark ? "bg-slate-950/90" : "bg-slate-900/40")} />
          <div className={cn(
              "relative w-full max-w-xl border rounded-xl shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] overflow-hidden",
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          )}>
            
            {/* Modal Header */}
            <div className={cn("px-6 py-4 border-b flex items-center justify-between shrink-0", isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white")}>
                <h2 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                    {editingExpense ? "Edit Expense Log" : "New Expense Log"}
                </h2>
                <button 
                    onClick={() => setShowModal(false)} 
                    className={cn("p-2 rounded-lg transition-colors", isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-50 text-slate-500")}
                >
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 space-y-6">
                    
                    {/* Section 1: Expense Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">01. Expense Details</span>
                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>Description *</label>
                            <input 
                                name="title" 
                                value={formData.title} 
                                onChange={handleInputChange} 
                                placeholder="E.g. Monthly maintenance, Office supplies..." 
                                className={cn(
                                    "w-full h-10 px-3 rounded-lg border outline-none transition-all text-sm",
                                    isDark ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:border-blue-500"
                                )} 
                            />
                            {formErrors.title && <p className="text-[10px] font-bold text-rose-500 uppercase mt-1">{formErrors.title}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>Category *</label>
                                <div className="relative">
                                    <input 
                                        list="categories" 
                                        name="category" 
                                        value={formData.category} 
                                        onChange={handleInputChange} 
                                        placeholder="Select or type..."
                                        className={cn(
                                            "w-full h-10 px-3 rounded-lg border outline-none transition-all text-sm",
                                            isDark ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 text-left" : "bg-white border-slate-200 text-slate-900 focus:border-blue-500 text-left"
                                        )} 
                                    />
                                    <datalist id="categories">
                                        {DEFAULT_CATEGORIES.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                        <Filter size={14}/>
                                    </div>
                                </div>
                                {formErrors.category && <p className="text-[10px] font-bold text-rose-500 uppercase mt-1">{formErrors.category}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>Amount (₹) *</label>
                                <div className="relative group">
                                    <input 
                                        type="text"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            handleInputChange({ target: { name: 'amount', value: val } });
                                        }}
                                        placeholder="0.00"
                                        className={cn(
                                            "w-full h-10 pl-8 pr-3 rounded-lg border outline-none transition-all text-sm font-bold text-right",
                                            isDark ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:border-blue-500"
                                        )}
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <IndianRupee size={14} />
                                    </div>
                                </div>
                                {formErrors.amount && <p className="text-[10px] font-bold text-rose-500 uppercase mt-1">{formErrors.amount}</p>}
                            </div>
                        </div>

                        <div className={cn("px-4 py-2 rounded-lg border flex items-center justify-between text-[11px]", isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200")}>
                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <AlertCircle size={12}/> 
                                <span>Monthly total for this {formData.pg_id === 'all' ? 'context' : 'property'}:</span>
                            </div>
                            <span className="font-bold text-rose-500">₹{currentMonthStats.total.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Section 2: Date & Property */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">02. Date & Property</span>
                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>Expense Date *</label>
                                <div className="relative">
                                    <input 
                                        type="date" 
                                        name="date" 
                                        value={formData.date} 
                                        onChange={handleInputChange} 
                                        className={cn(
                                            "w-full h-10 px-3 rounded-lg border outline-none transition-all text-sm",
                                            isDark ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500" : "bg-white border-slate-300 text-slate-900 focus:border-blue-500"
                                        )} 
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                        <Calendar size={14}/>
                                    </div>
                                </div>
                                {formErrors.date && <p className="text-[10px] font-bold text-rose-500 uppercase mt-1">{formErrors.date}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>Property Context</label>
                                <div className="relative">
                                    <select 
                                        name="pg_id" 
                                        value={formData.pg_id} 
                                        onChange={handleInputChange} 
                                        className={cn(
                                            "w-full h-10 pl-3 pr-10 rounded-lg border outline-none appearance-none transition-all text-sm font-medium",
                                            isDark ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:border-blue-500"
                                        )}
                                    >
                                        <option value="all">General / All PGs</option>
                                        {pgs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                        <Building2 size={14}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Vendor Information */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">03. Vendor Information</span>
                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>Vendor Name</label>
                                <div className="relative">
                                    <input 
                                        name="vendor_name" 
                                        value={formData.vendor_name} 
                                        onChange={handleInputChange} 
                                        placeholder="Add vendor or supplier name..." 
                                        className={cn(
                                            "w-full h-10 pl-10 pr-3 rounded-lg border outline-none transition-all text-sm",
                                            isDark ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:border-blue-500"
                                        )} 
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40">
                                        <Store size={16}/>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>Internal Notes</label>
                                <textarea 
                                    name="notes" 
                                    value={formData.notes} 
                                    onChange={handleInputChange} 
                                    placeholder="Add any additional details or references..." 
                                    rows={2}
                                    className={cn(
                                        "w-full p-3 rounded-lg border outline-none transition-all text-sm resize-none",
                                        isDark ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:border-blue-500"
                                    )} 
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Modal Footer */}
                <div className={cn("px-6 py-4 border-t flex items-center justify-end gap-3 shrink-0", isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50")}>
                    <button 
                        type="button"
                        onClick={() => setShowModal(false)} 
                        className={cn(
                            "px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all border",
                            isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-white shadow-sm"
                        )}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={isSubmitting} 
                        className={cn(
                            "px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-sm transition-all disabled:opacity-50 flex items-center gap-2",
                            !isSubmitting && "hover:shadow-rose-600/20 active:scale-[0.98]"
                        )}
                    >
                        {isSubmitting ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <IndianRupee size={14} />
                        )}
                        {isSubmitting ? "Processing..." : (editingExpense ? "Update Expense" : "Log Expense")}
                    </button>
                </div>
            </form>

          </div>
        </div>
      )}
      <ConfirmationModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, isLoading: false })}
        onConfirm={confirmDelete}
        title="Delete Expense?"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        confirmText="Delete"
        isLoading={deleteConfirm.isLoading}
        type="danger"
      />
    </div>
  );
};

export default Expenses;
