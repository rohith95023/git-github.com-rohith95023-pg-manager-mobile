import React, { useState, useEffect } from "react";
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
  const [allTenantsForFinancials, setAllTenantsForFinancials] = useState([]); // Active + Deleted Daily (for financial records)
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
  const [invoices, setInvoices] = useState([]);
  const [tenantCredits, setTenantCredits] = useState({});

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
      const [paymentsRes, tenantsRes, deletedTenantsRes, pgsRes] = await Promise.allSettled([
        paymentAPI.getAll(),
        supabase.from("tenants").select(`*, rooms!room_id(room_number, floor), pgs!pg_id(name), beds!bed_id(bed_number), daily_stay_details(*)`).neq("status", "DELETED"),
        // Fetch ALL DELETED tenants (both DAILY and MONTHLY) to preserve their financial records.
        // tenantAPI.hardDelete() is a soft-delete (status='DELETED') so data is still in DB.
        supabase.from("tenants").select(`*, rooms!room_id(room_number, floor), pgs!left(name), beds!bed_id(bed_number), daily_stay_details(*)`).eq("status", "DELETED"),
        pgAPI.getAll(),
      ]);
      
      let fetchedTenants = [];
      if (tenantsRes.status === 'fulfilled') {
          fetchedTenants = Array.isArray(tenantsRes.value) ? tenantsRes.value : (tenantsRes.value?.data || []);
          setTenants(fetchedTenants);
      }

      // Merge ALL deleted tenants (daily + monthly) for financial records display
      let allTenantsForFinancials = [...fetchedTenants];
      if (deletedTenantsRes.status === 'fulfilled') {
          const deletedTenants = Array.isArray(deletedTenantsRes.value) ? deletedTenantsRes.value : (deletedTenantsRes.value?.data || []);
          allTenantsForFinancials = [...allTenantsForFinancials, ...deletedTenants];
      }
      setAllTenantsForFinancials(allTenantsForFinancials);

      if (paymentsRes.status === 'fulfilled') {
          const val = paymentsRes.value;
          const data = Array.isArray(val) ? val : (val?.data || []);
          setPayments(data);
      }

      if (pgsRes.status === 'fulfilled') {
          const val = pgsRes.value;
          const data = Array.isArray(val) ? val : (val?.data || []);
          setPgs(data);
      }

      // Fetch precise outstanding balances and ALL invoices for Enterprise UI
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          // Fetch all invoices with direct pg join (doesn't require tenants relationship to work)
          // This ensures financial records persist even when tenants/properties are deleted
          const { data: allInvoices } = await supabase
            .from("invoices")
            .select(`
                *,
                pgs!left(name)
            `)
            .eq("owner_id", user.id)
            .order('billing_period_start', { ascending: false });
          
          // Fetch ALL tenants (including DELETED) to enrich invoice data
          const { data: allTenantsList } = await supabase
            .from("tenants")
            .select(`
                id,
                full_name,
                status,
                pg_id,
                pgs!left(name),
                rooms!room_id(room_number, floor),
                beds!bed_id(bed_number)
            `);
          
          // Enrich invoices with tenant data
          const tenantMap = {};
          (allTenantsList || []).forEach(t => {
              tenantMap[t.id] = t;
          });
          
          const enrichedInvoices = (allInvoices || []).map(inv => ({
              ...inv,
              tenants: tenantMap[inv.tenant_id] || null
          }));
          
          // Always set invoices (even if empty) to ensure state updates
          setInvoices(enrichedInvoices);
          
          const balances = {};
          enrichedInvoices.forEach(inv => {
              // EXCLUDE DEPOSIT-type invoices from recurring balance.
              // Security deposit is a one-time refundable charge tracked separately;
              // including it in monthly dues causes false "still ₹X due" after rent is paid.
              if (inv.type === 'DEPOSIT') return;
              const bal = Number(inv.total_amount) - Number(inv.paid_amount);
              if (bal > 0) {
                  balances[inv.tenant_id] = (balances[inv.tenant_id] || 0) + bal;
              }
          });
          setTenantBalances(balances);

          // Fetch Tenant Credits
          const { data: credits } = await supabase
            .from("tenant_credits")
            .select("tenant_id, amount")
            .eq("owner_id", user.id);
          
          if (credits) {
              const creditsMap = {};
              credits.forEach(c => {
                  creditsMap[c.tenant_id] = (creditsMap[c.tenant_id] || 0) + Number(c.amount);
              });
              setTenantCredits(creditsMap);
          }
      }
    } catch (error) {
      console.error("Critical Error in fetchData:", error);
      showToast("Sync Error: Please check your connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  const [tenantBalances, setTenantBalances] = useState({});

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
      
      if (tenant.stay_type === 'DAILY') {
          const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
          
          // Use the fetched local 'payments' array for real-time calculation 
          const actualPaid = payments
            .filter(p => p.tenant_id === tenantId && (['PAID', 'COMPLETED', 'PAID_SUCCESS'].includes((p.status || "").toUpperCase())))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

          if (daily?.move_in_date && daily?.vacate_date) {
               const start = new Date(daily.move_in_date);
               const end = new Date(daily.vacate_date);
               let diffDays = 1;
               if (end > start) diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
               
               const rpd = Number(daily.rent_per_day || tenant.rent_per_day || 0);
               const maint = Number(daily.maintenance_amount || tenant.maintenance_amount || 0);
               const totRent = (diffDays * rpd) + maint;
               
               return Math.max(0, totRent - actualPaid);
          }
          
          const dbTotal = Number(daily?.total_rent || tenant.total_rent || 0);
          return Math.max(0, dbTotal - actualPaid);
      }

      // For Monthly/Quarterly tenants:
      // Primary: use invoice-based balance (most accurate)
      // Fallback: if no invoices exist yet, estimate from rent + maintenance
      //           so new tenants don't get a false "overpayment" on their first payment
      if (tenantBalances[tenantId] !== undefined) {
          return tenantBalances[tenantId];
      }
      // No invoice data yet — estimate one month's charge as the expected balance
      const estimatedRent = Number(tenant.rent_per_month || tenant.custom_rent || tenant.rent || 0);
      const estimatedMaint = Number(tenant.maintenance_amount || 0);
      return estimatedRent + estimatedMaint;
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
        // Only warn if we have a known positive balance AND the amount exceeds it.
        // Skip the check when balance is 0 for non-DAILY tenants — that means
        // no invoice/payment history yet, not that nothing is owed.
        const balance = getTenantBalance(payload.tenant_id);
        const selectedTenant = tenants.find(t => t.id === payload.tenant_id);
        const hasKnownBalance = selectedTenant?.stay_type === 'DAILY'
            ? true                                      // daily always has a computed balance
            : tenantBalances[payload.tenant_id] !== undefined; // monthly: only if invoices loaded
        if (hasKnownBalance && balance > 0 && payload.amount > balance && !showOverpaymentConfirm) {
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
            // paymentAPI.create now also calls the allocate_payment RPC internally
            await paymentAPI.create(payload);
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

  // Helper: Format Invoice Type (Enterprise Mode)
  const formatInvoiceType = (inv) => {
    const typeMap = {
      'RENT': 'Rent',
      'DEPOSIT': 'Security Deposit',
      'MAINTENANCE': 'Maintenance',
      'UTILITIES': 'Utilities',
      'BOOKING': 'Booking Advance',
      'OPENING_BALANCE': 'Opening Balance',
      'CREDIT': 'Credit Adjustment'
    };
    
    if (inv.type === 'RENT' && inv.billing_period_start) {
      const date = new Date(inv.billing_period_start);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `Rent – ${monthYear}`;
    }
    
    return typeMap[inv.type] || inv.type || "Other";
  };

  // Helper: Calculate Overdue Status
  const getOverdueDays = (inv) => {
    if (!inv.billing_period_end) return 0;
    const end = new Date(inv.billing_period_end);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Status logic from Requirement #2
    const totalAmount = Number(inv.total_amount || 0);
    const paidAmount = Number(inv.paid_amount || 0);
    const isPaid = paidAmount >= totalAmount;

    if (today > end && !isPaid) {
      const diffTime = Math.abs(today - end);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  // Calculations
  const totalReceived = payments.filter(p => {
      const s = (p.status || "").toUpperCase();
      return s === 'PAID' || s === 'COMPLETED';
  }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  const totalPending = tenants.reduce((sum, t) => sum + getTenantBalance(t.id), 0);
  
  // Create Virtual Records for ALL Residents (Daily, Monthly, Quarterly, etc.)
  // so their full payment history remains visible after paying dues.
  const outstandingDuesVirtual = allTenantsForFinancials
      .map(t => {
          let totalAmount = 0;
          let startDate = t.move_in_date;
          let endDate = new Date().toISOString().split('T')[0];

          // Handle based on stay type
          if (t.stay_type === 'DAILY') {
              const daily = Array.isArray(t.daily_stay_details) ? t.daily_stay_details[0] : t.daily_stay_details;

              // Calculate the true total expected for this stay
              if (daily?.move_in_date && daily?.vacate_date) {
                  const start = new Date(daily.move_in_date);
                  const end   = new Date(daily.vacate_date);
                  let diffDays = 1;
                  if (end > start) diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                  const rpd   = Number(daily.rent_per_day || t.rent_per_day || 0);
                  const maint = Number(daily.maintenance_amount || t.maintenance_amount || 0);
                  totalAmount = (diffDays * rpd) + maint;
              } else {
                  totalAmount = Number(daily?.total_rent || t.total_rent || 0);
              }
              startDate = daily?.move_in_date || t.move_in_date;
              endDate = daily?.vacate_date || new Date().toISOString().split('T')[0];
          } else {
              // MONTHLY, QUARTERLY, YEARLY, etc. - use monthly rent
              const monthlyRent = Number(t.rent_per_month || t.rent || 0);
              const maintenanceAmount = Number(t.maintenance_amount || 0);
              totalAmount = monthlyRent + maintenanceAmount;
              startDate = t.move_in_date;
              endDate = new Date().toISOString().split('T')[0];
          }

          // Real-time paid amount from the payments list (same logic as getTenantBalance)
          const actualPaid = payments
              .filter(p => p.tenant_id === t.id &&
                  ['PAID', 'COMPLETED', 'PAID_SUCCESS'].includes((p.status || '').toUpperCase()))
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

          const paidAmount = Math.min(actualPaid, totalAmount || actualPaid);
          const balance    = Math.max(0, totalAmount - actualPaid);
          const status     = balance === 0 && totalAmount > 0 ? 'PAID'
                           : paidAmount > 0                   ? 'PARTIAL'
                           : 'UNPAID';

          return {
              id: `due-${t.id}`,
              tenant_id: t.id,
              total_amount: totalAmount,
              paid_amount: paidAmount,
              status,
              tenants: t,
              pgs: t.pgs, // Include PG data
              type: 'RENT',
              billing_period_start: startDate,
              billing_period_end: endDate,
              isVirtual: true,
          };
      });

  // Enterprise UI shows: Invoices + Virtual Records for ALL Residents
  // Deduplicate by tenant_id (invoices take precedence if both exist)
  const invoicesByTenant = new Set(invoices.map(inv => inv.tenant_id));
  const allDisplayItems = [
      ...invoices,
      ...outstandingDuesVirtual.filter(virt => !invoicesByTenant.has(virt.tenant_id))
  ];

  const filteredItems = allDisplayItems.filter(p => {
      const rawT = p.tenants || p.tenant;
      const tInfo = Array.isArray(rawT) ? rawT[0] : (rawT || {});
      const pgId = tInfo.pg_id || tInfo.pgId || p.pg_id || p.pgId || "";
      const tenantName = tInfo.full_name?.toLowerCase() || "";
      const searchLower = searchTerm.toLowerCase();
      
      const typeLabel = formatInvoiceType(p).toLowerCase();
      const matchSearch = tenantName.includes(searchLower) || typeLabel.includes(searchLower);
      const matchPg = !filterPg || pgId === filterPg;

      // Status Filter logic
      let matchStatus = true;
      if (filterStatus) {
          const totalAmount = Number(p.total_amount || 0);
          const paidAmount = Number(p.paid_amount || 0);
          
          if (filterStatus === 'PAID') {
              matchStatus = paidAmount >= totalAmount;
          } else if (filterStatus === 'PENDING') {
              matchStatus = paidAmount < totalAmount;
          }
      }

      return matchStatus && matchSearch && matchPg;
  });

  // Group by Resident for "Enterprise Grouping" (One row per person)
  const groupedByTenant = filteredItems.reduce((acc, inv) => {
    const tId = inv.tenant_id;
    if (!acc[tId]) {
      const tInfo = inv.tenants || (Array.isArray(inv.tenant) ? inv.tenant[0] : inv.tenant);
      acc[tId] = {
        id: `tenant-${tId}`,
        tenant_id: tId,
        tenants: tInfo,
        pgs: inv.pgs, // Direct pgs data from invoice (for deleted properties)
        invoices: [],
        total_amount: 0,
        paid_amount: 0,
        billing_period_start: inv.billing_period_start,
        billing_period_end: inv.billing_period_end
      };
    }
    acc[tId].invoices.push(inv);
    acc[tId].total_amount += Number(inv.total_amount || 0);
    acc[tId].paid_amount += Number(inv.paid_amount || 0);
    
    // Track date range
    if (new Date(inv.billing_period_start) < new Date(acc[tId].billing_period_start)) {
        acc[tId].billing_period_start = inv.billing_period_start;
    }
    if (new Date(inv.billing_period_end) > new Date(acc[tId].billing_period_end)) {
        acc[tId].billing_period_end = inv.billing_period_end;
    }
    return acc;
  }, {});

  const filteredPayments = Object.values(groupedByTenant).sort((a, b) => {
      const dateA = new Date(a.billing_period_start || 0);
      const dateB = new Date(b.billing_period_start || 0);
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
                        <th className="px-6 py-4">Resident Summary</th>
                        <th className="px-6 py-4">Pending Item(s)</th>
                        <th className="px-6 py-4">Active Period</th>
                        <th className="px-6 py-4">Financial Progress</th>
                        <th className="px-6 py-4">Current Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-100")}>
                    {filteredPayments.map(group => {
                        const totalAmount = Number(group.total_amount || 0);
                        const paidAmount = Number(group.paid_amount || 0);
                        const remainingAmount = Math.max(0, totalAmount - paidAmount);
                        const hasCredits = tenantCredits[group.tenant_id] > 0;
                        const creditBalance = tenantCredits[group.tenant_id] || 0;
                        
                        // Summary info for the group
                        const unpaidInvoices = group.invoices.filter(i => Number(i.paid_amount || 0) < Number(i.total_amount || 0));
                        const latestOverdue = Math.max(...group.invoices.map(i => getOverdueDays(i)));

                        return (
                            <React.Fragment key={group.id}>
                            <tr className={cn(
                                "group transition-all duration-300", 
                                isDark ? "hover:bg-blue-500/[0.03]" : "hover:bg-slate-50"
                            )}>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => toggleRow(group.id)}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-all duration-300",
                                                expandedRows.has(group.id) ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : 
                                                (isDark ? "bg-white/5 text-slate-400 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                                            )}
                                        >
                                            <ChevronRight size={14} strokeWidth={3} className={cn("transition-transform duration-300", expandedRows.has(group.id) && "rotate-90")} />
                                        </button>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <h3 className={cn("text-[13px] font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                                                    {(group.tenants || group.tenant)?.full_name ?? "Deleted Tenant"}
                                                </h3>
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                                                    (group.tenants || group.tenant)?.stay_type === "DAILY" 
                                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                                                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                                )}>
                                                    {(group.tenants || group.tenant)?.stay_type || "STAY"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {(group.tenants || group.tenant)?.pgs?.name || group.pgs?.name || (group.isVirtual ? "Deleted Property" : "No PG")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex flex-wrap gap-1">
                                            {group.invoices.slice(0, 2).map((inv, idx) => (
                                                <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                                                    {inv.type}
                                                </span>
                                            ))}
                                            {group.invoices.length > 2 && <span className="text-[9px] font-bold opacity-40">+{group.invoices.length - 2} more</span>}
                                        </div>
                                        {latestOverdue > 0 && (
                                            <span className="text-[8px] font-black text-rose-500 uppercase flex items-center gap-1">
                                                <AlertTriangle size={8} /> Needs Attention
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border", isDark ? "border-white/5 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600 shadow-sm")}>
                                            {new Date(group.billing_period_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(group.billing_period_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col w-40 gap-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Paid Progress</span>
                                            <span className="text-xs font-black dark:text-emerald-400 text-emerald-600">₹{paidAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                                            <div 
                                                className={cn("h-full transition-all duration-1000", remainingAmount === 0 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]")}
                                                style={{ width: `${Math.min(100, (paidAmount / (totalAmount || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] font-bold tracking-tight">
                                           <span className="opacity-40 uppercase">Total: ₹{totalAmount.toLocaleString()}</span>
                                           <span className={cn(remainingAmount > 0 ? "text-rose-500" : "text-emerald-500 opacity-60")}>
                                               {remainingAmount > 0 ? `Remaining: ₹${remainingAmount.toLocaleString()}` : 'Settled'}
                                           </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] border transition-all duration-500", 
                                            remainingAmount === 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                                            paidAmount > 0 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                                            "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                        )}>
                                            {remainingAmount === 0 ? 'CLEARED' : (paidAmount > 0 ? 'PARTIAL' : 'OUTSTANDING')}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <div className="flex justify-end">
                                        {remainingAmount > 0 ? (
                                            <button 
                                                onClick={() => navigate(`/payments?tenantId=${group.tenant_id}&amount=${remainingAmount}`)}
                                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95 flex items-center gap-2"
                                            >
                                                <IndianRupee size={12} strokeWidth={3} /> Collect 
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/10">
                                                <CheckCircle2 size={14} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Accounts Clear</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            {expandedRows.has(group.id) && (
                                <tr className={isDark ? "bg-white/[0.02]" : "bg-slate-50/50"}>
                                    <td colSpan={6} className="px-8 py-0">
                                        <div className="py-6 space-y-4">
                                            <div className="flex items-center justify-between border-b dark:border-white/5 pb-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Breakdown of Dues</h4>
                                                <span className="text-[9px] font-bold opacity-40 uppercase">UID: {group.tenant_id.slice(0, 10)}</span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {group.invoices.map((inv) => {
                                                    const invRemaining = Number(inv.total_amount) - Number(inv.paid_amount);
                                                    const invOverdue = getOverdueDays(inv);
                                                    
                                                    return (
                                                        <div key={inv.id} className={cn("p-4 rounded-2xl flex items-center justify-between transition-all border", isDark ? "bg-black/20 border-white/5 hover:border-blue-500/30" : "bg-white border-slate-200 hover:border-blue-500/30 shadow-sm")}>
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn("p-3 rounded-xl", invRemaining > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500")}>
                                                                    {invRemaining > 0 ? <Clock size={16} /> : <CheckCircle2 size={16} />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className={cn(
                                                                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                                                                            inv.type === 'DEPOSIT' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                                            inv.type === 'MAINTENANCE' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                                            "bg-slate-500/10 text-slate-500 border-slate-500/10"
                                                                        )}>
                                                                            {formatInvoiceType(inv)}
                                                                        </span>
                                                                        {invOverdue > 0 && <span className="bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Overdue {invOverdue}d</span>}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold opacity-40 mt-0.5">Period: {new Date(inv.billing_period_start).toDateString()} - {new Date(inv.billing_period_end).toDateString()}</div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-12 text-right">
                                                                <div>
                                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Amount Summary</p>
                                                                    <p className="text-xs font-black text-slate-800 dark:text-white">₹{Number(inv.paid_amount).toLocaleString()} <span className="opacity-30">/ ₹{Number(inv.total_amount).toLocaleString()}</span></p>
                                                                </div>
                                                                <div className="w-24">
                                                                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Status</p>
                                                                   <span className={cn("text-[9px] font-black uppercase", invRemaining === 0 ? "text-emerald-500" : "text-rose-500")}>
                                                                       {invRemaining === 0 ? "Settle Full" : `₹${invRemaining.toLocaleString()} Due`}
                                                                   </span>
                                                                </div>
                                                                {invRemaining > 0 && (
                                                                    <button 
                                                                        onClick={() => navigate(`/payments?tenantId=${group.tenant_id}&amount=${invRemaining}`)}
                                                                        className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                                        title="Pay specifically for this item"
                                                                    >
                                                                        <Plus size={16} strokeWidth={3} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            <div className="flex justify-between items-center bg-blue-500/[0.03] p-4 rounded-2xl border border-blue-500/10 border-dashed">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-black text-xs">SUM</div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-blue-500">Current Balance Settlement</p>
                                                        <p className="text-[9px] font-bold opacity-50">Combined dues for all pending items above.</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[14px] font-black text-slate-800 dark:text-white">₹{remainingAmount.toLocaleString()}</p>
                                                        <p className="text-[8px] font-black text-slate-500 uppercase">Total Payable</p>
                                                    </div>
                                                    {remainingAmount > 0 && (
                                                        <button 
                                                            onClick={() => navigate(`/payments?tenantId=${group.tenant_id}&amount=${remainingAmount}`)}
                                                            className="px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95"
                                                        >
                                                            Settle Full Balance
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </React.Fragment>
                        );
                    })}
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
                {filteredPayments.map(group => {
                    const totalAmount = Number(group.total_amount || 0);
                    const paidAmount = Number(group.paid_amount || 0);
                    const remainingAmount = Math.max(0, totalAmount - paidAmount);
                    const overdueDays = getOverdueDays(group);
                    const hasCredits = tenantCredits[group.tenant_id] > 0;
                    const creditBalance = tenantCredits[group.tenant_id] || 0;

                    return (
                    <div key={group.id} className={cn("p-4 space-y-4", group.isVirtual && (isDark ? "bg-amber-500/5" : "bg-amber-50/50"))}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 text-left">
                                <div className={cn("p-2 rounded-xl", group.isVirtual ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500")}>
                                    <User size={16}/>
                                </div>
                                <div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <h3 className={cn("text-[13px] font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                                                {(group.tenants || group.tenant)?.full_name || "Resident"}
                                            </h3>
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                                                (group.tenants || group.tenant)?.stay_type === "DAILY" 
                                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                                                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                            )}>
                                                {(group.tenants || group.tenant)?.stay_type || "STAY"}
                                            </span>
                                        </div>

                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">
                                        {formatInvoiceType(group)}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                paidAmount >= totalAmount ? "bg-emerald-500/10 text-emerald-500" :
                                paidAmount > 0 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                                {paidAmount >= totalAmount ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')}
                            </div>
                        </div>

                        {overdueDays > 0 && (
                            <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl flex items-center gap-3">
                                <AlertTriangle size={14} className="text-rose-500" />
                                <span className="text-[10px] font-black uppercase text-rose-500">Overdue by {overdueDays} days</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                             <div className="bg-slate-100/50 dark:bg-white/5 p-2 rounded-xl border border-slate-200/50 dark:border-white/5">
                                <p className="text-[8px] uppercase font-bold text-slate-500 tracking-tighter">Billing Period</p>
                                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                    {new Date(group.billing_period_start).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(group.billing_period_end).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </p>
                             </div>
                             <div className="bg-slate-100/50 dark:bg-white/5 p-2 rounded-xl border border-slate-200/50 dark:border-white/5">
                                <p className="text-[8px] uppercase font-bold text-slate-500 tracking-tighter">Property Context</p>
                                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                                    <div className="truncate">{(group.tenants || group.tenant)?.pgs?.name || group.pgs?.name || "Deleted Property"}</div>
                                    <div className="text-[9px] opacity-70">
                                        {(group.tenants || group.tenant)?.rooms ? 
                                            `F${(group.tenants || group.tenant).rooms.floor} R${(group.tenants || group.tenant).rooms.room_number}` : 
                                            "Room N/A"
                                        }
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-100/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
                            <div>
                                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-tighter">Amount Summary</p>
                                <div className="flex flex-col">
                                    <span className="text-lg font-black text-emerald-600">₹{paidAmount.toLocaleString()} <span className="text-[10px] text-slate-500 opacity-50 font-medium">/ ₹{totalAmount.toLocaleString()}</span></span>
                                    {remainingAmount > 0 && <span className="text-[10px] font-bold text-rose-500">Due: ₹{remainingAmount.toLocaleString()}</span>}
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-tighter">Invoice ID</p>
                                <p className={cn("text-[11px] font-mono", isDark ? "text-slate-400" : "text-slate-500")}>
                                    {group.id.slice(0, 8)}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {remainingAmount > 0 ? (
                                <button 
                                    onClick={() => navigate(`/payments?tenantId=${group.tenant_id}&amount=${remainingAmount}`)}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/30"
                                >
                                    Pay Now
                                </button>
                            ) : (
                                <div className="flex-1 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-black uppercase text-center border border-emerald-500/20">
                                    Invoice Settled
                                </div>
                            )}
                            <button 
                                onClick={() => toggleRow(group.id)}
                                className="px-4 py-3 bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded-xl border border-[var(--border-soft)]"
                            >
                                <ChevronRight size={18} className={cn("transition-transform", expandedRows.has(group.id) && "rotate-90")} />
                            </button>
                        </div>
                        
                        {expandedRows.has(group.id) && (
                            <div className="p-4 rounded-xl bg-slate-100/30 dark:bg-white/5 space-y-2 animate-in slide-in-from-top-2">
                                <p className="text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 dark:border-white/10 pb-1">Full Breakdown</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <span className="text-[10px] text-slate-500">Total Amount:</span>
                                    <span className="text-[10px] font-bold text-right">₹{totalAmount.toLocaleString()}</span>
                                    <span className="text-[10px] text-slate-500">Paid Amount:</span>
                                    <span className="text-[10px] font-bold text-right text-emerald-500">₹{paidAmount.toLocaleString()}</span>
                                    <span className="text-[10px] text-slate-500">Remaining:</span>
                                    <span className="text-[10px] font-bold text-right text-rose-500">₹{remainingAmount.toLocaleString()}</span>
                                    <span className="text-[10px] text-slate-500">Invoice ID:</span>
                                    <span className="text-[10px] font-mono text-right truncate">{group.id}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    );
                })}
           </div>
       </div>
       {/* Modal */}
       {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 transition-opacity" />
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
                                    .sort((a,b) => (a.status === 'ACTIVE' ? -1 : 1)) // Active residents at the top
                                    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) // Unique IDs to avoid duplicates
                                    .map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.full_name} — {t.rooms?.room_number ? `Room ${t.rooms.room_number}` : "N/A"} {t.status !== 'ACTIVE' ? `(${t.status})` : ""}
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
                        label={
                            <div className="flex items-center justify-between w-full pr-1">
                                <span>Amount (₹) <span className="text-rose-500">*</span></span>
                                {formData.tenant_id && (
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                                        getTenantBalance(formData.tenant_id) > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                                    )}>
                                        Balance Due: ₹{getTenantBalance(formData.tenant_id).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        }
                        name="amount"
                        value={formData.amount}
                        isDark={isDark}
                        onChange={handleInputChange}
                        error={formErrors.amount}
                     />
                     {formData.tenant_id && Number(formData.amount) > getTenantBalance(formData.tenant_id) && (
                         <motion.p 
                            initial={{ opacity: 0, y: -5 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-1"
                         >
                            <AlertTriangle size={10} /> Overpayment Alert: Exceeds Current Balance
                         </motion.p>
                     )}
                     
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
