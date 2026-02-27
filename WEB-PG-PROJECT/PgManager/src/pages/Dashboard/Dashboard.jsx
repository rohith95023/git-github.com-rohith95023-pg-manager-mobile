
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { statsAPI, paymentAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";
import { StatCard, PageHeader, Card, StatCardGrid } from "../../components/partials";
import ThemeToggle from "../../components/ThemeToggle";
import { 
  Building2, 
  Bed, 
  Users, 
  Calendar, 
  CreditCard, 
  Receipt,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  IndianRupee,
  RotateCw,
  AlertCircle
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}


import DailyStayCard from "./components/DailyStayCard";
import DailyStayModal from "./components/DailyStayModal";
import ExportModal from "./components/ExportModal";

const Dashboard = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const [stats, setStats] = useState({
    totalPgs: 0,
    totalRooms: 0,
    totalTenants: 0,
    totalPayments: 0,
    totalExpenses: 0,
    allTimeRevenue: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    maintenanceBeds: 0,
    netProfit: 0,
    recentPayments: [],
    recentResidents: [],
    dailyActiveTenants: 0,
    monthlyActiveTenants: 0,
    dailyCheckouts: 0,
    recentDailyTenants: [],
    pendingDues: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [activePanelId, setActivePanelId] = useState(null);
  const [panelDetails, setPanelDetails] = useState([]);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showNoDataWarning, setShowNoDataWarning] = useState(false);
  
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
        const result = await statsAPI.reconcileAllBalances();
        console.log("Sync Complete:", result);
        await fetchDashboardData(false);
    } catch (error) {
        console.error("Sync failed:", error);
    } finally {
        setIsSyncing(false);
    }
  };

  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const dataPromise = Promise.allSettled([
        statsAPI.getDashboardStats(),
        paymentAPI.getAll(),
      ]);

      const results = await dataPromise;
      
      const parseMoney = (val) => {
        if (!val) return 0;
        const clean = String(val).replace(/[^0-9.-]+/g, "");
        return Number(clean) || 0;
      };

      const dashboardStats = results[0]?.status === 'fulfilled' ? results[0].value : {};
      const recentPayments = results[1]?.status === 'fulfilled' ? (results[1].value || []) : [];

      setStats({
        totalPgs: dashboardStats?.totalPGs || 0,
        totalRooms: dashboardStats?.totalRooms || 0,
        activeRooms: dashboardStats?.activeRooms || 0,
        totalTenants: dashboardStats?.totalTenants || 0,
        totalPayments: parseMoney(dashboardStats?.monthlyRevenue),
        totalExpenses: parseMoney(dashboardStats?.monthlyExpenses),
        allTimeRevenue: parseMoney(dashboardStats?.totalRevenue),
        pendingDues: parseMoney(dashboardStats?.totalPendingDues),
        totalBeds: dashboardStats?.totalBeds || 0,
        occupiedBeds: dashboardStats?.occupiedBeds || 0,
        maintenanceBeds: dashboardStats?.maintenanceBeds || 0,
        maintenanceRooms: dashboardStats?.maintenanceRooms || 0,
        netProfit: parseMoney(dashboardStats?.netProfit),
        dailyActiveTenants: dashboardStats?.dailyActiveTenants || 0,
        monthlyActiveTenants: dashboardStats?.monthlyActiveTenants || 0,
        dailyCheckouts: dashboardStats?.dailyCheckouts || 0,
        recentResidents: dashboardStats?.recentResidents || [],
        recentDailyTenants: Array.isArray(dashboardStats?.recentDailyTenants) ? dashboardStats.recentDailyTenants : [],
        recentPayments: Array.isArray(recentPayments) ? recentPayments.slice(0, 5).map(p => {
          const tenant = Array.isArray(p.tenants) ? p.tenants[0] : p.tenants;
          const booking = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
          const bookingTenant = booking?.tenants ? (Array.isArray(booking.tenants) ? booking.tenants[0] : booking.tenants) : null;
          
          return {
            id: p.id,
            tenant: tenant?.full_name || bookingTenant?.full_name || "Guest",
            amount: p.amount,
            date: p.payment_date || p.txnDate || p.created_at,
            status: ((p.status || "").toUpperCase() === "COMPLETED" || (p.status || "").toUpperCase() === "PAID") ? "PAID" : (p.status || "").toUpperCase(),
          };
        }) : [],
      });
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCardClick = async (index, title) => {
    if (activePanelId === index) {
      setActivePanelId(null);
      return;
    }

    setActivePanelId(index);
    setIsPanelLoading(true);
    setPanelDetails([]);

    try {
      let details = [];
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      switch (title) {
        case "Total PGs": {
          const { data: pgsData } = await supabase.from('pgs').select('id, name').eq('status', 'ACTIVE');
          const { data: roomsData } = await supabase.from('rooms').select('id, pg_id, status');
          const { data: bedsData } = await supabase.from('beds').select('room_id, status');
          
          details = pgsData.map(pg => {
            const pgRooms = roomsData.filter(r => r.pg_id === pg.id);
            const roomIds = pgRooms.map(r => r.id);
            const pgBeds = (bedsData || []).filter(b => roomIds.includes(b.room_id));
            const activeBeds = pgBeds.filter(b => b.status !== 'MAINTENANCE');
            const occ = activeBeds.length > 0 ? Math.round((activeBeds.filter(b => b.status === 'OCCUPIED').length / activeBeds.length) * 100) : 0;
            return {
              name: pg.name,
              subtitle: `${pgRooms.length} Rooms • ${pgBeds.length} Beds`,
              value: `${occ}%`,
              meta: "Current Occupancy",
              statusColor: occ > 80 ? "text-emerald-500" : occ > 50 ? "text-blue-500" : "text-amber-500"
            };
          });
          break;
        }

        case "Active Rooms": {
          const { data: roomsData } = await supabase.from('rooms')
            .select('id, room_number, floor, status, pgs(name)')
            .in('status', ['AVAILABLE', 'PARTIAL', 'FULL'])
            .limit(10);
            
          const { data: bedsData } = await supabase.from('beds').select('room_id, status');

          details = roomsData.map(room => {
            const roomBeds = bedsData.filter(b => b.room_id === room.id);
            const occCount = roomBeds.filter(b => b.status === 'OCCUPIED').length;
            return {
              name: `Room ${room.room_number}`,
              subtitle: `${room.pgs?.name} • Floor ${room.floor}`,
              value: `${occCount}/${roomBeds.length}`,
              meta: "Beds Occupied",
              statusColor: room.status === 'FULL' ? "text-emerald-500" : "text-blue-500"
            };
          });
          break;
        }

        case "Residents": {
          const { data: tenantsData } = await supabase.from('tenants')
            .select('id, full_name, stay_type, move_in_date, status, pgs(name), rooms(room_number)')
            .neq('status', 'DELETED')
            .order('created_at', { ascending: false })
            .limit(10);

          details = tenantsData.map(t => ({
            name: t.full_name,
            subtitle: `${t.pgs?.name} • Room ${t.rooms?.room_number || 'N/A'}`,
            value: t.status,
            meta: `${t.stay_type} • Since ${new Date(t.move_in_date).toLocaleDateString()}`,
            statusColor: t.status === 'ACTIVE' ? "text-emerald-500" : "text-amber-500"
          }));
          break;
        }

        case "Active Beds":
        case "Available Beds": {
          const isAvail = title === "Available Beds";
          const { data: bedsData } = await supabase.from('beds')
            .select('id, bed_number, status, rooms(room_number, floor, pgs(name))')
            .eq('status', isAvail ? 'AVAILABLE' : 'OCCUPIED')
            .limit(15);

          details = bedsData.map(b => ({
            name: `Bed ${b.bed_number}`,
            subtitle: `${b.rooms?.pgs?.name} • R${b.rooms?.room_number}`,
            value: b.status,
            meta: `Floor ${b.rooms?.floor}`,
            statusColor: b.status === 'AVAILABLE' ? "text-emerald-500" : "text-blue-500"
          }));
          break;
        }

        case "Monthly Revenue": {
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const { data: paymentsData } = await supabase.from('payments')
            .select('amount, payment_date, tenants(full_name), type')
            .gte('payment_date', firstDay)
            .order('payment_date', { ascending: false })
            .limit(10);

          details = paymentsData.map(p => ({
            name: p.tenants?.full_name || "Guest",
            subtitle: `${new Date(p.payment_date).toLocaleDateString()} • ${p.type}`,
            value: `₹${Math.round(p.amount).toLocaleString()}`,
            meta: "This Month",
            statusColor: "text-emerald-500"
          }));
          break;
        }

        case "Pending Dues": {
          const { data: allTenants } = await supabase.from('tenants')
            .select('full_name, balance, stay_type, pgs(name), daily_stay_details(move_in_date, vacate_date, rent_per_day, paid_amount, maintenance_amount)')
            .eq('status', 'ACTIVE');
          
          details = (allTenants || [])
            .map(t => {
                const daily = Array.isArray(t.daily_stay_details) ? t.daily_stay_details[0] : t.daily_stay_details;
                let bal = 0;
                
                if (t.stay_type === 'DAILY' && daily) {
                    const start = new Date(daily.move_in_date);
                    const end = new Date(daily.vacate_date);
                    let diffDays = 1;
                    if (end > start) diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const totalRent = (diffDays * Number(daily.rent_per_day || 0)) + Number(daily.maintenance_amount || 0);
                    bal = Math.max(0, totalRent - Number(daily.paid_amount || 0));
                } else {
                    bal = t.balance || 0;
                }
                
                return {
                    name: t.full_name,
                    subtitle: `${t.pgs?.name || 'No PG'} • ${t.stay_type}`,
                    value: `₹${Math.round(bal).toLocaleString()}`,
                    meta: "Outstanding",
                    statusColor: "text-rose-500",
                    _bal: Math.round(bal)
                };
            })
            .filter(d => d._bal > 0)
            .sort((a, b) => b._bal - a._bal)
            .slice(0, 10);
          break;
        }

        case "Active Daily Stays": {
          const { data: dailyTenants } = await supabase.from('tenants')
            .select('id, full_name, move_in_date, vacate_date, pgs(name), daily_stay_details(total_rent)')
            .eq('stay_type', 'DAILY')
            .eq('status', 'ACTIVE')
            .limit(10);

          details = dailyTenants.map(t => {
            const start = new Date(t.move_in_date);
            const end = new Date(t.vacate_date);
            const days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
            return {
              name: t.full_name,
              subtitle: t.pgs?.name,
              value: `${days} Days`,
              meta: `Checkout: ${end.toLocaleDateString()}`,
              statusColor: "text-indigo-500"
            };
          });
          break;
        }

        case "Active Monthly Stays": {
          const { data: monthlyTenants } = await supabase.from('tenants')
            .select('full_name, move_in_date, pgs(name), rooms(room_number)')
            .eq('stay_type', 'MONTHLY')
            .eq('status', 'ACTIVE')
            .limit(10);

          details = monthlyTenants.map(t => ({
            name: t.full_name,
            subtitle: `${t.pgs?.name} • Room ${t.rooms?.room_number}`,
            value: "Monthly",
            meta: `Since ${new Date(t.move_in_date).toLocaleDateString()}`,
            statusColor: "text-blue-500"
          }));
          break;
        }

        default:
          details = [];
      }
      setPanelDetails(details);
    } catch (err) {
      console.error("Panel fetch error:", err);
    } finally {
      setIsPanelLoading(false);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      await fetchDashboardData(true);
      // Auto-sync dues on app refresh as requested
      try {
        await statsAPI.reconcileAllBalances();
        // Silently refresh data after reconciliation to show latest balances if changed
        fetchDashboardData(false);
      } catch (err) {
        console.warn("Auto-sync on refresh failed:", err);
      }
    };

    initFetch();

    // Subscribe to multiple tables for dashboard-wide dynamic updates
    const handleRealtime = (payload) => {
        console.log(`[Dashboard] Sync triggered by ${payload.table}:`, payload.eventType);
        // Extended delay to allow DB settlement and ensure expansion fetches latest
        setTimeout(() => {
            fetchDashboardData(false);
            if (activePanelId !== null) {
                // Find title of current active panel to refresh it
                const currentStat = statCards[activePanelId];
                if (currentStat) handleCardClick(activePanelId, currentStat.title);
            }
        }, 1500);
    };

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pgs' }, handleRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, handleRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, handleRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, handleRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, handleRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, handleRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, handleRealtime)
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') console.log("[Dashboard] Real-time monitoring active");
      });

    return () => { 
        supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  const revenueDisplay = useMemo(() => `₹${(stats.totalPayments || 0).toLocaleString('en-IN')}`, [stats.totalPayments]);
  const expensesDisplay = useMemo(() => `₹${(stats.totalExpenses || 0).toLocaleString('en-IN')}`, [stats.totalExpenses]);

  const handleExport = useCallback(() => {
    if (stats.totalPgs === 0 && stats.totalTenants === 0 && stats.totalRooms === 0) {
      setShowNoDataWarning(true);
    } else {
      setIsExportModalOpen(true);
    }
  }, [stats]);

  const statCards = useMemo(() => [
    { title: "Total PGs", value: stats.totalPgs, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { title: "Active Rooms", value: stats.activeRooms, icon: Bed, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { title: "Residents", value: stats.totalTenants, icon: Users, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { title: "Active Beds", value: stats.totalBeds - stats.maintenanceBeds, icon: Bed, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    { title: "Available Beds", value: Math.max(0, stats.totalBeds - stats.occupiedBeds - stats.maintenanceBeds), icon: Bed, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    { title: "Occupancy Rate", value: (stats.totalBeds - stats.maintenanceBeds) > 0 ? `${Math.round((stats.occupiedBeds / (stats.totalBeds - stats.maintenanceBeds)) * 100)}%` : "0%", icon: Layers, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20" },
    { title: "Monthly Revenue", value: revenueDisplay, icon: TrendingUp, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    { title: "All-time Revenue", value: `₹${(stats.allTimeRevenue || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { title: "Net Profit (Month)", value: `₹${(stats.netProfit || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { title: "Pending Dues", value: `₹${(stats.pendingDues || 0).toLocaleString('en-IN')}`, icon: CreditCard, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { title: "Active Daily Stays", value: stats.dailyActiveTenants, subValue: `${stats.dailyCheckouts} check-outs today`, icon: Clock, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    { title: "Active Monthly Stays", value: stats.monthlyActiveTenants, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  ], [stats, revenueDisplay, expensesDisplay]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12">
      <PageHeader
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || "Manager"}!`}
        subtitle="Here's a snapshot of your property empire today."
        icon={Sparkles}
        isDark={isDark}
        showTime
        actions={
          <>
            <ThemeToggle className="hidden md:flex" />
            <button 
              onClick={() => {
                  fetchDashboardData(true);
                  handleSyncAll();
              }}
              className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
              )}
            >
              {isSyncing ? <RotateCw size={16} className="animate-spin" /> : null}
              {isSyncing ? "Updating..." : "Refresh"}
            </button>
            <button 
              onClick={handleExport}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
            >
              Export Data
            </button>
          </>
        }
      />

      <StatCardGrid cols={6}>
        {statCards.map((stat, index) => {
          const isExpanded = activePanelId === index;
          const isDimmed = activePanelId !== null && !isExpanded;
          const isClickable = !["Occupancy Rate", "All-time Revenue", "Net Profit (Month)"].includes(stat.title);

          return (
            <StatCard 
              key={index} 
              {...stat} 
              isDark={isDark} 
              onClick={isClickable ? () => handleCardClick(index, stat.title) : undefined}
              isExpanded={isExpanded}
              isDimmed={isDimmed}
              loading={isPanelLoading && isExpanded}
              details={isExpanded ? panelDetails : null}
              onClose={() => setActivePanelId(null)}
            />
          );
        })}
      </StatCardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Daily Stay Tenants Review Card (New) */}
        <DailyStayCard 
            tenants={stats.recentDailyTenants} 
            onExpand={() => setIsDailyModalOpen(true)}
            isDark={isDark}
        />

        {/* Recent Residents */}
        <Card 
          title="Recent Residents"
          icon={Users}
          isDark={isDark}
          action={
            <a href="/tenants" className="text-xs text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1">
              View All <ArrowUpRight size={14} />
            </a>
          }
        >
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left min-w-[300px]">
              <thead>
                <tr className={cn(
                  "text-xs font-black tracking-wider uppercase",
                  isDark ? "bg-white/5 text-slate-400" : "bg-slate-200/60 border-b border-slate-300 text-slate-950"
                )}>
                  <th className="px-6 py-4 text-left">Resident</th>
                  <th className="px-6 py-4 text-left">Property</th>
                  <th className="px-6 py-4 text-left hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className={cn("text-xs font-bold", isDark ? "divide-y divide-white/5" : "divide-y divide-slate-100")}>
                {stats.recentResidents.length === 0 ? (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500 italic">No recent residents</td></tr>
                ) : stats.recentResidents.map((resident) => (
                  <tr key={resident.id} className={cn("transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                    <td className={cn("px-5 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>{resident.full_name}</td>
                    <td className="px-5 py-4">
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>{resident.pgs?.name || "N/A"}</span>
                    </td>
                    <td className={cn("px-5 py-4 hidden sm:table-cell", isDark ? "text-slate-400" : "text-slate-500")}>
                        {new Date(resident.move_in_date || resident.check_in_date || resident.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Payments */}
        <Card 
          title="Recent Payments"
          icon={CreditCard}
          isDark={isDark}
          action={
            <a href="/payments" className="text-xs text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1">
              View All <ArrowUpRight size={14} />
            </a>
          }
        >
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left min-w-[300px]">
              <thead>
                <tr className={cn(
                  "text-xs font-black tracking-wider uppercase",
                  isDark ? "bg-white/5 text-slate-400" : "bg-slate-200/60 border-b border-slate-300 text-slate-950"
                )}>
                  <th className="px-5 py-3 text-left">Resident</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-right hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className={cn("text-xs font-bold", isDark ? "divide-y divide-white/5" : "divide-y divide-slate-100")}>
                {stats.recentPayments.length === 0 ? (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500 italic">No recent payments</td></tr>
                ) : stats.recentPayments.map((payment) => (
                  <tr key={payment.id} className={cn("transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                    <td className={cn("px-5 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>{payment.tenant}</td>
                    <td className="px-5 py-4 text-emerald-500 font-bold">₹{payment.amount.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right hidden sm:table-cell">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                        (payment.status === "PAID" || payment.status === "COMPLETED") ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <DailyStayModal 
        isOpen={isDailyModalOpen} 
        onClose={() => setIsDailyModalOpen(false)}
        isDark={isDark}
      />

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        isDark={isDark}
        dashboardStats={stats}
      />

      {/* No Data Warning Card */}
      {showNoDataWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className={cn("fixed inset-0 transition-opacity backdrop-blur-sm", isDark ? "bg-slate-950/80" : "bg-slate-900/40")} 
                onClick={() => setShowNoDataWarning(false)}
            />
            
            <div className={cn(
                "relative max-w-sm w-full border rounded-[2rem] shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden",
                isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
            )}>
                <div className="p-8 flex flex-col items-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                        No Data Found
                    </h2>
                    <p className={cn("text-sm font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-500")}>
                        Your system database is currently empty. Please add properties, rooms, or residents before exporting a snapshot.
                    </p>
                    <button 
                        onClick={() => setShowNoDataWarning(false)}
                        className="mt-6 w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 font-bold tracking-wide uppercase text-sm rounded-2xl transition-all"
                    >
                        Understood
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};


export default Dashboard;
