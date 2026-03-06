import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { tenantAPI, bedAPI, roomAPI, pgAPI } from "../../services/api";
import { Plus, Pencil, Trash2, X, Search, User, Users, Mail, Phone, MapPin, Calendar, CreditCard, ChevronRight, CheckCircle2, AlertCircle, BedDouble, FileText, Building2, RefreshCw, Bug, Filter, ChevronLeft, Check, AlertTriangle, ChevronDown, Layers, SortAsc, Briefcase, DoorOpen } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import ThemeToggle from "../../components/ThemeToggle";
import UnifiedStayManager from "../../components/UnifiedStayManager";
import ConfirmationModal from "../../components/ConfirmationModal";
import { Card } from "../../components/partials";
import AlertModal from "../../components/AlertModal";
import Toast from "../../components/Toast";
import { supabase } from "../../lib/supabaseClient";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const maskAadhaar = (num) => {
    if (!num) return "N/A";
    const s = String(num);
    if (s.length < 12) return s;
    return `XXXX XXXX ${s.slice(-4)}`;
};

const Tenants = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [searchParams, setSearchParams] = useSearchParams();
  const [tenants, setTenants] = useState([]);
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState({ isOpen: false, tenantId: null, newStatus: "", isLoading: false });
  const [deleteConfirm, setDeleteConfirm] = useState({ 
    isOpen: false, 
    tenant: null, 
    isLoading: false, 
    inputValue: "", 
    generatedCode: "",
    error: "" 
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState({ 
    isOpen: false, 
    isLoading: false, 
    inputValue: "", 
    generatedCode: "",
    error: "" 
  });
  const [selectedTenants, setSelectedTenants] = useState([]);
  const [editingTenant, setEditingTenant] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [invoiceBalances, setInvoiceBalances] = useState({});
  const [dailyPaidSums, setDailyPaidSums] = useState({});


  // Check for auto-open draft
  useEffect(() => {
    const draft = localStorage.getItem("unifiedStayManager_draft");
    if (draft) {
        setShowModal(true);
    }
  }, []);
  const showToast = (message, type = "success", action = null) => {
    setToast({ message, type, action });
    setTimeout(() => setToast(null), 3000);
  };
  
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [professionFilter, setProfessionFilter] = useState("ALL");
  const [pgFilter, setPgFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("move_in_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTenants, setTotalTenants] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [floors, setFloors] = useState([]);
  const [roomFilterList, setRoomFilterList] = useState([]);
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [highlightPg, setHighlightPg] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchTerm);
        setPage(1); // Reset to page 1 on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
      setPage(1);
  }, [statusFilter, professionFilter, pgFilter, floorFilter, roomFilter, sortBy, sortOrder, pageSize]);

  // Fetch available floors when PG changes
  useEffect(() => {
      if (pgFilter && pgFilter !== "ALL") {
          fetchFloors(pgFilter);
      } else {
          setFloors([]);
          setFloorFilter("ALL");
      }
  }, [pgFilter]);

  // Fetch available rooms when PG or Floor changes
  useEffect(() => {
      if (pgFilter && pgFilter !== "ALL") {
          fetchRoomFilterList(pgFilter, floorFilter);
      } else {
          setRoomFilterList([]);
          setRoomFilter("ALL");
      }
  }, [pgFilter, floorFilter]);

  const fetchFloors = async (pgId) => {
      try {
          // Derive floors directly from rooms table to ensure accuracy
          const { data, error } = await supabase
              .from("rooms")
              .select("floor")
              .eq("pg_id", pgId);
          
          if (error) throw error;
          
          const uniqueFloors = [...new Set(data.map(r => r.floor))]
              .filter(f => f !== null && f !== undefined && f !== "")
              .sort((a, b) => {
                  const numA = parseInt(a);
                  const numB = parseInt(b);
                  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                  return String(a).localeCompare(String(b));
              });
              
          setFloors(uniqueFloors || []);
      } catch (error) {
          console.error("Error fetching floors:", error);
      }
  };

  const fetchRoomFilterList = async (pgId, floorNum) => {
      try {
          let query = supabase.from("rooms").select("*").eq("pg_id", pgId);
          if (floorNum && floorNum !== "ALL") {
              query = query.eq("floor", floorNum);
          }
          const { data } = await query.order("floor").order("room_number");
          setRoomFilterList(data || []);
      } catch (error) {
          console.error("Error fetching room list:", error);
      }
  };

  // Handle URL query params for actions
  useEffect(() => {
    if (!loading && searchParams.get("onboard") === "true") {
        if (pgs.length === 0) {
            showToast("No properties found. Create a property first.", "error");
        } else if (rooms.length === 0) {
            showToast("No rooms available. Create a room first.", "error");
        } else if (beds.filter(b => b.status === 'AVAILABLE').length === 0) {
            showToast("All beds are full. Add more capacity first.", "error");
        } else {
            setShowModal(true);
        }
        // Clear param
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("onboard");
        setSearchParams(newParams, { replace: true });
    }
  }, [loading, searchParams, pgs, rooms, beds]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data, count }, pgsData, roomsData, bedsData] = await Promise.all([
          tenantAPI.search({
              page,
              limit: pageSize,
              search: debouncedSearch,
              status: statusFilter,
              profession: professionFilter === "ALL" ? "" : professionFilter,
              pgId: pgFilter === "ALL" ? "" : pgFilter,
              floor: floorFilter === "ALL" ? "" : floorFilter,
              roomId: roomFilter === "ALL" ? "" : roomFilter,
              sortBy,
              sortOrder
          }),
          pgAPI.getAll(),
          roomAPI.getAll(),
          bedAPI.getAll()
      ]);
      setTenants(data || []);
      setTotalTenants(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
      setPgs(pgsData || []);
      setRooms(roomsData || []);
      setBeds(bedsData || []);

      // Fetch outstanding balances for the current tenants from the Invoices system
      if (data && data.length > 0) {
          const tenantIds = data.map(t => t.id);
          // Also fetch all successful payments to ensure real-time balance for daily stays
          const [ { data: dailyPayments }, { data: invoices } ] = await Promise.all([
            supabase
              .from("payments")
              .select("tenant_id, amount, status")
              .in("tenant_id", tenantIds),
            supabase
              .from("invoices")
              .select("tenant_id, total_amount, paid_amount")
              .in("tenant_id", tenantIds)
              .in("status", ["UNPAID", "PARTIAL"])
          ]);
            
          const dailySums = {};
          (dailyPayments || []).forEach(p => {
              const s = (p.status || "").toUpperCase();
              if (s === 'PAID' || s === 'COMPLETED' || s === 'PAID_SUCCESS') {
                   dailySums[p.tenant_id] = (dailySums[p.tenant_id] || 0) + Number(p.amount || 0);
              }
          });
          setDailyPaidSums(dailySums);
          
          const balances = {};
          (invoices || []).forEach(inv => {
              const amount = Number(inv.total_amount) - Number(inv.paid_amount);
              balances[inv.tenant_id] = (balances[inv.tenant_id] || 0) + amount;
          });
          setInvoiceBalances(balances);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes in tenants and daily stays
    const handleRealtime = () => {
        setTimeout(() => fetchData(), 600);
    };

    const channel = supabase.channel('tenants-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, handleRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stay_details' }, handleRealtime)
      .subscribe();

    return () => { 
        supabase.removeChannel(channel); 
    };
  }, [page, debouncedSearch, statusFilter, professionFilter, pgFilter, floorFilter, roomFilter, sortBy, sortOrder, pageSize]);



  const handleEdit = (tenant) => {
    // Flatten daily details for the editor if applicable
    const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
    
    const tenantToEdit = tenant.stay_type === 'DAILY' && daily ? {
        ...tenant,
        // Override/Fallback with detailed info from daily_stay_details join
        vacate_date: daily.vacate_date || tenant.vacate_date,
        rent_per_day: daily.rent_per_day || tenant.rent_per_day,
        total_rent: daily.total_rent || tenant.total_rent,
        move_in_date: daily.move_in_date || tenant.move_in_date,
        maintenance_amount: daily.maintenance_amount ?? tenant.maintenance_amount,
        maintenance_type: daily.maintenance_type ?? tenant.maintenance_type,
        maintenance_paid: daily.maintenance_paid ?? tenant.maintenance_paid
    } : tenant;
    
    setEditingTenant(tenantToEdit);
    setShowModal(true);
  };

    const handleDelete = async (id) => {
    const tenant = tenants.find(t => t.id === id);
    
    // Business Rule: Check for outstanding dues before deletion
    let due = 0;
    if (tenant.stay_type === 'DAILY') {
        const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
            if (daily?.move_in_date && daily?.vacate_date) {
                const start = new Date(daily.move_in_date);
                const end = new Date(daily.vacate_date);
                let diffDays = 1;
                if (end > start) {
                    diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                }
                const rentBase = diffDays * Number(daily.rent_per_day || tenant.rent_per_day || 0);
                const maintenanceBase = Number(daily.maintenance_amount || tenant.maintenance_amount || 0);
                const totalRent = rentBase + maintenanceBase;
                due = Math.max(0, totalRent - (dailyPaidSums[tenant.id] || 0));
            } else {
                const dbBalance = Number(tenant.daily_stay_details?.balance_amount || tenant.balance_amount || 0);
                const dbPaid = Number(tenant.daily_stay_details?.paid_amount || tenant.paid_amount || 0);
                due = Math.max(0, (dbBalance + dbPaid) - (dailyPaidSums[tenant.id] || 0));
            }
            if (due < 1) due = 0;
        } else {
            due = Math.max(0, Number(invoiceBalances[tenant.id] || 0));
            if (due < 1) due = 0;
        }
    
    if (due > 0) {
        showToast(`Cannot delete "${tenant.full_name}" because they have an outstanding balance of ₹${due.toLocaleString()}. Please clear all dues first.`, "error", {
            label: "PAY DUE",
            onClick: () => navigate(`/payments?tenantId=${tenant.id}&amount=${due}`)
        });
        return;
    }

    setDeleteConfirm({
        isOpen: true,
        tenant,
        isLoading: false,
        inputValue: "",
        generatedCode: generateDeleteCode(),
        error: ""
    });
  };

  const confirmDelete = async () => {
    const { tenant, inputValue, generatedCode } = deleteConfirm;
    
    if (inputValue !== generatedCode) {
        setDeleteConfirm(prev => ({ ...prev, error: "Incorrect verification code" }));
        return;
    }

    setDeleteConfirm(prev => ({ ...prev, isLoading: true, error: "" }));
    try {
        await tenantAPI.hardDelete(tenant.id);
        showToast("Resident record deleted permanently");
        fetchData();
        setSelectedTenants(prev => prev.filter(tid => tid !== tenant.id));
    } catch (error) {
        setDeleteConfirm(prev => ({ ...prev, error: error.message }));
        showToast("Delete failed: " + error.message, "error");
    } finally {
        setDeleteConfirm(prev => ({ ...prev, isOpen: false, tenant: null, isLoading: false, inputValue: "", error: "" }));
    }
  };



  const generateDeleteCode = () => Math.floor(1000 + Math.random() * 9000).toString();



  const toggleTenantSelection = (id) => {
    setSelectedTenants(prev => 
        prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTenants.length === tenants.length) {
        setSelectedTenants([]);
    } else {
        setSelectedTenants(tenants.map(t => t.id));
    }
  };

  const handleBulkHardDelete = () => {
    if (selectedTenants.length === 0) return;

    // Filter selected tenants from the current tenants list
    const selectedData = tenants.filter(t => selectedTenants.includes(t.id));
    
    // Check if any have dues
    const withDues = selectedData.map(t => {
        let due = 0;
        if (t.stay_type === 'DAILY') {
            const daily = Array.isArray(t.daily_stay_details) ? t.daily_stay_details[0] : t.daily_stay_details;
            if (daily?.move_in_date && daily?.vacate_date) {
                const start = new Date(daily.move_in_date);
                const end = new Date(daily.vacate_date);
                let diffDays = 1;
                if (end > start) {
                    diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                }
                const rentBase = diffDays * Number(daily.rent_per_day || t.rent_per_day || 0);
                const maintenanceBase = Number(daily.maintenance_amount || t.maintenance_amount || 0);
                const totalRent = Math.round(rentBase + maintenanceBase);
                due = Math.max(0, totalRent - (dailyPaidSums[t.id] || 0));
            } else {
                const dbBalance = Number(t.daily_stay_details?.balance_amount || t.balance_amount || 0);
                const dbPaid = Number(t.daily_stay_details?.paid_amount || t.paid_amount || 0);
                due = Math.max(0, Math.round(dbBalance + dbPaid) - (dailyPaidSums[t.id] || 0));
            }
        } else {
            due = Math.max(0, Math.round(Number(invoiceBalances[t.id] || 0)));
        }
        return { ...t, calculatedDue: due };
    }).filter(t => t.calculatedDue > 5); // Lenient threshold for floating point (₹5)

    if (withDues.length > 0) {
        showToast(`Cannot delete ${withDues.length} residents who have outstanding dues (₹${withDues.reduce((sum, t) => sum + t.calculatedDue, 0).toLocaleString()}). Please clear all dues first.`, "error");
        return;
    }

    setBulkDeleteConfirm({
        isOpen: true,
        isLoading: false,
        inputValue: "",
        generatedCode: generateDeleteCode(),
        error: ""
    });
  };

  const confirmBulkDelete = async () => {
    const { inputValue, generatedCode } = bulkDeleteConfirm;
    
    if (inputValue !== generatedCode) {
        setBulkDeleteConfirm(prev => ({ ...prev, error: "Incorrect verification code" }));
        return;
    }

    setBulkDeleteConfirm(prev => ({ ...prev, isLoading: true, error: "" }));
    try {
        // Sequential deletion for safety given the complexity of bed unassigning
        for (const id of selectedTenants) {
            await tenantAPI.hardDelete(id);
        }
        showToast(`${selectedTenants.length} records permanently removed`);
        setSelectedTenants([]);
        fetchData();
    } catch (error) {
        setBulkDeleteConfirm(prev => ({ ...prev, error: error.message }));
        showToast("Bulk delete failed: " + error.message, "error");
    } finally {
        setBulkDeleteConfirm(prev => ({ ...prev, isOpen: false, isLoading: false, inputValue: "", error: "" }));
    }
  };

  const handleStatusChange = (id, newStatus) => {
    setStatusConfirm({
        isOpen: true,
        tenantId: id,
        newStatus,
        isLoading: false
    });
  };

  const confirmStatusChange = async () => {
    const { tenantId, newStatus } = statusConfirm;
    setStatusConfirm(prev => ({ ...prev, isLoading: true }));
    try {
        // Optimistic UI update
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t));
        
        await tenantAPI.update(tenantId, { status: newStatus });
        showToast(`Resident status updated to ${newStatus}`);
    } catch (error) {
        console.error("Status update error:", error);
        showToast("Failed to update status", "error");
        fetchData(); // Revert on error
    } finally {
        setStatusConfirm({ isOpen: false, tenantId: null, newStatus: "", isLoading: false });
    }
  };

  const getStatusColor = (status) => {
      switch (status) {
          case 'ACTIVE': return isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200";
          case 'INACTIVE': return isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-200";
          default: return isDark ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-50 text-slate-600 border-slate-200";
      }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
    }
  };

  // if (loading) return ... (REMOVED: handle loading inside table)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Resident Directory</h1>
          <p className={cn("mt-1 flex items-center gap-2 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            <User size={16} /> Manage residents and their assignments
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <ThemeToggle className="hidden md:flex" />
          <button 
            onClick={() => { 
                if (pgs.length === 0) {
                    showToast("No properties found. Create a property first.", "error");
                    return;
                }
                if (rooms.length === 0) {
                    showToast("No rooms available. Create a room first.", "error");
                    return;
                }
                if (beds.filter(b => b.status === 'AVAILABLE').length === 0) {
                    showToast("All beds are full. Add more capacity first.", "error");
                    return;
                }
                setShowModal(true); 
            }}
            className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-all shadow-lg active:scale-95",
                (pgs.length === 0 || rooms.length === 0 || beds.filter(b => b.status === 'AVAILABLE').length === 0)
                    ? "bg-slate-500/20 text-slate-500 cursor-not-allowed border border-slate-500/20 shadow-none"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
            )}
          >
            <Plus size={20} />
            ADD TENANT
          </button>
        </div>
      </div>

      {/* Alert Modal for Errors/Warnings */}
      <AlertModal 
        isOpen={!!toast && toast.type === "error"}
        onClose={() => setToast(null)}
        title="Action Blocked"
        message={toast?.message}
        type="error"
        actionText={toast?.action?.label}
        onAction={toast?.action?.onClick}
        isDark={isDark}
      />

      <Toast 
        isOpen={!!toast && toast.type === "success"}
        message={toast?.message}
        type="success"
        onClose={() => setToast(null)}
      />



      {/* Main List Table */}
      <div className={cn("backdrop-blur-md rounded-2xl overflow-hidden shadow-xl border", isDark ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-200")}>
         {/* Search & Filter Header */}
         <div className={cn("p-4 border-b space-y-4", isDark ? "border-white/5 bg-white/5" : "border-slate-100 bg-slate-50")}>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full md:max-w-xl group">
                    <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-slate-500 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-500")} size={20} />
                    <input 
                        type="text" 
                        placeholder="Search by name, phone, email or property..." 
                        value={searchTerm}
                        name="search_tenants_query"
                        autoComplete="off"
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(
                            "w-full border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-4 transition-all font-medium text-sm", 
                            isDark ? "bg-slate-800/80 border-white/5 text-white placeholder:text-slate-500 focus:ring-blue-500/20 focus:border-blue-500/50" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500/10 focus:border-blue-500/50"
                        )}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Primary Filter: Property */}
                    <div className="relative flex-1 md:w-64">
                         <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                         <select
                             value={pgFilter}
                             onChange={(e) => setPgFilter(e.target.value)}
                             className={cn(
                                 "w-full pl-10 pr-10 py-3 border rounded-2xl focus:outline-none focus:ring-4 font-black uppercase text-[10px] tracking-widest transition-all appearance-none cursor-pointer", 
                                 isDark ? "bg-slate-800/80 border-white/5 text-slate-300 focus:ring-blue-500/20" : "bg-white border-slate-200 text-slate-700 focus:ring-blue-500/10",
                                 highlightPg && "ring-4 ring-blue-500 ring-offset-2 scale-105 shadow-2xl z-10"
                             )}
                         >
                             <option value="ALL">All Properties</option>
                             {pgs.map(pg => (
                                 <option key={pg.id} value={pg.id}>{pg.name}</option>
                             ))}
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                    </div>

                    {/* Filter Toggle Button */}
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "h-11 px-4 rounded-2xl flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all border",
                            showFilters 
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" 
                                : isDark ? "bg-slate-800 border-white/5 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"
                        )}
                    >
                        <Filter size={16} className={cn("transition-transform", showFilters && "rotate-180")} />
                        <span className="hidden sm:inline">Filters</span>
                        {Object.values({statusFilter, professionFilter, floorFilter, roomFilter}).filter(v => v !== "ALL").length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-white text-blue-600 rounded-md text-[8px] font-black">
                                {Object.values({statusFilter, professionFilter, floorFilter, roomFilter}).filter(v => v !== "ALL").length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Expandable Secondary Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                             {/* Floor Filter */}
                             <div 
                                 className="relative"
                                 onClick={() => {
                                     if (pgFilter === "ALL") {
                                         setHighlightPg(true);
                                         setTimeout(() => setHighlightPg(false), 2000);
                                     }
                                 }}
                             >
                                 <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                 <select
                                     value={floorFilter}
                                     disabled={pgFilter === "ALL"}
                                     onChange={(e) => setFloorFilter(e.target.value)}
                                     className={cn(
                                         "w-full pl-9 pr-8 py-2.5 border rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-wider transition-all appearance-none",
                                         isDark ? "bg-slate-900 border-white/5 text-slate-400" : "bg-white border-slate-200 text-slate-600",
                                         pgFilter === "ALL" && "opacity-40 cursor-not-allowed pointer-events-none"
                                     )}
                                 >
                                     <option value="ALL">All Floors</option>
                                     {floors.map(fNum => (
                                         <option key={fNum} value={fNum}>Floor {fNum}</option>
                                     ))}
                                 </select>
                                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                             </div>

                             {/* Room Filter */}
                             <div 
                                 className="relative"
                                 onClick={() => {
                                     if (pgFilter === "ALL") {
                                         setHighlightPg(true);
                                         setTimeout(() => setHighlightPg(false), 2000);
                                     }
                                 }}
                             >
                                 <DoorOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                 <select
                                     value={roomFilter}
                                     disabled={pgFilter === "ALL"}
                                     onChange={(e) => setRoomFilter(e.target.value)}
                                     className={cn(
                                         "w-full pl-9 pr-8 py-2.5 border rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-wider transition-all appearance-none",
                                         isDark ? "bg-slate-900 border-white/5 text-slate-400" : "bg-white border-slate-200 text-slate-600",
                                         pgFilter === "ALL" && "opacity-40 cursor-not-allowed pointer-events-none"
                                     )}
                                 >
                                     <option value="ALL">All Rooms</option>
                                     {roomFilterList.map(r => (
                                         <option key={r.id} value={r.id}>Room {r.room_number}</option>
                                     ))}
                                 </select>
                                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                             </div>

                             {/* Status Filter */}
                             <div className="relative">
                                 <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                 <select
                                     value={statusFilter}
                                     onChange={(e) => setStatusFilter(e.target.value)}
                                     className={cn(
                                         "w-full pl-9 pr-8 py-2.5 border rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-wider transition-all appearance-none cursor-pointer", 
                                         isDark ? "bg-slate-900 border-white/5 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                                     )}
                                 >
                                     <option value="ALL">All Status</option>
                                     <option value="ACTIVE">Active</option>
                                     <option value="INACTIVE">Inactive</option>
                                 </select>
                                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                             </div>

                             {/* Profession Filter */}
                             <div className="relative">
                                 <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                 <select
                                     value={professionFilter}
                                     onChange={(e) => setProfessionFilter(e.target.value)}
                                     className={cn(
                                         "w-full pl-9 pr-8 py-2.5 border rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-wider transition-all appearance-none cursor-pointer", 
                                         isDark ? "bg-slate-900 border-white/5 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                                     )}
                                 >
                                     <option value="ALL">All Professions</option>
                                     <option value="Software Engineer">Software Engineer</option>
                                     <option value="IT Professional">IT Professional</option>
                                     <option value="Student">Student</option>
                                     <option value="Business Owner">Business Owner</option>
                                     <option value="Sales/Marketing">Sales/Marketing</option>
                                     <option value="Medical Professional">Medical Professional</option>
                                     <option value="Government Employee">Government Employee</option>
                                     <option value="Hospitallity">Hospitallity</option>
                                     <option value="Freelancer">Freelancer</option>
                                     <option value="Teacher/Professor">Teacher/Professor</option>
                                     <option value="Other">Other</option>
                                 </select>
                                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                             </div>

                             {/* Sorting */}
                             <div className="relative">
                                 <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                 <select
                                     value={`${sortBy}:${sortOrder}`}
                                     onChange={(e) => {
                                         const [s, o] = e.target.value.split(":");
                                         setSortBy(s);
                                         setSortOrder(o);
                                     }}
                                     className={cn(
                                         "w-full pl-9 pr-8 py-2.5 border rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-wider transition-all appearance-none cursor-pointer", 
                                         isDark ? "bg-slate-900 border-white/5 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                                     )}
                                 >
                                     <option value="move_in_date:desc">Newest First</option>
                                     <option value="move_in_date:asc">Oldest First</option>
                                     <option value="full_name:asc">Name (A-Z)</option>
                                 </select>
                                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                             </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Utility Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-dashed border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-3">
                    {selectedTenants.length > 0 && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={handleBulkHardDelete}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95"
                        >
                            <Trash2 size={14} /> Delete Selected ({selectedTenants.length})
                        </motion.button>
                    )}
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg", !isDark && "bg-blue-50")}>
                        {totalTenants} Total Residents
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className={cn("text-[9px] uppercase tracking-widest font-black mr-1", isDark ? "text-slate-500" : "text-slate-400")}>Page Size</span>
                    {[10, 20, 50].map((s) => (
                        <button
                            key={s}
                            onClick={() => setPageSize(s)}
                            className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border",
                                s === pageSize
                                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20"
                                    : isDark ? "bg-slate-900 border-white/5 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
         </div>
         
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className={cn("border-b", isDark ? "bg-white/5 border-white/10" : "bg-slate-200/60 border-slate-300")}>
                    <tr>
                        <th className="px-6 py-4 w-10">
                            <div className="flex items-center justify-center">
                                <input 
                                    type="checkbox"
                                    checked={tenants.length > 0 && selectedTenants.length === tenants.length}
                                    onChange={toggleSelectAll}
                                    className={cn(
                                        "w-4 h-4 rounded border transition-all cursor-pointer",
                                        isDark ? "bg-slate-800 border-white/20 checked:bg-blue-600" : "bg-white border-slate-300 checked:bg-blue-600"
                                    )}
                                />
                            </div>
                        </th>
                        <th className={cn("px-6 py-4 text-xs font-black uppercase tracking-wider", isDark ? "opacity-60" : "text-slate-950")}>Resident</th>
                        <th className={cn("px-6 py-4 text-xs font-black uppercase tracking-wider", isDark ? "opacity-60" : "text-slate-950")}>Contact</th>
                        <th className={cn("px-6 py-4 text-xs font-black uppercase tracking-wider", isDark ? "opacity-60" : "text-slate-950")}>Profession</th>
                        <th className={cn("px-6 py-4 text-xs font-black uppercase tracking-wider", isDark ? "opacity-60" : "text-slate-950")}>Room</th>
                        <th className={cn("px-6 py-4 text-xs font-black uppercase tracking-wider", isDark ? "opacity-60" : "text-slate-950")}>Joined</th>
                        <th className={cn("px-6 py-4 text-xs font-black uppercase tracking-wider", isDark ? "opacity-60" : "text-slate-950")}>Status</th>
                        <th className={cn("px-6 py-4 text-xs font-black uppercase tracking-wider text-right", isDark ? "opacity-60" : "text-slate-950")}>Actions</th>
                    </tr>
                </thead>
                <tbody className={cn("text-sm divide-y", isDark ? "divide-white/5" : "divide-slate-100")}>
                    {loading ? (
                         <tr>
                            <td colSpan={8} className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center justify-center gap-3 opacity-60">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                    <span className="text-xs font-medium uppercase tracking-wider">Loading Residents...</span>
                                </div>
                            </td>
                        </tr>
                    ) : tenants.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-8 py-24 text-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="opacity-40 flex flex-col items-center gap-4">
                                        <Users size={48} className="text-slate-500" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">No Residents Found</p>
                                            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Resident Directory is empty</p>
                                        </div>
                                    </div>

                                    {pgs.length === 0 ? (
                                        <div className="mt-4 space-y-4">
                                            <p className="text-rose-500 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                                                <AlertCircle size={16} /> No properties found
                                            </p>
                                            <a href="/pgs?action=new" className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-xs uppercase tracking-widest">
                                                Create Property
                                            </a>
                                        </div>
                                    ) : rooms.length === 0 ? (
                                        <div className="mt-4 space-y-4">
                                            <p className="text-rose-500 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                                                <AlertCircle size={16} /> No rooms are currently available
                                            </p>
                                            <a href="/rooms" className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-xs uppercase tracking-widest">
                                                Create Room
                                            </a>
                                        </div>
                                    ) : beds.filter(b => b.status === 'AVAILABLE').length === 0 ? (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-amber-500 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                                                <AlertCircle size={16} /> All beds are currently full
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Add more capacity in Rooms section</p>
                                            <a href="/rooms" className="inline-block mt-2 px-6 py-2 border-2 border-amber-500/20 text-amber-500 rounded-xl font-bold hover:bg-amber-500 hover:text-white transition-all text-xs uppercase tracking-widest">
                                                Manage Rooms
                                            </a>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setShowModal(true)}
                                            className="mt-6 px-10 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 text-sm uppercase tracking-widest"
                                        >
                                            Onboard Resident
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ) : (
                        tenants.map(tenant => (
                        <tr key={tenant.id} className={cn(
                            "group transition-colors relative", 
                            isDark ? "hover:bg-white/5" : "hover:bg-slate-50",
                            tenant.stay_type === 'DAILY' && (isDark ? "bg-amber-900/10 border-l-4 border-amber-500" : "bg-amber-50 border-l-4 border-amber-400"),
                            selectedTenants.includes(tenant.id) && (isDark ? "bg-blue-500/10" : "bg-blue-50")
                        )}>
                            <td className="px-6 py-4 w-10">
                                <div className="flex items-center justify-center">
                                    <input 
                                        type="checkbox"
                                        checked={selectedTenants.includes(tenant.id)}
                                        onChange={() => toggleTenantSelection(tenant.id)}
                                        className={cn(
                                            "w-4 h-4 rounded border transition-all cursor-pointer",
                                            isDark ? "bg-slate-800 border-white/20 checked:bg-blue-600" : "bg-white border-slate-300 checked:bg-blue-600"
                                        )}
                                    />
                                </div>
                            </td>

                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-slate-900 dark:text-white">{tenant.full_name}</span>
                                        {tenant.stay_type === 'DAILY' && (
                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-amber-500 text-white animate-pulse">
                                                Daily
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium tracking-wider mt-0.5 mb-0.5">
                                        🪪 {maskAadhaar(tenant.id_number)}
                                    </span>
                                    {/* Real-time Pending Dues Display */}
                                    {(() => {
                                        let due = 0;
                                        if (tenant.stay_type === 'DAILY') {
                                            const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
                                            if (daily?.move_in_date && daily?.vacate_date) {
                                                const start = new Date(daily.move_in_date);
                                                const end = new Date(daily.vacate_date);
                                                let diffDays = 1;
                                                if (end > start) {
                                                    diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                                }
                                                const rentBase = diffDays * Number(daily.rent_per_day || tenant.rent_per_day || 0);
                                                const maintenanceBase = Number(daily.maintenance_amount || tenant.maintenance_amount || 0);
                                                const totalExpected = rentBase + maintenanceBase;
                                                
                                                // Real-time local calculated paid amount
                                                const actualPaid = dailyPaidSums[tenant.id] || 0;
                                                due = Math.max(0, totalExpected - actualPaid);
                                            } else {
                                                // If dates missing, use DB values but still favor local payment sum if possible
                                                const dbBalance = Number(tenant.daily_stay_details?.balance_amount || tenant.balance_amount || 0);
                                                const dbPaid = Number(tenant.daily_stay_details?.paid_amount || tenant.paid_amount || 0);
                                                const totalExpected = dbBalance + dbPaid;
                                                due = Math.max(0, totalExpected - (dailyPaidSums[tenant.id] || 0));
                                            }
                                        } else {
                                            // Unified Invoice System for Monthly residents
                                            due = Number(invoiceBalances[tenant.id] || 0);
                                        }
                                        return due > 0 ? (
                                            <span className="text-[9px] font-black uppercase text-rose-500 flex items-center gap-1 mt-1 bg-rose-500/10 w-fit px-1.5 py-0.5 rounded-md border border-rose-500/20">
                                                 Due: ₹{due.toLocaleString('en-IN')}
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{tenant.phone}</td>
                            <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded-lg text-[10px] font-bold border whitespace-nowrap",
                                        isDark ? "bg-blue-500/5 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-100"
                                    )}>
                                        {tenant.profession || "N/A"}
                                    </span>
                            </td>
                            <td className="px-6 py-4">
                                {tenant.rooms ? (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-xs text-blue-600">{tenant.pgs?.name ?? "Deleted Property"}</span>
                                            <span className={cn("text-base font-black", isDark ? "text-slate-200" : "text-slate-900")}>
                                                {tenant.rooms?.room_number || tenant.rooms?.roomNumber ? `Room ${tenant.rooms.room_number || tenant.rooms.roomNumber}` : "Room N/A"}
                                                {(tenant.beds?.bed_number || tenant.beds?.bedNumber) && (
                                                    <span className="text-blue-500"> - {tenant.beds.bed_number || tenant.beds.bedNumber}</span>
                                                )}
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-widest flex flex-col">
                                                {(() => {
                                                    const dailyInfo = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
                                                    let dispRent = tenant.stay_type === 'DAILY' ? (dailyInfo?.total_rent || dailyInfo?.rent_per_day || tenant.rent_per_day || 0) : (tenant.custom_rent || tenant.rent_per_month || 0);
                                                    if (tenant.stay_type === 'DAILY' && dailyInfo?.move_in_date && dailyInfo?.vacate_date) {
                                                        const start = new Date(dailyInfo.move_in_date);
                                                        const end = new Date(dailyInfo.vacate_date);
                                                        let diffDays = 1;
                                                        if (end > start) {
                                                            diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                                                        }
                                                        dispRent = diffDays * Number(dailyInfo.rent_per_day || tenant.rent_per_day || 0);
                                                    }
                                                    return (
                                                        <span>
                                                            Rent {tenant.stay_type === 'DAILY' && '(Total)'}: ₹{dispRent.toLocaleString()} {tenant.custom_rent && <span className="ml-1 text-[8px] bg-emerald-500 text-white px-1 rounded">Custom</span>}
                                                        </span>
                                                    );
                                                })()}
                                                {Number(tenant.security_deposit || 0) > 0 && (
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-slate-500 text-[9px] flex items-center gap-1">
                                                            📦 Deposit: ₹{Number(tenant.security_deposit).toLocaleString()}
                                                        </span>
                                                        {(() => {
                                                            // Logic for Deposit Paid: 
                                                            // If balance is 0 and they have a deposit, they've likely paid it
                                                            // For Monthly, check overall invoice balance
                                                            const isPaid = tenant.stay_type === 'DAILY' 
                                                                ? (dailyPaidSums[tenant.id] >= (tenant.daily_stay_details?.total_rent || 0))
                                                                : (invoiceBalances[tenant.id] <= 0);
                                                            
                                                            return isPaid ? (
                                                                <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-1 rounded border border-emerald-500/20 uppercase tracking-tighter">Paid</span>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                )}
                                                {(() => {
                                                    const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
                                                    const maintAmt = tenant.stay_type === 'DAILY' ? (daily?.maintenance_amount || 0) : (tenant.maintenance_amount || 0);
                                                    const maintType = tenant.stay_type === 'DAILY' ? daily?.maintenance_type : tenant.maintenance_type;
                                                    
                                                     if (maintAmt > 0) {
                                                        const isMaintPaid = tenant.stay_type === 'DAILY' 
                                                            ? (Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0]?.maintenance_paid : tenant.daily_stay_details?.maintenance_paid)
                                                            : (tenant.maintenance_paid);
                                                        
                                                        return (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-blue-500 text-[9px] flex items-center gap-1">
                                                                    + ₹{Number(maintAmt).toLocaleString()} Maint ({maintType})
                                                                </span>
                                                                {isMaintPaid && (
                                                                    <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-1 rounded border border-emerald-500/20 uppercase tracking-tighter">Paid</span>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </span>
                                    </div>
                                ) : <span className="text-slate-400 italic">Unassigned</span>}
                            </td>
                            <td className="px-6 py-4 border-r-0">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-slate-300">
                                        {new Date(tenant.move_in_date || tenant.check_in_date || tenant.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    {tenant.stay_type === 'DAILY' && (
                                        <span className="text-[10px] text-amber-600 font-black">
                                            ends {new Date(tenant.daily_stay_details?.vacate_date || tenant.vacate_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <select
                                    value={tenant.status}
                                    onChange={(e) => handleStatusChange(tenant.id, e.target.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border outline-none cursor-pointer transition-all appearance-none",
                                        getStatusColor(tenant.status)
                                    )}
                                >
                                    <option value="ACTIVE" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Active</option>
                                    <option value="INACTIVE" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Inactive</option>
                                </select>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => handleEdit(tenant)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg" title="Edit"><Pencil size={18}/></button>
                                    <button onClick={() => handleDelete(tenant.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg" title="Delete Permanent"><Trash2 size={18}/></button>
                                </div>
                            </td>
                        </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>

         {/* Mobile View */}
         <div className={cn("md:hidden divide-y", isDark ? "divide-white/5" : "divide-slate-100")}>
            {loading ? (
                <div className="p-12 text-center text-slate-500 font-light italic opacity-60">
                    Loading...
                </div>
            ) : tenants.length === 0 ? (
                <div className="p-14 text-center space-y-4">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                        <Users size={40} className="text-slate-500" />
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Residents Found</p>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Resident Directory is empty</p>
                    </div>

                    {pgs.length === 0 ? (
                        <div className="mt-4 space-y-4 bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10">
                            <p className="text-rose-500 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                <AlertCircle size={14} /> No properties found
                            </p>
                            <a href="/pgs?action=new" className="w-full inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-[10px] uppercase tracking-widest">
                                Create Property
                            </a>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="mt-4 space-y-4 bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10">
                            <p className="text-rose-500 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                <AlertCircle size={14} /> No rooms available
                            </p>
                            <a href="/rooms" className="w-full inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-[10px] uppercase tracking-widest">
                                Create Room
                            </a>
                        </div>
                    ) : beds.filter(b => b.status === "AVAILABLE").length === 0 ? (
                        <div className="mt-4 space-y-4 bg-amber-500/5 p-6 rounded-2xl border border-amber-500/10">
                            <p className="text-amber-500 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                <AlertCircle size={14} /> All beds are full
                            </p>
                            <a href="/rooms" className="w-full inline-block px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-[10px] uppercase tracking-widest">
                                Manage Rooms
                            </a>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setShowModal(true)}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 text-[10px] uppercase tracking-[0.2em]"
                        >
                            Onboard Resident
                        </button>
                    )}
                </div>
            ) : tenants.map(tenant => (
                    <div key={tenant.id} className={cn(
                        "p-5 space-y-4 relative overflow-hidden",
                        tenant.stay_type === 'DAILY' && (isDark ? "bg-amber-900/10 border-l-4 border-amber-500" : "bg-amber-50 border-l-4 border-amber-400")
                    )}>
                         <div className="absolute top-0 left-0 p-2 z-10">
                            <input 
                                type="checkbox"
                                checked={selectedTenants.includes(tenant.id)}
                                onChange={() => toggleTenantSelection(tenant.id)}
                                className={cn(
                                    "w-4 h-4 rounded border shadow-sm transition-all cursor-pointer",
                                    isDark ? "bg-slate-800 border-white/20 checked:bg-blue-600" : "bg-white border-slate-300 checked:bg-blue-600"
                                )}
                            />
                        </div>
                        {tenant.stay_type === 'DAILY' && (
                            <div className="absolute top-0 right-0">
                                <span className="px-2 py-0.5 rounded-bl-lg text-[8px] font-black uppercase tracking-tighter bg-amber-500 text-white shadow-sm">
                                    Daily
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-start">
                            <div className="text-left">
                                <h3 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>{tenant.full_name}</h3>
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-[10px] text-slate-500 font-medium font-mono">{tenant.phone}</p>
                                    <p className="text-[9px] text-slate-400 font-medium">🪪 {maskAadhaar(tenant.id_number)}</p>
                                    {/* Mobile Real-time Pending Dues */}
                                    {(() => {
                                        let due = 0;
                                        if (tenant.stay_type === 'DAILY') {
                                            const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
                                            const start = new Date(daily?.move_in_date || tenant.move_in_date || tenant.check_in_date || tenant.created_at);
                                            const end = new Date(daily?.vacate_date || tenant.vacate_date);
                                            let days = 1;
                                            if (end > start) days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                            const totalExpected = (days * Number(daily?.rent_per_day || tenant.rent_per_day || 0)) + Number(daily?.maintenance_amount || tenant.maintenance_amount || 0);
                                            due = Math.max(0, totalExpected - (dailyPaidSums[tenant.id] || 0));
                                        } else {
                                            due = Number(invoiceBalances[tenant.id] || 0);
                                        }
                                        return due > 0 ? (
                                            <span className="text-[9px] font-black uppercase text-rose-500 flex items-center gap-1 mt-1 bg-rose-500/10 w-fit px-1.5 py-0.5 rounded-md border border-rose-500/20">
                                                Due: ₹{due.toLocaleString('en-IN')}
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                            <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider", tenant.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500")}>
                                {tenant.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-left">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Assignment</p>
                                {tenant.rooms ? (
                                    <div className="flex flex-col mt-1">
                                        <span className="font-bold text-[10px] text-blue-500 truncate">{tenant.pgs?.name ?? "Deleted Property"}</span>
                                        <span className={cn("text-xs font-bold", isDark ? "text-slate-200" : "text-slate-800")}>
                                            {tenant.rooms?.room_number || tenant.rooms?.roomNumber ? `Room ${tenant.rooms.room_number || tenant.rooms.roomNumber}` : "Room N/A"}
                                            {(tenant.beds?.bed_number || tenant.beds?.bedNumber) && ` - Bed ${tenant.beds.bed_number || tenant.beds.bedNumber}`}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-600 mt-0.5 uppercase flex flex-col">
                                            <span>₹{(tenant.custom_rent || tenant.rent_per_month || tenant.rent_per_day || 0).toLocaleString()} Rent</span>
                                            {Number(tenant.security_deposit || 0) > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500 text-[8px]">
                                                         📦 ₹{Number(tenant.security_deposit).toLocaleString()} Deposit
                                                    </span>
                                                    {(() => {
                                                        const isPaid = tenant.stay_type === 'DAILY' 
                                                            ? (dailyPaidSums[tenant.id] >= (tenant.daily_stay_details?.total_rent || 0))
                                                            : (invoiceBalances[tenant.id] <= 0);
                                                        return isPaid && <span className="bg-emerald-500/10 text-emerald-500 text-[7px] font-black px-1 rounded border border-emerald-500/10 uppercase tracking-tighter">Paid</span>;
                                                    })()}
                                                </div>
                                            )}
                                            {tenant.maintenance_amount > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-blue-500 text-[8px]">
                                                        + ₹{Number(tenant.maintenance_amount).toLocaleString()} Maint ({tenant.maintenance_type})
                                                    </span>
                                                    {(() => {
                                                        const isMaintPaid = tenant.stay_type === 'DAILY' 
                                                            ? (Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0]?.maintenance_paid : tenant.daily_stay_details?.maintenance_paid)
                                                            : (tenant.maintenance_paid);
                                                        return isMaintPaid && <span className="bg-emerald-500/10 text-emerald-500 text-[7px] font-black px-1 rounded border border-emerald-500/10 uppercase tracking-tighter">Paid</span>;
                                                    })()}
                                                </div>
                                            )}
                                        </span>
                                    </div>
                                ) : <span className="text-[10px] text-slate-400 italic">Unassigned</span>}
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Joined Date</p>
                                <p className={cn("text-[10px] font-bold mt-1", isDark ? "text-slate-200" : "text-slate-800")}>{new Date(tenant.move_in_date || tenant.check_in_date || tenant.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t pt-4 mt-4" >
                            <button onClick={() => handleEdit(tenant)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg" title="Edit"><Pencil size={18}/></button>
                            <button onClick={() => handleDelete(tenant.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg" title="Delete Permanent"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))
            }
         </div>

         {/* Pagination Controls */}
         <div className={cn("p-4 border-t flex items-center justify-between", isDark ? "border-white/5" : "border-slate-100")}>
             <span className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
                 Showing <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{totalTenants > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{Math.min(page * pageSize, totalTenants)}</span> of <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{totalTenants}</span> results
             </span>
             
             <div className="flex items-center gap-2">
                 <button
                     onClick={() => handlePageChange(page - 1)}
                     disabled={page === 1}
                     className={cn("p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed", isDark ? "border-white/10 hover:bg-white/5 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-600")}
                 >
                     <ChevronLeft size={16} />
                 </button>
                 <div className={cn("h-8 px-3 flex items-center justify-center rounded-lg border text-xs font-bold", isDark ? "bg-slate-800 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900")}>
                     {page} / {totalPages || 1}
                 </div>
                 <button
                     onClick={() => handlePageChange(page + 1)}
                     disabled={page >= totalPages}
                     className={cn("p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed", isDark ? "border-white/10 hover:bg-white/5 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-600")}
                 >
                     <ChevronRight size={16} />
                 </button>
             </div>
         </div>
      </div>

      <UnifiedStayManager 
        isOpen={showModal} 
        onClose={() => {
            setShowModal(false);
            setEditingTenant(null);
        }} 
        initialData={editingTenant}
        onSuccess={(type, hasPayment) => {
            if (!editingTenant) setPage(1);
            setStatusFilter("ALL");
            fetchData();
            
            const message = editingTenant 
                ? "Resident updated successfully!" 
                : (hasPayment 
                    ? "Resident onboarded & Payment recorded successfully!" 
                    : "Resident onboarded successfully!");
            
            showToast(message);
        }} 
     />
      <ConfirmationModal 
        isOpen={statusConfirm.isOpen}
        onClose={() => setStatusConfirm({ isOpen: false, tenantId: null, newStatus: "", isLoading: false })}
        onConfirm={confirmStatusChange}
        title="Change Resident Status?"
        message={`Are you sure you want to change this resident's status to ${statusConfirm.newStatus}?`}
        confirmText="Update Status"
        isLoading={statusConfirm.isLoading}
        type={statusConfirm.newStatus === 'ACTIVE' ? 'success' : 'warning'}
      />

      <ConfirmationModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false, tenant: null, isLoading: false, inputValue: "", error: "" }))}
        onConfirm={confirmDelete}
        title="Permanent Delete"
        subtitle="This action is irreversible"
        message={`This will permanently remove "${deleteConfirm.tenant?.full_name}" and all historical records. This action is irreversible.`}
        confirmText="Permanently Delete"
        isLoading={deleteConfirm.isLoading}
        type="danger"
        needsInput={true}
        inputValue={deleteConfirm.inputValue}
        onInputChange={(val) => setDeleteConfirm(prev => ({ ...prev, inputValue: val, error: "" }))}
        inputPlaceholder={`Type "${deleteConfirm.generatedCode}" to confirm`}
        inputLabel={`TYPE "${deleteConfirm.generatedCode}"`}
        inputError={deleteConfirm.error}
      />

      <ConfirmationModal 
        isOpen={bulkDeleteConfirm.isOpen}
        onClose={() => setBulkDeleteConfirm(prev => ({ ...prev, isOpen: false, isLoading: false, inputValue: "", error: "" }))}
        onConfirm={confirmBulkDelete}
        title="Mass Permanent Delete"
        subtitle="This action is irreversible"
        message={`This will permanently remove ${selectedTenants.length} records and all associated data. This action is irreversible.`}
        confirmText={`Delete ${selectedTenants.length} Records`}
        isLoading={bulkDeleteConfirm.isLoading}
        type="danger"
        needsInput={true}
        inputValue={bulkDeleteConfirm.inputValue}
        onInputChange={(val) => setBulkDeleteConfirm(prev => ({ ...prev, inputValue: val, error: "" }))}
        inputPlaceholder={`Type "${bulkDeleteConfirm.generatedCode}" to confirm`}
        inputLabel={`TYPE "${bulkDeleteConfirm.generatedCode}"`}
        inputError={bulkDeleteConfirm.error}
      />
    </div>
  );
};

export default Tenants;
