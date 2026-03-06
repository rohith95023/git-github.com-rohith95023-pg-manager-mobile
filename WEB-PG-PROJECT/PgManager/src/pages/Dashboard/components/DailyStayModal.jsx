
import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Search, Filter, Calendar, Clock, AlertCircle, 
    CheckCircle2, IndianRupee, ArrowUpRight, User, MoreVertical 
} from 'lucide-react';
import { tenantAPI } from '../../../services/api';
import { supabase } from '../../../lib/supabaseClient';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const DailyStayModal = ({ isOpen, onClose, isDark }) => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'ALL',
        search: '',
        dateRange: { start: '', end: '' }
    });

    useEffect(() => {
        if (isOpen) {
            fetchTenants();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, filters]);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const result = await tenantAPI.getDailyStayTenants(filters);
            // Handle both { data, count } and raw data array
            const data = result?.data || (Array.isArray(result) ? result : []);
            
            // Fetch real-time payments for these tenants to avoid trigger lag
            const tenantIds = (data || []).map(t => t.id);
            const { data: allPayments } = await supabase.from('payments')
                .select('tenant_id, amount, status')
                .in('tenant_id', tenantIds);
            
            const paidMap = {};
            (allPayments || []).forEach(p => {
                const s = (p.status || "").toUpperCase();
                if (s === 'PAID' || s === 'COMPLETED' || s === 'PAID_SUCCESS') {
                    paidMap[p.tenant_id] = (paidMap[p.tenant_id] || 0) + Number(p.amount || 0);
                }
            });

            // Map nested daily_stay_details to flat structure for UI compatibility
            const processed = (data || []).map(t => {
                const details = Array.isArray(t.daily_stay_details) ? t.daily_stay_details[0] : t.daily_stay_details;
                
                // Recalculate for UI consistency
                const start = new Date(details?.move_in_date || t.move_in_date || t.check_in_date || t.created_at);
                const end = new Date(details?.vacate_date || t.vacate_date);
                let days = 1;
                if (end > start) {
                    days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                }
                
                const rentPerDay = Number(details?.rent_per_day || t.rent_per_day || 0);
                const maintAmt = Number(details?.maintenance_amount || t.maintenance_amount || 0);
                const calcTotalRent = (days * rentPerDay) + maintAmt;
                
                // Use local real-time calculated sum
                const actualPaid = paidMap[t.id] || 0;
                const calcBalance = Math.max(0, calcTotalRent - actualPaid);

                return {
                    ...t,
                    move_in_date: details?.move_in_date || t.move_in_date || t.check_in_date || t.created_at,
                    vacate_date: details?.vacate_date || t.vacate_date,
                    total_rent: calcTotalRent,
                    balance_amount: calcBalance,
                    paid_amount: actualPaid, // Inject this for row rendering as well
                    daily_stay_details: details
                };
            });
            
            setTenants(processed);
        } catch (error) {
            console.error("Failed to fetch daily tenants:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setFilters(prev => ({ ...prev, search: e.target.value }));
    };

    const handleStatusFilter = (status) => {
        setFilters(prev => ({ ...prev, status }));
    };

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return {
            active: tenants.filter(t => t.status === 'ACTIVE').length,
            checkoutsToday: tenants.filter(t => t.vacate_date === today).length,
            overdue: tenants.filter(t => t.status === 'OVERDUE').length,
            revenue: tenants.reduce((sum, t) => sum + (Number(t.total_rent) || 0), 0)
        };
    }, [tenants]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={cn(
                "relative w-full max-w-6xl h-full sm:h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-500 scale-100 opacity-100",
                isDark ? "bg-slate-900/80 backdrop-blur-2xl border border-white/10" : "bg-white/90 backdrop-blur-xl border border-slate-200"
            )}>
                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between p-4 md:p-6 border-b shrink-0",
                    isDark ? "border-white/10 bg-slate-900/50" : "border-slate-200 bg-white/50"
                )}>
                    <div>
                        <h2 className={cn("text-xl md:text-2xl font-bold flex items-center gap-3", isDark ? "text-white" : "text-slate-900")}>
                            <Clock className="text-amber-500" /> Daily Stay Management
                        </h2>
                        <p className={cn("text-xs md:text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                            Manage short-term residents, track payments, and monitor checkouts.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className={cn(
                            "p-2 rounded-xl transition-colors",
                            isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                        )}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div className={cn(
                    "grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 p-4 md:p-6 shrink-0 border-b",
                    isDark ? "bg-slate-900/30 border-white/5" : "bg-slate-50/50 border-slate-100"
                )}>
                    <SummaryCard title="Active Stays" value={stats.active} icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-500/10" isDark={isDark} />
                    <SummaryCard title="Checkouts Today" value={stats.checkoutsToday} icon={Calendar} color="text-blue-500" bg="bg-blue-500/10" isDark={isDark} />
                    <SummaryCard title="Overdue" value={stats.overdue} icon={AlertCircle} color="text-rose-500" bg="bg-rose-500/10" isDark={isDark} />
                    <SummaryCard title="Total Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={IndianRupee} color="text-amber-500" bg="bg-amber-500/10" isDark={isDark} />
                </div>

                {/* Toolbar */}
                <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                        {['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED', 'OVERDUE'].map(status => (
                            <button
                                key={status}
                                onClick={() => handleStatusFilter(status)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap",
                                    filters.status === status 
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                                        : (isDark ? "bg-white/5 text-slate-400 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                                )}
                            >
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl border w-full sm:w-80",
                        isDark ? "bg-slate-800 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}>
                        <Search size={18} className="text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name, phone..." 
                            className="bg-transparent border-none outline-none w-full text-sm placeholder:text-slate-500"
                            value={filters.search}
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div className="flex-1 overflow-auto p-4 md:p-6 pt-0">
                    <div className={cn(
                        "rounded-2xl border overflow-hidden",
                        isDark ? "border-white/10 bg-slate-800/20" : "border-slate-200 bg-white"
                    )}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={cn(
                                    "text-xs font-bold uppercase tracking-wider",
                                    isDark ? "bg-white/5 text-slate-400 border-b border-white/5" : "bg-slate-50 text-slate-500 border-b border-slate-200"
                                )}>
                                    <th className="px-6 py-4">Resident</th>
                                    <th className="px-6 py-4">Room / Bed</th>
                                    <th className="px-6 py-4">Timeline</th>
                                    <th className="px-6 py-4 text-center">Progress</th>
                                    <th className="px-6 py-4 text-right">Financials</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={cn("text-xs font-semibold", isDark ? "divide-y divide-white/5" : "divide-y divide-slate-100")}>
                                {loading ? (
                                    <tr><td colSpan={6} className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent mx-auto"/></td></tr>
                                ) : tenants.length === 0 ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-500 italic">No daily stay tenants found matching your filters.</td></tr>
                                ) : tenants.map((tenant) => {
                                    const start = new Date(tenant.move_in_date);
                                    const end = new Date(tenant.vacate_date);
                                    let days = 1;
                                    if (end > start) {
                                        days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                    }
                                    const progress = Math.min(100, Math.max(0, ((new Date().getTime() - start.getTime()) / (end.getTime() - start.getTime() || 1)) * 100));
                                    
                                    // Use calculated total rent for UI consistency if DB value seems dated
                                    const calcTotalRent = (days * Number(tenant.daily_stay_details?.rent_per_day || tenant.rent_per_day || 0)) + Number(tenant.daily_stay_details?.maintenance_amount || tenant.maintenance_amount || 0);
                                    const displayTotalRent = Math.max(Number(tenant.total_rent || 0), calcTotalRent);
                                    // Use the flat paid_amount (which we injected as the real-time sum)
                                    const displayBalance = Math.max(0, displayTotalRent - Number(tenant.paid_amount || 0));

                                    return (
                                        <tr key={tenant.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700")}>
                                                        {tenant.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{tenant.full_name}</div>
                                                        <div className="text-[10px] text-slate-500">{tenant.phone}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={cn("text-xs font-medium", isDark ? "text-slate-300" : "text-slate-700")}>
                                                    {tenant.rooms?.room_number || tenant.rooms?.roomNumber || "N/A"} <span className="text-slate-400 mx-1">•</span> {tenant.beds?.bed_number || tenant.beds?.bedNumber || "N/A"}
                                                </div>
                                                <div className="text-[10px] text-slate-500">{tenant.pgs?.name || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={cn("text-xs", isDark ? "text-slate-300" : "text-slate-700")}>
                                                        {formatDate(tenant.move_in_date)} → {formatDate(tenant.vacate_date)}
                                                    </span>
                                                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded w-fit">
                                                        {days} Days Total
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <div className="w-24 mx-auto">
                                                    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                                                        <div 
                                                            className={cn("h-full rounded-full transition-all duration-500", 
                                                                progress >= 100 ? "bg-emerald-500" : "bg-blue-500"
                                                            )} 
                                                            style={{ width: `${progress}%` }} 
                                                        />
                                                    </div>
                                                    <div className="text-[10px] text-center mt-1 text-slate-500">{Math.round(progress)}%</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-bold text-emerald-500">₹{displayTotalRent.toLocaleString()}</div>
                                                {displayBalance > 0 ? (
                                                    <div className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded inline-block mt-1">
                                                        Due: ₹{displayBalance.toLocaleString()}
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-emerald-600 flex items-center justify-end gap-1 mt-1">
                                                        <CheckCircle2 size={10} /> Paid
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button className={cn(
                                                    "p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100",
                                                    isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                                                )}>
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ title, value, icon: Icon, color, bg, isDark }) => (
    <div className={cn(
        "p-4 rounded-xl border flex items-center gap-4 transition-all",
        isDark ? "bg-slate-800/50 border-white/5" : "bg-white border-slate-200"
    )}>
        <div className={cn("p-2.5 rounded-lg", bg, color)}>
            <Icon size={20} />
        </div>
        <div>
            <p className={cn("text-[10px] uppercase font-bold tracking-wider mb-0.5", isDark ? "text-slate-500" : "text-slate-400")}>{title}</p>
            <p className={cn("text-xl font-black", isDark ? "text-white" : "text-slate-900")}>{value}</p>
        </div>
    </div>
);

const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default DailyStayModal;
