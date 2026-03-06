import { SectionHeader, InfoPill, DocCard, FinanceRow } from "./TenantFinderComponents";
import { TenantDetailsModal } from "./TenantDetailsModal";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { pgAPI, tenantAPI, paymentAPI } from "../../services/api";
import { 
  Search, User, Phone, Mail, MapPin, X,
  Calendar, Building2, ChevronRight, 
  ChevronLeft, Filter, SearchCode,
  Sparkles, Fingerprint, ShieldCheck, Shield,
  Sun, Moon, RotateCw, CheckCircle2, Briefcase
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "../../context/ThemeContext";
import ThemeToggle from "../../components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import AlertModal from "../../components/AlertModal";
import Toast from "../../components/Toast";
import { cn } from "../../lib/utils";

const TenantFinder = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [professionFilter, setProfessionFilter] = useState("ALL");
  const [pgFilter, setPgFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("move_in_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pgs, setPgs] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const filterSelectRef = useRef(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTenants, setTotalTenants] = useState(0);
  const [invoiceBalances, setInvoiceBalances] = useState({});
  const [dailyPaidSums, setDailyPaidSums] = useState({});
  const [errorStatus, setErrorStatus] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const PAGE_SIZE = 8;

  const PROFESSION_OPTIONS = [
    "Software Engineer",
    "IT Professional",
    "Student",
    "Business Owner",
    "Sales/Marketing",
    "Medical Professional",
    "Government Employee",
    "Hospitallity",
    "Freelancer",
    "Teacher/Professor",
    "Other"
  ];


  const getLiveBalance = (tenant) => {
    if (tenant.stay_type === "DAILY") {
        const daily = Array.isArray(tenant.daily_stay_details) ? tenant.daily_stay_details[0] : tenant.daily_stay_details;
        const moveIn = daily?.move_in_date || tenant.move_in_date;
        const vacate = daily?.vacate_date || tenant.vacate_date;
        if (moveIn && vacate) {
            const start = new Date(moveIn);
            const end = new Date(vacate);
            let diffDays = 1;
            if (end > start) diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const rentBase = diffDays * Number(daily?.rent_per_day || tenant.rent_per_day || 0);
            const maintBase = Number(daily?.maintenance_amount || tenant.maintenance_amount || 0);
            const totRent = rentBase + maintBase;
            
            // Use real-time local calculation
            const actualPaid = dailyPaidSums[tenant.id] || 0;
            return Math.max(0, totRent - actualPaid);
        }
        
        const dbBalance = Number(daily?.balance_amount || tenant.balance_amount || 0);
        const dbPaid = Number(daily?.paid_amount || tenant.paid_amount || 0);
        const totalExpected = dbBalance + dbPaid;
        return Math.max(0, totalExpected - (dailyPaidSums[tenant.id] || 0));
    }
    // Unified Invoice System for Monthly residents
    return invoiceBalances[tenant.id] || 0;
  };

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchTerm);
        setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const syncMonthlyBalance = async (tenant) => {
    try {
        setLoading(true); // Show progress on main UI
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Auth required");

        // Use the new Invoice Generation system for this specific owner's tenants
        // (The RPC handles all tenants for the owner, but we'll focus on the feedback for this one)
        await supabase.rpc('generate_monthly_invoices', { p_owner_id: user.id });
        
        await fetchData(); // Refresh everything
        showToast("Invoices generated and balance synchronized.");
    } catch (error) {
        console.error("Sync fetch failed", error);
        showToast("Calibration failed.", "error");
    } finally {
        setLoading(false);
    }
  };


  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, count } = await tenantAPI.search({
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch,
          status: statusFilter === "ALL" ? "" : statusFilter,
          profession: professionFilter === "ALL" ? "" : professionFilter,
          pgId: pgFilter === "ALL" ? "" : pgFilter,
          sortBy,
          sortOrder
      });
      setTenants(data || []);
      setTotalTenants(count || 0);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));

      // Fetch outstanding balances for the current search results from the Invoices system
      if (data && data.length > 0) {
          const tenantIds = data.map(t => t.id);
          
          const results = await Promise.all([
            supabase
              .from("payments")
              .select("tenant_id, amount, status")
              .in("tenant_id", tenantIds),
            supabase
              .from("invoices")
              .select("tenant_id, total_amount, paid_amount, type")
              .in("tenant_id", tenantIds)
              .in("status", ["UNPAID", "PARTIAL"])
              .neq("type", "DEPOSIT") // Deposit is one-time; exclude from recurring balance
          ]);

          const paymentsList = results[0].data || [];
          const invoicesList = results[1].data || [];
          
          const dailySums = {};
          paymentsList.forEach(p => {
              const s = (p.status || "").toUpperCase();
              if (s === 'PAID' || s === 'COMPLETED' || s === 'PAID_SUCCESS') {
                   dailySums[p.tenant_id] = (dailySums[p.tenant_id] || 0) + Number(p.amount || 0);
              }
          });
          setDailyPaidSums(dailySums);

          const balances = {};
          invoicesList.forEach(inv => {
              // DEPOSIT invoices already excluded by the query (.neq('type','DEPOSIT'))
              // but guard here too for safety
              if (inv.type === 'DEPOSIT') return;
              const amount = Number(inv.total_amount) - Number(inv.paid_amount);
              if (amount > 0) {
                  balances[inv.tenant_id] = (balances[inv.tenant_id] || 0) + amount;
              }
          });
          setInvoiceBalances(balances);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorStatus(error.message || "Failed to fetch data from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleRealtime = () => {
        setTimeout(() => fetchData(), 600);
    };

    const channel = supabase.channel('tenant-finder-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, handleRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stay_details' }, handleRealtime)
      .subscribe();

    return () => { 
        supabase.removeChannel(channel); 
    };
  }, [page, debouncedSearch, statusFilter, professionFilter, pgFilter, sortBy, sortOrder]);

  useEffect(() => {
      const fetchPGs = async () => {
          try {
              const data = await pgAPI.getAll();
              setPgs(data || []);
          } catch (e) {
              console.error("PG fetch failed", e);
          }
      };
      fetchPGs();
   }, []);

  return (
    <div className="min-h-[85vh] flex flex-col space-y-8 p-4 md:p-8">
      <Toast 
        isOpen={!!toast}
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
      {/* Classic Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <h1 className={cn("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Resident Search
          </h1>
          <p className={cn("text-sm font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
            Search across properties by name, phone, email or identity.
          </p>
        </div>
        
        <button 
            onClick={toggleTheme}
            className={cn(
                "p-2.5 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                isDark 
                    ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
        >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

       {/* Classic Toolbar Interface */}
      <div className="w-full space-y-4">
        <div className={cn(
            "flex flex-col lg:flex-row items-stretch gap-3 p-3 rounded-xl border",
            isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"
        )}>
            {/* Search Input Group */}
            <div className="flex-1 relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                    placeholder="Search by name, phone, email, room or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                        "w-full h-12 pl-12 pr-10 rounded-lg border outline-none transition-all text-sm font-medium",
                        isDark 
                            ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20" 
                            : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10"
                    )}
                />
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Property Filter */}
            <div className="w-full lg:w-48 relative">
                <select 
                    value={pgFilter}
                    onChange={(e) => {
                        setPgFilter(e.target.value);
                        setPage(1);
                    }}
                    className={cn(
                        "w-full h-12 pl-4 pr-10 rounded-lg border outline-none appearance-none transition-all text-sm font-bold cursor-pointer",
                        isDark 
                            ? "bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500" 
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:border-blue-500"
                    )}
                >
                    <option value="ALL">All Properties</option>
                    {pgs.map(pg => <option key={pg.id} value={pg.id}>{pg.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <ChevronRight className="rotate-90" size={14} />
                </div>
            </div>

            {/* Profession Filter */}
            <div className="w-full lg:w-48 relative">
                <select 
                    value={professionFilter}
                    onChange={(e) => {
                        setProfessionFilter(e.target.value);
                        setPage(1);
                    }}
                    className={cn(
                        "w-full h-12 pl-4 pr-10 rounded-lg border outline-none appearance-none transition-all text-sm font-bold cursor-pointer",
                        isDark 
                            ? "bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500" 
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:border-blue-500"
                    )}
                >
                    <option value="ALL">All Professions</option>
                    {PROFESSION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <ChevronRight className="rotate-90" size={14} />
                </div>
            </div>

            {/* Sort Order */}
            <div className="w-full lg:w-44 relative">
                <select 
                    value={`${sortBy}:${sortOrder}`}
                    onChange={(e) => {
                        const [s, o] = e.target.value.split(":");
                        setSortBy(s);
                        setSortOrder(o);
                        setPage(1);
                    }}
                    className={cn(
                        "w-full h-12 pl-4 pr-10 rounded-lg border outline-none appearance-none transition-all text-sm font-bold cursor-pointer",
                        isDark 
                            ? "bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500" 
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:border-blue-500"
                    )}
                >
                    <option value="move_in_date:desc">Newest First</option>
                    <option value="move_in_date:asc">Oldest First</option>
                    <option value="full_name:asc">Name (A-Z)</option>
                    <option value="pg_name:asc">PG Name (A-Z)</option>
                    <option value="floor:asc">Floor (Low-High)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <ChevronRight className="rotate-90" size={14} />
                </div>
            </div>

            <button 
                onClick={fetchData}
                disabled={loading}
                className={cn(
                    "h-12 px-6 rounded-lg text-white font-bold text-sm transition-all flex items-center justify-center gap-2",
                    "bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                )}
            >
                {loading ? <RotateCw className="animate-spin" size={16} /> : <Search size={16} />}
                Search
            </button>
        </div>

        {/* Classic Search Status Strip */}
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl mt-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {debouncedSearch ? `${totalTenants} Residents Found` : "Results updated automatically"}
                </p>
                {debouncedSearch && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] font-bold text-blue-600 border border-blue-500/20">
                         {totalTenants} MATCHED
                    </span>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Classic Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] font-bold tabular-nums text-slate-500 px-2">{page} of {totalPages}</span>
                        <button 
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 transition-all"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}

                {debouncedSearch && (
                    <button 
                        onClick={() => {
                            setSearchTerm("");
                            setPgFilter("ALL");
                            setStatusFilter("ALL");
                            setProfessionFilter("ALL");
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
                    >
                        Clear Search
                    </button>
                )}
            </div>
        </div>

        </div>

      {/* Classic List Layout */}
      <div className="w-full mt-6">
          {loading ? (
             <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={cn("h-20 rounded-xl animate-pulse", isDark ? "bg-slate-800/50" : "bg-slate-100")} />
                ))}
             </div>
          ) : tenants.length > 0 ? (
            <div className="space-y-3 animate-in fade-in duration-500">
                 {tenants.map(tenant => (
                    <motion.div 
                        layoutId={`card-${tenant.id}`}
                        onClick={() => setSelectedTenant(tenant)}
                        key={tenant.id} 
                        className={cn(
                        "group p-4 md:p-6 rounded-xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center gap-4 cursor-pointer",
                        isDark 
                            ? "bg-slate-900 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700" 
                            : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                    )}>
                        {/* Avatar / Icon */}
                        <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                            isDark ? "bg-slate-800 border-slate-700 group-hover:bg-slate-700" : "bg-slate-50 border-slate-200"
                        )}>
                            <User size={20} className="text-blue-500" />
                        </div>

                        {/* Basic Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className={cn("text-base font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                                    {tenant.full_name}
                                </h3>
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                    tenant.status === 'ACTIVE' 
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                        : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                )}>
                                    {tenant.status}
                                </span>
                                {tenant.stay_type === 'DAILY' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-blue-500/10 text-blue-500 border-blue-500/20">
                                        DAILY
                                    </span>
                                ) : (
                                     <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-slate-500/5 text-slate-400 border-slate-500/10">
                                        MONTHLY
                                    </span>
                                )}
                                {Math.round(Number(getLiveBalance(tenant))) > 0 && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse">
                                        DUE
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium tracking-tight">
                                    <Phone size={14} className="text-slate-400" />
                                    {tenant.phone}
                                </div>
                            </div>
                        </div>

                        {/* Property Details */}
                        <div className="flex-1 shrink-0">
                             <div className="flex items-center gap-2 text-xs font-bold">
                                <Building2 size={14} className="text-blue-500" />
                                <span className={isDark ? "text-slate-300" : "text-slate-600"}>{tenant.pgs?.name || "Property N/A"}</span>
                             </div>
                             <div className="flex items-center gap-2 mt-1.5">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase border",
                                    isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
                                )}>
                                     Room {tenant.rooms?.room_number || "000"} • Bed {tenant.beds?.bed_number || "0"}
                                </span>
                             </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="flex items-center gap-6 shrink-0">
                             <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Rent</p>
                                <p className={cn("text-xs font-bold", isDark ? "text-blue-400" : "text-blue-600")}>
                                    ₹{(tenant.rent_per_month || tenant.rent_per_day || tenant.custom_rent || tenant.rooms?.rent || 0).toLocaleString()}
                                </p>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Deposit</p>
                                <p className={cn("text-xs font-bold", isDark ? "text-emerald-400" : "text-emerald-600")}>
                                    ₹{(tenant.security_deposit || tenant.securityDeposit || tenant.rooms?.securityDeposit || tenant.rooms?.deposit || 0).toLocaleString()}
                                </p>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Balance</p>
                                <p className={cn("text-xs font-bold", Math.round(Number(getLiveBalance(tenant))) > 0 ? "text-rose-500" : "text-emerald-500")}>
                                    ₹{Math.max(0, Math.round(Number(getLiveBalance(tenant)))).toLocaleString()}
                                </p>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Maintenance</p>
                                <p className={cn("text-xs font-bold", isDark ? "text-blue-400" : "text-blue-600")}>
                                    ₹{(tenant.maintenance_amount || tenant.daily_stay_details?.[0]?.maintenance_amount || 0).toLocaleString()}
                                </p>
                             </div>
                             <div className={cn(
                                 "h-8 w-8 rounded-lg flex items-center justify-center border transition-all opacity-0 group-hover:opacity-100",
                                 isDark ? "bg-slate-800 border-slate-700 hover:bg-blue-600 hover:border-blue-500 text-white" : "bg-slate-100 border-slate-200 hover:bg-blue-600 hover:border-blue-500 hover:text-white text-slate-500"
                             )}>
                                <ChevronRight size={16} />
                             </div>
                        </div>
                    </motion.div>

                ))}
            </div>
          ) : debouncedSearch ? (
            <div className="text-center py-20 space-y-4 opacity-50">
                <SearchCode size={64} className="mx-auto text-blue-500" />
                <div>
                    <h3 className="text-xl font-bold">No Records Found</h3>
                    <p className="text-sm">We couldn't find any residents matching your search criteria.</p>
                </div>
            </div>
          ) : (
            <div className="text-center py-20 space-y-6 opacity-40">
                <div className="flex justify-center gap-8 text-blue-500">
                    <User size={48} />
                    <Building2 size={48} />
                </div>
                <div>
                    <h3 className="text-lg font-bold uppercase tracking-[0.2em]">{debouncedSearch ? "No Results" : "Directory Empty"}</h3>
                    <p className="text-sm italic">
                        {debouncedSearch 
                            ? "Try adjusting your search terms or filters." 
                            : "No resident records were found in the database."}
                    </p>
                </div>
            </div>
          )}
      </div>

      <TenantDetailsModal 
        selectedTenant={selectedTenant} 
        setSelectedTenant={setSelectedTenant} 
        isDark={isDark} 
        syncMonthlyBalance={syncMonthlyBalance} 
        invoiceBalance={selectedTenant ? invoiceBalances[selectedTenant.id] : 0}
        dailyPaidSum={selectedTenant ? (dailyPaidSums[selectedTenant.id] || 0) : 0}
      />

      {createPortal(
        <>

          <AlertModal 
            isOpen={!!errorStatus}
            onClose={() => setErrorStatus(null)}
            title="Search Engine Error"
            message={errorStatus}
          />
        </>,
        document.body
      )}
    </div>
  );
};

export default TenantFinder;
