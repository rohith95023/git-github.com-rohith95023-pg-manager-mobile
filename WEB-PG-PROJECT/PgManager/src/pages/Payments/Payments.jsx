import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { pgAPI, paymentAPI, tenantAPI, reservationAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";
import { Search, UserPlus, Trash2, Calendar, CreditCard, Receipt, Building2, ChevronRight, X, User, CheckCircle2, IndianRupee, Plus, Clock, AlertTriangle, Pencil, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "../../components/ConfirmationModal";
import { z } from "zod";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "../../context/ThemeContext";
import AmountInput from "../../components/AmountInput";
import ThemeToggle from "../../components/ThemeToggle";
import Toast from "../../components/Toast";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Validation Schema
const paymentSchema = z.object({
  tenant_id: z.string().min(1, "Please select a resident"),
  pg_id: z.string().min(1, "Please select a property"),
  reservation_id: z.string().uuid("Please select a reservation").optional().or(z.literal("")),
  amount: z.number().min(1, "Amount must be greater than 0"),
  payment_date: z.string().min(1, "Transaction date is required"),
  billing_month: z.string().optional().or(z.literal("")), 
  type: z.enum(["RENT", "DEPOSIT", "BOOKING", "ADVANCE", "REFUND", "MAINTENANCE", "UTILITIES", "OTHER"]),
  payment_method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE"]),
  status: z.enum(["COMPLETED", "PENDING", "PARTIAL", "FAILED", "PAID"]),
  notes: z.string().optional().or(z.literal("")),
}).refine(data => {
    if (data.type === "RENT" && !data.billing_month) return false;
    return true;
}, {
    message: "Billing month is required for Rent payments",
    path: ["billing_month"]
});


const Payments = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]); // Active Residents
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPg, setFilterPg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState({ isOpen: false, payload: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  const [toast, setToast] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showOverpaymentConfirm, setShowOverpaymentConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const toggleRow = (rowId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Form State
  const [paymentContext, setPaymentContext] = useState("RESIDENT"); // RESIDENT | RESERVATION
  const [formData, setFormData] = useState({
    tenant_id: "",
    pgId: "",
    amount: "",
    txnDate: new Date().toISOString().split('T')[0],
    billingMonth: new Date().toISOString().slice(0, 7), // YYYY-MM default
    type: "RENT",
    method: "CASH",
    status: "COMPLETED",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Fetching Ledger Data...");
      const [paymentsRes, tenantsRes, pgsRes] = await Promise.allSettled([
        paymentAPI.getAll(),
        supabase.from("tenants").select(`*, rooms!room_id(room_number, floor), pgs!pg_id(name), beds!bed_id(bed_number), daily_stay_details(*)`).neq("status", "DELETED"),
        pgAPI.getAll(),
      ]);
      
      if (paymentsRes.status === 'fulfilled') {
          const val = paymentsRes.value;
          const data = Array.isArray(val) ? val : (val?.data || []);
          console.log("Payments Found:", data.length);
          console.log("Payment statuses:", data.map(p => ({ id: p.id, status: p.status, amount: p.amount })));
          setPayments(data);
      } else {
          console.error("Payments Failed:", paymentsRes.reason);
      }

      if (tenantsRes.status === 'fulfilled') {
          const val = tenantsRes.value;
          const data = Array.isArray(val) ? val : (val?.data || []);
          console.log("Tenants Found:", data.length);
          setTenants(data);
      } else {
          console.error("Tenants Failed:", tenantsRes.reason);
      }

      if (pgsRes.status === 'fulfilled') {
          const val = pgsRes.value;
          const data = Array.isArray(val) ? val : (val?.data || []);
          setPgs(data);
      }
    } catch (error) {
      console.error("Critical Error in fetchData:", error);
      showToast("Sync Error: Please check your connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle URL Pre-filling
  useEffect(() => {
    const tenantIdParam = searchParams.get("tenantId");
    const amountParam = searchParams.get("amount");
    
    if (tenantIdParam && tenants.length > 0) {
        const tenant = tenants.find(t => t.id === tenantIdParam);
        if (tenant) {
            setFormData(prev => ({
                ...prev,
                tenant_id: tenantIdParam,
                pgId: tenant.pg_id,
                amount: amountParam || getTenantBalance(tenant.id).toString()
            }));
            setPaymentContext("RESIDENT");
            setShowModal(true);
        }
    }
  }, [searchParams, tenants]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        
        // Auto-fill amount when resident is selected
        if (name === "tenant_id") {
            if (value) {
                const balance = getTenantBalance(value);
                newData.amount = balance.toString();
            } else {
                newData.amount = "";
            }
        }

        // Reset tenant if PG changes
        if (name === "pgId") {
            newData.tenant_id = "";
            newData.amount = "";
        }

        return newData;
    });

    if (formErrors[name]) {
        setFormErrors(prev => ({ ...prev, [name]: null }));
    }
    
    // Clear cascaded errors when auto-filling fields
    if (name === "tenant_id" && value && formErrors.amount) {
        setFormErrors(prev => ({ ...prev, amount: null }));
    }
    if (name === "pgId") {
        setFormErrors(prev => ({ ...prev, tenant_id: null, amount: null }));
    }
  };



  const getTenantBalance = (tenantId) => {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return 0;
      
      const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;

      if (tenant.stay_type === 'DAILY') {
          if (daily?.move_in_date && daily?.vacate_date) {
               const start = new Date(daily.move_in_date);
               const end = new Date(daily.vacate_date);
               let diffDays = 1;
               if (end > start) diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
               const totRent = diffDays * Number(daily.rent_per_day || tenant.rent_per_day || 0) + Number(daily.maintenance_amount || tenant.maintenance_amount || 0);
               return Math.max(0, totRent - Number(daily.paid_amount || 0));
          }
          return Number(daily?.balance_amount || tenant.balance_amount || 0);
      }
      return Number(tenant.balance || 0); 
  };

  const getTenantJoinedDate = (tenantId) => {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return "-";
      const dt = tenant.move_in_date || tenant.check_in_date || tenant.created_at;
      if (!dt) return "-";
      return new Date(dt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormErrors({});
    
    // 1. Prepare payload for validation
    const payload = {
        pg_id: formData.pgId || "",
        tenant_id: formData.tenant_id || "",
        payment_method: formData.method || "",
        payment_date: formData.txnDate || "",
        billing_month: (formData.type === "RENT" && formData.billingMonth) ? `${formData.billingMonth}-01` : "",
        status: formData.status,
        amount: Number(formData.amount) || 0,
        type: formData.type || "",
        notes: formData.notes || "",
        reservation_id: formData.reservation_id || undefined,
    };

    // 2. Client-side Validation - Perform BEFORE setting loading state
    const validationResult = paymentSchema.safeParse(payload);
    if (!validationResult.success) {
        const errors = {};
        const issues = validationResult.error?.issues || validationResult.error?.errors || [];
        issues.forEach(err => {
            const key = (err.path && err.path.length > 0) ? err.path[0] : 'general';
            const uiKey = key === 'billing_month' ? 'billingMonth' : 
                         key === 'payment_date' ? 'txnDate' : 
                         key === 'payment_method' ? 'method' : 
                         key === 'pg_id' ? 'pgId' : key;
            errors[uiKey] = err.message;
        });
        
        console.log("Validation Errors:", errors); // Log for debugging
        setFormErrors(errors);
        showToast("Please complete all highlighted mandatory fields.", "error");
        
        // Return without submitting
        return;
    }

    // 3. Start Processing
    setIsSubmitting(true);
    try {
        // Auto-fill PG/Room/Bed IDs based on selection
        const selectedEntity = tenants.find(t => t.id === payload.tenant_id);
        if (selectedEntity) {
            payload.pg_id = selectedEntity.pg_id || selectedEntity.pgId;
            payload.room_id = selectedEntity.room_id; 
            payload.bed_id = selectedEntity.bed_id;
        }

        // Duplicate Check (Client Side)
        if (payload.type === "RENT") {
            const isDuplicate = payments.some(p => 
                p.tenant_id === payload.tenant_id && 
                (p.billing_month === payload.billing_month || p.billingmonth === payload.billing_month) && 
                p.id !== (editingPayment?.id || "")
            );
            if (isDuplicate) {
                setDuplicateConfirm({ isOpen: true, payload });
                setIsSubmitting(false);
                return;
            }
        }

        // Overpayment Check
        const balance = getTenantBalance(payload.tenant_id);
        if (payload.amount > balance && !showOverpaymentConfirm) {
            setPendingPayload(payload);
            setShowOverpaymentConfirm(true);
            setIsSubmitting(false);
            return;
        }

        await processSubmit(payload);
    } catch (error) {
        console.error("Submission error:", error);
        showToast("Error: " + error.message, "error");
        setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
    // Clear URL parameters to allow re-opening the modal for the same tenant
    if (searchParams.has("tenantId") || searchParams.has("amount")) {
        navigate("/payments", { replace: true });
    }
  };

  const processSubmit = async (payload) => {
    try {
        setIsSubmitting(true);
        if (editingPayment) {
            await paymentAPI.update(editingPayment.id, payload);
        } else {
            const newPayment = await paymentAPI.create(payload);
            
            // Financial Logic: Update Tenant/Stay Balance
            if (payload.status === 'COMPLETED' || payload.status === 'PAID') {
                const tenant = tenants.find(t => t.id === payload.tenant_id);
                if (tenant) {
                    if (payload.type === 'DEPOSIT') {
                        // Update Security Deposit Paid
                        const currentDeposit = Number(tenant.security_deposit || 0);
                        await tenantAPI.update(tenant.id, { security_deposit: currentDeposit + payload.amount });
                    } else if (payload.type === 'RENT') {
                        // Update Rent Balance
                        const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
                        if (tenant.stay_type === 'DAILY') {
                            const currentPaid = Number(daily?.paid_amount || tenant.paid_amount || 0);
                            const totalRent = Number(daily?.total_rent || tenant.total_rent || 0);
                            const newPaid = currentPaid + payload.amount;
                            const newBalance = Math.max(0, totalRent - newPaid);
                            await tenantAPI.update(tenant.id, { 
                                paid_amount: newPaid, 
                                balance_amount: newBalance 
                            });
                        } else {
                            const currentBalance = Number(tenant.balance || 0);
                            await tenantAPI.update(tenant.id, { balance: currentBalance - payload.amount });
                        }
                    } else if (payload.type === 'REFUND') {
                        // Refund reduces security deposit
                        const currentDeposit = Number(tenant.security_deposit || 0);
                        await tenantAPI.update(tenant.id, { security_deposit: Math.max(0, currentDeposit - payload.amount) });
                    }

                    // Maintenance Paid Status Tracking
                    const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
                    const maintAmt = tenant.stay_type === 'DAILY' ? (daily?.maintenance_amount || 0) : (tenant.maintenance_amount || 0);
                    const maintType = tenant.stay_type === 'DAILY' ? daily?.maintenance_type : tenant.maintenance_type;

                    if (maintType === 'one_time' && !tenant.maintenance_paid) {
                        if (payload.type === 'MAINTENANCE' || payload.amount >= maintAmt || (payload.type === 'RENT' && payload.amount > 0)) {
                             // Mark as paid if explicit or if paying rent (assuming maintenance is prioritized/included)
                             await tenantAPI.update(tenant.id, { maintenance_paid: true });
                        }
                    }
                }
            }
        }

        // Close modal and clear form/URL immediately
        handleCloseModal();

        // 3. Show success message
        showToast(editingPayment ? "Payment updated successfully" : "Payment recorded successfully");

        // 4. Refresh data in background
        await fetchData();
    } catch (error) {
        console.error("Submission error details:", error);
        if (error instanceof z.ZodError) {
            const errors = {};
            const issues = error.issues || error.errors || [];
            issues.forEach(err => {
                const key = (err.path && err.path.length > 0) ? err.path[0] : 'general';
                // Map database/schema names back to UI field names
                const uiKey = key === 'billing_month' ? 'billingMonth' : 
                             key === 'payment_date' ? 'txnDate' : 
                             key === 'payment_method' ? 'method' : 
                             key === 'pg_id' ? 'pgId' : key;
                errors[uiKey] = err.message;
            });
            setFormErrors(errors);
            showToast("Validation failed based on server rules.", "error");
        } else {
            setFormErrors({ general: error.message || "An unexpected error occurred. Please try again." });
            showToast("An unexpected error occurred. Please try again.", "error");
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tenant_id: "",
      pgId: "",
      amount: "",
      txnDate: new Date().toISOString().split('T')[0],
      billingMonth: new Date().toISOString().slice(0, 7),
      type: "RENT",
      method: "CASH",
      status: "COMPLETED",
      notes: "",
    });
    setPaymentContext("RESIDENT");
    setFormErrors({});
    setEditingPayment(null);
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    
    setFormData({
      tenant_id: payment.tenant_id || "",
      pgId: payment.pg_id || payment.pgId || payment.pgid || "",
      amount: payment.amount?.toString() || "",
      txnDate: payment.payment_date || payment.txndate || "", 
      billingMonth: (payment.billing_month || payment.billingmonth || "").slice(0, 7),
      type: payment.type || payment.payment_type || "RENT", 
      method: payment.payment_method || payment.method || "CASH",
      status: payment.status || "COMPLETED",
      notes: payment.notes || "",
    });
    setShowModal(true);
  };
   
  const handleDelete = async (id) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    const { id } = deleteConfirm;
    await paymentAPI.delete(id);
    fetchData();
    setDeleteConfirm({ isOpen: false, id: null });
  };

  // Calculations
  const totalReceived = payments.filter(p => {
      const s = (p.status || "").toUpperCase();
      return s === 'PAID' || s === 'COMPLETED';
  }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  // Update: Pending stat now correctly reflects outstanding dues from all residents 
  // to match the "DUE" badges in the Resident Directory.
  const totalPending = tenants.reduce((sum, t) => sum + getTenantBalance(t.id), 0);
  
  // Create Virtual "Due" Records from residents with balances
  const outstandingDues = tenants
      .filter(t => getTenantBalance(t.id) > 0)
      .map(t => ({
          id: `due-${t.id}`,
          tenant_id: t.id,
          amount: getTenantBalance(t.id),
          status: 'PENDING_DUE',
          tenants: t,
          type: 'RENT',
          payment_date: null,
          isVirtual: true,
          billing_month: t.move_in_date // Fallback for sorting
      }));

  const allDisplayItems = [...payments, ...outstandingDues];

  const groupKey = (p) => {
      if (p.isVirtual) return `due-${p.tenant_id}`;
      const tId = p.tenant_id;
      const bMonth = p.billing_month || p.billingMonth || p.billingmonth || "no-month";
      const type = p.type || p.payment_type;
      
      if (type === 'RENT') return `rent-${tId}-${bMonth}`;
      return `other-${p.id}`;
  };

  const groupedData = allDisplayItems.filter(p => {
      let matchStatus = true;
      const pStatus = (p.status || "").toUpperCase();
      
      if (filterStatus) {
          if (filterStatus === 'PAID') {
              matchStatus = pStatus === 'PAID' || pStatus === 'COMPLETED';
          } else if (filterStatus === 'PENDING') {
              matchStatus = pStatus === 'PENDING' || pStatus === 'PENDING_DUE';
          } else {
              matchStatus = pStatus === filterStatus.toUpperCase();
          }
      }
      
      const rawT = p.tenants || p.tenant;
      const tInfo = Array.isArray(rawT) ? rawT[0] : (rawT || {});
      const pgId = tInfo.pg_id || tInfo.pgId || p.pg_id || p.pgId || "";
      const tenantName = tInfo.full_name?.toLowerCase() || "";
      const searchLower = searchTerm.toLowerCase();
      const bMonth = (p.billing_month || p.billingMonth || p.billingmonth || "").toLowerCase();
      
      const matchSearch = tenantName.includes(searchLower) || bMonth.includes(searchLower);
      const matchPg = !filterPg || pgId === filterPg;

      return matchStatus && matchSearch && matchPg;
  }).reduce((acc, p) => {
      const key = groupKey(p);
      if (!acc[key]) {
          acc[key] = {
              ...p,
              id: key,
              items: [],
              totalAmount: 0,
              isGrouped: false
          };
      }
      acc[key].items.push(p);
      acc[key].totalAmount += Number(p.amount);
      if (acc[key].items.length > 1) acc[key].isGrouped = true;
      return acc;
  }, {});

  const filteredPayments = Object.values(groupedData).sort((a, b) => {
      const dateA = new Date(a.payment_date || a.payment_date || a.billing_month || 0);
      const dateB = new Date(b.payment_date || b.payment_date || b.billing_month || 0);
      return dateB - dateA;
  });

  if (loading) return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20">
      <Toast 
        isOpen={!!toast}
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20">
                <IndianRupee size={24} strokeWidth={2.5} />
             </div>
             <div>
                <h1 className={cn("text-2xl md:text-4xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Financial Records
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">Accounting Core</span>
                    <span className="text-slate-400 text-xs font-bold font-mono">v3.0.1</span>
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className={cn("hidden lg:flex flex-col items-end px-4 py-2 rounded-2xl border bg-white/5", isDark ? "border-white/10" : "border-slate-200 bg-slate-50")}>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Last Synced</span>
                <span className="text-[11px] font-bold text-slate-400">Real-time (Auto)</span>
            </div>
            <button 
                onClick={toggleTheme}
                className={cn(
                    "p-2.5 rounded-2xl border backdrop-blur-md transition-all flex justify-center items-center hover:scale-105 active:scale-95",
                    isDark ? "bg-slate-800/50 border-white/10 text-amber-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                )}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
                onClick={() => { resetForm(); setShowModal(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-blue-500/30 active:scale-95 group"
            >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                Add Entry
            </button>
        </div>
      </div>

       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          <div className={cn("p-5 rounded-3xl border relative overflow-hidden group transition-all hover:shadow-xl", isDark ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white border-slate-200 shadow-sm")}>
             <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle2 size={20}/></div>
                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg">Collected</div>
             </div>
             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Total Received</p>
             <p className="text-2xl font-black mt-1">₹{totalReceived.toLocaleString()}</p>
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <CheckCircle2 size={80} />
             </div>
          </div>

          <div className={cn("p-5 rounded-3xl border relative overflow-hidden group transition-all hover:shadow-xl", isDark ? "bg-amber-500/5 border-amber-500/20" : "bg-white border-slate-200 shadow-sm")}>
             <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Clock size={20}/></div>
                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-lg">Pending</div>
             </div>
             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Outstanding Dues</p>
             <p className="text-2xl font-black mt-1">₹{totalPending.toLocaleString()}</p>
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Clock size={80} />
             </div>
          </div>

          <div className={cn("p-5 rounded-3xl border relative overflow-hidden group transition-all hover:shadow-xl", isDark ? "bg-blue-500/5 border-blue-500/20" : "bg-white border-slate-200 shadow-sm")}>
             <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500"><CreditCard size={20}/></div>
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-lg">Target</div>
             </div>
             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Total Receivable</p>
             <p className="text-2xl font-black mt-1">₹{(totalReceived + totalPending).toLocaleString()}</p>
          </div>

          <div className={cn("p-5 rounded-3xl border relative overflow-hidden", isDark ? "bg-slate-900 border-white/5" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Collection Rate</p>
                  <span className="text-lg font-black text-emerald-500">
                      {Math.round((totalReceived / (totalReceived + totalPending || 1)) * 100)}%
                  </span>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(totalReceived / (totalReceived + totalPending || 1)) * 100}%` }}
                  ></div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-3 uppercase tracking-tighter">
                  Real-time collection efficiency across all properties
              </p>
          </div>
       </div>

       {/* Table/List View */}
       <div className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-200")}>
          <div className={cn("p-4 border-b flex flex-col md:flex-row gap-4", isDark ? "border-white/5" : "border-slate-100")}>
              <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search resident, guest or month..." className={cn("w-full pl-10 pr-4 py-2 rounded-xl border bg-transparent outline-none focus:ring-2", isDark ? "border-white/10 focus:ring-blue-500/20" : "border-slate-200 focus:ring-blue-500/20")} />
              </div>
               <select 
                value={filterPg} 
                onChange={e => setFilterPg(e.target.value)}
                className={cn("px-4 py-2 rounded-xl border bg-transparent outline-none focus:ring-2 text-sm font-semibold cursor-pointer min-w-[150px]", isDark ? "border-white/10 focus:ring-blue-500/20 text-white" : "border-slate-200 focus:ring-blue-500/20 text-slate-700")}
              >
                  <option value="">All Properties</option>
                  {pgs.map(pg => <option key={pg.id} value={pg.id}>{pg.name}</option>)}
              </select>
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className={cn("px-4 py-2 rounded-xl border bg-transparent outline-none focus:ring-2 text-sm font-semibold cursor-pointer", isDark ? "border-white/10 focus:ring-blue-500/20 text-white" : "border-slate-200 focus:ring-blue-500/20 text-slate-700")}
              >
                  <option value="">All Statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
              </select>
          </div>
          
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className={cn("border-b", isDark ? "border-white/5 bg-white/5" : "bg-slate-200/60 border-slate-300")}>
                    <tr className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-950")}>
                        <th className="px-6 py-4">Payment For</th>
                        <th className="px-6 py-4">Joining Date</th>
                        <th className="px-6 py-4">Details</th>
                        <th className="px-6 py-4" title="Represents rent billing cycle. Not the payment date.">Billing Period</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-100")}>
                    {filteredPayments.map(group => (
                        <>
                        <tr key={group.id} className={cn(
                            "group transition-colors", 
                            group.isVirtual ? (isDark ? "bg-amber-500/5" : "bg-amber-50/50") : (isDark ? "hover:bg-white/5" : "hover:bg-slate-50")
                        )}>
                            <td className="px-6 py-4 font-bold text-base text-slate-800 dark:text-slate-100">
                                <div className="flex items-center gap-2">
                                    {group.isGrouped && (
                                        <button 
                                            onClick={() => toggleRow(group.id)}
                                            className={cn(
                                                "p-1 rounded transition-all duration-200",
                                                isDark ? "text-slate-200 hover:bg-blue-500/20 hover:text-blue-400" : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                                            )}
                                            style={{ transform: expandedRows.has(group.id) ? 'rotate(90deg)' : 'none' }}
                                        >
                                            <ChevronRight size={14} strokeWidth={2.5} />
                                        </button>
                                    )}
                                     <div className={cn("p-1.5 rounded-lg transition-transform hover:scale-110 shadow-sm", group.isVirtual ? "bg-amber-500/20 text-amber-500 border border-amber-500/20" : "bg-blue-500/20 text-blue-500 border border-blue-500/20")}>
                                        {group.isVirtual ? <Clock size={14} strokeWidth={2.5}/> : <User size={14} strokeWidth={2.5}/>}
                                    </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black truncate max-w-[150px]">{(group.tenants || group.tenant)?.full_name || "Resident"}</span>
                                                {((group.tenants || group.tenant)?.stay_type) && (
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border",
                                                        (group.tenants || group.tenant).stay_type === 'MONTHLY' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                                    )}>
                                                        {(group.tenants || group.tenant).stay_type}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={cn("text-[9px] font-bold uppercase tracking-tighter", isDark ? "text-slate-400" : "text-slate-500")}>
                                                {group.isVirtual ? "Outstanding Account" : "Registered Resident"}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn("text-xs font-bold font-mono", isDark ? "text-slate-400" : "text-slate-500")}>
                                        {(group.tenants || group.tenant)?.move_in_date ? 
                                            (group.tenants || group.tenant).move_in_date : 
                                            <span className="opacity-50 italic text-[10px]">Not Assigned</span>
                                        }
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className={cn("text-sm font-semibold tracking-tight", isDark ? "text-slate-200" : "text-slate-900")}>
                                            {(group.tenants || group.tenant)?.pgs?.name || group.pgs?.name || "Previous Allocation"}
                                        </span>
                                        <div className={cn("text-[10px] font-medium flex items-center gap-1.5 mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
                                            {(group.tenants || group.tenant)?.rooms ? (
                                                <span>
                                                    {`Floor ${(group.tenants || group.tenant).rooms.floor || 0} • Room ${(group.tenants || group.tenant).rooms.room_number}`}
                                                    {((group.tenants || group.tenant).beds?.bed_number) && ` • ${(group.tenants || group.tenant).beds.bed_number}`}
                                                </span>
                                            ) : (
                                                <span className="opacity-50">Room Not Assigned</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {group.type === 'RENT' && (group.billing_month || group.billingMonth || group.billingmonth) ? (
                                        <div className="flex flex-col">
                                            <span className={cn("px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest w-fit cursor-help", isDark ? "border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "border-blue-100 bg-blue-50 text-blue-600 shadow-sm")} title="Represents rent billing cycle. Not the payment date.">
                                                {group.billing_month || group.billingMonth || group.billingmonth}
                                            </span>
                                            {!group.isVirtual && <span className={cn("text-[9px] mt-1 font-bold italic", isDark ? "text-slate-400" : "text-slate-500")}>Monthly Rent Cycle</span>}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 tracking-tight">{group.payment_date || group.txnDate || group.txndate || "-"}</span>
                                            <span className={cn("text-[9px] font-bold uppercase tracking-tighter mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>{group.type || "OTHER"}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-lg font-black text-emerald-500 tabular-nums">₹{group.totalAmount.toLocaleString()}</span>
                                        {group.isGrouped && <span className={cn("text-[9px] font-bold uppercase tracking-tighter", isDark ? "text-slate-400" : "text-slate-500")}>Combined ({group.items.length} TXNS)</span>}
                                    </div>
                                </td>
                            <td className="px-6 py-4">
                                <span className={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm transition-all", 
                                    group.status?.toUpperCase() === 'COMPLETED' || group.status?.toUpperCase() === 'PAID' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5" : 
                                    group.status?.toUpperCase() === 'PENDING' || group.status === 'PENDING_DUE' ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse-slow shadow-amber-500/5" : "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-rose-500/5"
                                )}>
                                    {group.status === 'PENDING_DUE' ? 'OUTSTANDING' : (['COMPLETED', 'PAID'].includes(group.status?.toUpperCase()) ? 'PAID' : (group.status || '-'))}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    {group.isVirtual ? (
                                        <button 
                                            onClick={() => navigate(`/payments?tenantId=${group.tenant_id}&amount=${group.amount}`)}
                                            className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-700 transition-all"
                                        >
                                            Pay Now
                                        </button>
                                    ) : (
                                        <>
                                            {!group.isGrouped && (
                                                <>
                                                    <button onClick={() => handleEdit(group.items[0])} className="p-2 hover:bg-blue-500/10 text-blue-500 rounded"><Pencil size={16}/></button>
                                                </>
                                            )}
                                            {group.isGrouped && (
                                                <button onClick={() => toggleRow(group.id)} className="text-[10px] font-bold text-blue-500 hover:underline">
                                                    {expandedRows.has(group.id) ? "Hide Details" : "View Split"}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                        {group.isGrouped && expandedRows.has(group.id) && group.items.map((item, idx) => (
                            <tr key={item.id} className={cn("text-[11px]", isDark ? "bg-white/5" : "bg-slate-50")}>
                                <td colSpan={2} className="px-10 py-2 border-l-2 border-blue-500">Payment #{idx + 1}</td>
                                <td className="px-6 py-2 opacity-70">{item.payment_method}</td>
                                <td className="px-6 py-2 opacity-70">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <Calendar size={10} /> {item.payment_date}
                                        <span className="text-[8px] opacity-40 uppercase tracking-tighter">(Payment Date)</span>
                                    </span>
                                </td>
                                <td className="px-6 py-2 font-bold">₹{Number(item.amount).toLocaleString()}</td>
                                <td className="px-6 py-2">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-600">Edit</button>
                                        <button onClick={() => handleDelete(item.id)} className="text-rose-500 hover:text-rose-600">Delete</button>
                                    </div>
                                </td>
                                <td></td>
                            </tr>
                        ))}
                        </>
                    ))}
                    {filteredPayments.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                No payments found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className={cn("md:hidden divide-y", isDark ? "divide-white/5" : "divide-slate-100")}>
                {filteredPayments.map(group => (
                    <div key={group.id} className={cn("p-4 space-y-4", group.isVirtual && (isDark ? "bg-amber-500/5" : "bg-amber-50/50"))}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl", group.isVirtual ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500")}>
                                    {group.isVirtual ? <Clock size={16}/> : <User size={16}/>}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                                            {(group.tenants || group.tenant)?.full_name || "Resident"}
                                        </h3>
                                        {((group.tenants || group.tenant)?.stay_type) && (
                                            <span className={cn(
                                                "px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border",
                                                (group.tenants || group.tenant).stay_type === 'MONTHLY' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                            )}>
                                                {(group.tenants || group.tenant).stay_type}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">
                                        {group.isVirtual ? "Outstanding Due" : `${group.items.length > 1 ? group.items.length + " Payments" : (group.payment_method || "CASH") + " • " + group.type}`}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                group.status?.toUpperCase() === 'COMPLETED' || group.status?.toUpperCase() === 'PAID' ? "bg-emerald-500/10 text-emerald-500" :
                                group.status?.toUpperCase() === 'PENDING' || group.status === 'PENDING_DUE' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                                {group.status === 'PENDING_DUE' ? 'OUTSTANDING' : (['COMPLETED', 'PAID'].includes(group.status?.toUpperCase()) ? 'PAID' : (group.status || '-'))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                             <div className="bg-slate-100/50 dark:bg-white/5 p-2 rounded-xl border border-slate-200/50 dark:border-white/5">
                                <p className="text-[8px] uppercase font-bold text-slate-500 tracking-tighter">Joining Date</p>
                                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {(group.tenants || group.tenant)?.move_in_date || "Not Assigned"}
                                </p>
                             </div>
                             <div className="bg-slate-100/50 dark:bg-white/5 p-2 rounded-xl border border-slate-200/50 dark:border-white/5">
                                <p className="text-[8px] uppercase font-bold text-slate-500 tracking-tighter">Location Context</p>
                                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                                    <div className="truncate">{(group.tenants || group.tenant)?.pgs?.name || group.pgs?.name || "Previous Allocation"}</div>
                                    <div className="text-[9px] opacity-70">
                                        {(group.tenants || group.tenant)?.rooms ? 
                                            `F${(group.tenants || group.tenant).rooms.floor} • R${(group.tenants || group.tenant).rooms.room_number}` : 
                                            "Room Not Assigned"
                                        }
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-100/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
                            <div>
                                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-tighter">Amount Paid</p>
                                <p className="text-lg font-black text-emerald-600">₹{group.totalAmount.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-tighter">Billing Period</p>
                                <p className={cn("text-[11px] font-bold", isDark ? "text-white" : "text-slate-900")}>
                                    {group.type === 'RENT' ? (group.billing_month || group.billingMonth || group.billingmonth || "-") : (group.payment_date || group.txnDate || "-")}
                                </p>
                            </div>
                        </div>

                        {group.isGrouped && (
                            <div className="space-y-2">
                                <button 
                                    onClick={() => toggleRow(group.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-blue-500/5 text-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/10"
                                >
                                    <span>{expandedRows.has(group.id) ? "Hide Details" : `Show ${group.items.length} Split Payments`}</span>
                                    <ChevronRight size={14} className={cn("transition-transform", expandedRows.has(group.id) && "rotate-90")} />
                                </button>
                                
                                {expandedRows.has(group.id) && (
                                    <div className="space-y-2 pl-2 border-l-2 border-blue-500/30">
                                        {group.items.map((item, idx) => (
                                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                                                <div className="text-[10px] font-bold">
                                                    <span className="opacity-50 mr-2">#{idx+1}</span>
                                                    {item.payment_date}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black">₹{Number(item.amount).toLocaleString()}</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleEdit(item)} className="p-1 text-blue-500"><Pencil size={14}/></button>
                                                        <button onClick={() => handleDelete(item.id)} className="p-1 text-rose-500"><Trash2 size={14}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            {group.isVirtual ? (
                                <button 
                                    onClick={() => navigate(`/payments?tenantId=${group.tenant_id}&amount=${group.amount}`)}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/30"
                                >
                                    Pay Now
                                </button>
                            ) : !group.isGrouped && (
                                <>
                                    <button onClick={() => handleEdit(group.items[0])} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500/10 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                                        <Pencil size={14} /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(group.items[0].id)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
           </div>
       </div>
       {/* Modal */}
       {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className={cn("fixed inset-0 transition-opacity", isDark ? "bg-slate-950/80" : "bg-black/40")} />
          <div className={cn(
            "relative w-full max-w-2xl border-2 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] md:max-h-[90vh] overflow-hidden",
            isDark ? "bg-[#0f172a] border-white/10" : "bg-white border-slate-200"
          )}>
           
           <div className={cn(
             "px-8 py-6 border-b flex items-center justify-between shrink-0", 
             isDark ? "border-white/5 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"
           )}>
               <h2 className="text-xl font-bold flex items-center gap-3">
                   <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-500 shadow-inner">
                        <IndianRupee size={22}/>
                   </div>
                   <div className="flex flex-col">
                        <span className={cn("text-base leading-none", isDark ? "text-white" : "text-slate-900")}>
                            {editingPayment ? "Update Record" : "New Payment Entry"}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Record financial transaction</span>
                   </div>
               </h2>
               <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"><X size={20} /></button>
           </div>

           <form onSubmit={handleSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">

                {/* Property & Resident Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between h-5 ml-1">
                            <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Property (PG) <span className="text-rose-500">*</span></label>
                        </div>
                        <select 
                            name="pgId" 
                            value={formData.pgId} 
                            onChange={handleInputChange} 
                            className={cn(
                                "w-full border-2 rounded-2xl px-4 outline-none focus:ring-4 transition-all text-sm font-bold h-[50px] leading-[50px]", 
                                isDark ? "bg-slate-800/30 border-white/5 focus:border-blue-500/50 focus:ring-blue-500/10" : "bg-slate-50 border-slate-100 focus:border-blue-500/50 focus:ring-blue-500/10",
                                formErrors.pgId && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20"
                            )}
                        >
                            <option value="">-- Choose PG --</option>
                            {pgs.map(pg => (
                                <option key={pg.id} value={pg.id}>{pg.name}</option>
                            ))}
                        </select>
                        {formErrors.pgId && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 ml-1">{formErrors.pgId}</p>}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between h-5 ml-1">
                            <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Resident <span className="text-rose-500">*</span></label>
                            {formData.tenant_id && (
                                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter", getTenantBalance(formData.tenant_id) > 0 ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500")}>
                                    Due: ₹{getTenantBalance(formData.tenant_id).toLocaleString()}
                                </span>
                            )}
                        </div>
                        <div className="relative group">
                            <select 
                                name="tenant_id" 
                                value={formData.tenant_id} 
                                onChange={handleInputChange} 
                                disabled={!formData.pgId}
                                className={cn(
                                    "w-full border-2 rounded-2xl px-4 pr-10 outline-none focus:ring-4 transition-all appearance-none text-sm font-bold h-[50px] leading-[50px]", 
                                    isDark ? "bg-slate-800/30 border-white/5 focus:border-blue-500/50 focus:ring-blue-500/10" : "bg-slate-50 border-slate-100 focus:border-blue-500/50 focus:ring-blue-500/10",
                                    !formData.pgId && "opacity-50 cursor-not-allowed",
                                    formErrors.tenant_id && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20"
                                )}
                            >
                                <option value="">{formData.pgId ? "-- Choose Resident --" : "Select PG first"}</option>
                                {tenants
                                    .filter(t => (t.pg_id || t.pgId) === formData.pgId)
                                    .map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.full_name} — {t.rooms?.room_number ? `Room ${t.rooms.room_number}` : "N/A"} {t.rooms?.floor ? `(Floor ${t.rooms.floor})` : ""}
                                        </option>
                                    ))
                                }
                            </select>
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                        </div>
                        {formErrors.tenant_id && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 ml-1">{formErrors.tenant_id}</p>}
                        
                        {/* Maintenance Info Notification */}
                        {formData.tenant_id && formData.type === "RENT" && (() => {
                            const tenant = tenants.find(t => t.id === formData.tenant_id);
                            const daily = Array.isArray(tenant?.daily_stay_details) ? tenant.daily_stay_details[0] : tenant?.daily_stay_details;
                            const maintAmt = tenant?.stay_type === 'DAILY' ? (daily?.maintenance_amount || 0) : (tenant?.maintenance_amount || 0);
                            const maintType = tenant?.stay_type === 'DAILY' ? daily?.maintenance_type : tenant?.maintenance_type;
                            
                            if (maintAmt > 0) {
                                return (
                                    <div className={cn("mt-2 p-3 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-1", isDark ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50 border-blue-100")}>
                                        <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500"><IndianRupee size={12}/></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-tight">Maintenance Included</p>
                                            <p className="text-[9px] text-blue-500/70 font-medium">₹{maintAmt.toLocaleString()} ({maintType === 'monthly' ? 'Monthly' : 'One-time'}) fee factored into the rent balance.</p>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>

                {/* Category & Joined Date Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between h-5 ml-1">
                            <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Payment Category</label>
                        </div>
                        <div className={cn("flex gap-2 p-1.5 rounded-2xl border-2 h-[50px]", isDark ? "bg-slate-900 border-white/5" : "bg-slate-100 border-slate-200/50")}>
                            {["RENT"].map(cat => (
                               <button
                                 key={cat}
                                 type="button"
                                 onClick={() => setFormData(prev => ({ ...prev, type: cat }))}
                                 className={cn(
                                    "flex-1 h-full rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                    formData.type === cat 
                                        ? (isDark ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-white text-blue-600 shadow-md")
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
                                 )}
                               >
                                 {cat}
                               </button> 
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between h-5 ml-1">
                            <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Joined Date</label>
                        </div>
                        <input 
                            type="text" 
                            disabled 
                            value={formData.tenant_id ? getTenantJoinedDate(formData.tenant_id) : "-"} 
                            className={cn(
                                "w-full border-2 rounded-2xl px-4 outline-none focus:ring-4 transition-all text-sm font-bold h-[50px] leading-[50px]", 
                                isDark ? "bg-slate-800/30 border-white/5 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500",
                                "opacity-70 cursor-not-allowed"
                            )} 
                        />
                    </div>
                </div>

                {/* Amount & Date/Month */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <AmountInput 
                        label={<>Amount (₹) <span className="text-rose-500">*</span></>}
                        name="amount"
                        value={formData.amount}
                        isDark={isDark}
                        onChange={handleInputChange}
                        error={formErrors.amount}
                     />
                     
                     {formData.type === "RENT" ? (
                         <div className="space-y-2 flex-1">
                             <div className="flex items-center justify-between h-5 ml-1">
                                 <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Billing Month</label>
                             </div>
                             <input 
                                 type="month" 
                                 name="billingMonth" 
                                 value={formData.billingMonth} 
                                 onChange={handleInputChange} 
                                 className={cn(
                                     "w-full border-2 rounded-2xl px-4 outline-none focus:ring-4 transition-all text-sm font-bold h-[50px]", 
                                     isDark ? "bg-slate-800/30 border-white/5 focus:border-blue-500/50 focus:ring-blue-500/10" : "bg-slate-50 border-slate-100 focus:border-blue-500/50 focus:ring-blue-500/10",
                                     formErrors.billingMonth && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20"
                                 )} 
                             />
                             {formErrors.billingMonth && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 ml-1">{formErrors.billingMonth}</p>}
                         </div>
                     ) : (
                        <div className="space-y-2 flex-1">
                            <div className="flex items-center justify-between h-5 ml-1">
                                <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Transaction Date</label>
                            </div>
                            <input type="date" name="txnDate" value={formData.txnDate} onChange={handleInputChange} className={cn("w-full border-2 rounded-2xl px-4 outline-none focus:ring-4 transition-all text-sm font-bold h-[50px]", isDark ? "bg-slate-800/30 border-white/5 focus:border-blue-500/50 focus:ring-blue-500/10" : "bg-slate-50 border-slate-100 focus:border-blue-500/50 focus:ring-blue-500/10", formErrors.txnDate && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20")} />
                            {formErrors.txnDate && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 ml-1">{formErrors.txnDate}</p>}
                        </div>
                     )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between h-5 ml-1">
                        <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Notes / Remarks</label>
                    </div>
                    <textarea 
                        name="notes" 
                        value={formData.notes} 
                        onChange={handleInputChange} 
                        className={cn("w-full border-2 rounded-2xl p-4 outline-none text-sm min-h-[80px] resize-none focus:ring-4 transition-all", isDark ? "bg-slate-800/30 border-white/5 text-white focus:border-blue-500/50 focus:ring-blue-500/10" : "bg-slate-50 border-slate-100 text-slate-800 focus:border-blue-500/50 focus:ring-blue-500/10")} 
                        placeholder="Transaction ID, Remarks, or Payment Details..." 
                    />
                </div>

                {/* Status selector removed as per user request - defaulting to COMPLETED */}

                <AnimatePresence>
                    {Object.values(formErrors).filter(Boolean).length > 0 && (
                        <motion.div 
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            className="fixed top-24 right-8 z-[200] w-80 shadow-2xl"
                        >
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[24px] flex gap-4 items-start border-l-4 border-l-rose-500">
                                <div className="bg-rose-500/10 p-2.5 rounded-2xl shrink-0">
                                    <AlertTriangle size={20} className="text-rose-500" />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                                        {formErrors.general ? "Action Blocked" : "Form Incomplete"}
                                    </p>
                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
                                        {formErrors.general 
                                            ? formErrors.general 
                                            : `We found ${Object.values(formErrors).filter(Boolean).length} issues. Please review the highlighted fields to proceed.`}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pt-4 flex items-center gap-4">
                    <button type="button" onClick={handleCloseModal} className="flex-1 px-8 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-xs uppercase tracking-[0.2em] border-2 border-transparent hover:border-slate-200 dark:hover:border-white/10">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex-[2] px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? "Processing..." : (editingPayment ? "Update Record" : "Save Payment")}
                    </button>
                </div>

            </form>

          </div>
        </div>
      )}
      {/* Modal Overlays */}
      <ConfirmationModal 
        isOpen={duplicateConfirm.isOpen}
        onClose={() => setDuplicateConfirm({ isOpen: false, payload: null })}
        onConfirm={() => {
            const payload = duplicateConfirm.payload;
            setDuplicateConfirm({ isOpen: false, payload: null });
            processSubmit(payload);
        }}
        title="Duplicate Rent Notification"
        message="A RENT payment for this resident and month already exists in the records. Do you still wish to proceed with this entry?"
        confirmText="Yes, Add Anyway"
        type="info"
      />

      <ConfirmationModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Payment Record?"
        message="Are you sure you want to delete this payment record? Please note that this will NOT automatically revert any associated balance changes made to the resident's account."
        confirmText="Confirm Delete"
        type="danger"
      />

      <ConfirmationModal 
        isOpen={showOverpaymentConfirm}
        onClose={() => {
            setShowOverpaymentConfirm(false);
            setPendingPayload(null);
        }}
        onConfirm={() => {
            const payload = pendingPayload;
            setShowOverpaymentConfirm(false);
            setPendingPayload(null);
            processSubmit(payload);
        }}
        title="Confirm Overpayment"
        message={`This payment amount (₹${pendingPayload?.amount?.toLocaleString()}) exceeds the resident's current pending balance (₹${getTenantBalance(pendingPayload?.tenant_id).toLocaleString()}). Do you wish to proceed and record this as an overpayment?`}
        confirmText="Record Overpayment"
        type="warning"
      />
    </div>
  );
};

export default Payments;
