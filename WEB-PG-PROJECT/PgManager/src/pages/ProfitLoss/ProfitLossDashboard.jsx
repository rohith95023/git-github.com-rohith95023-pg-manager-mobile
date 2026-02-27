import { useState, useEffect, useMemo } from "react";
import { pnlAPI, expenseAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from "recharts";
import { 
  TrendingUp, TrendingDown, IndianRupee, PieChart as PieIcon, 
  ArrowUpRight, ArrowDownRight, Filter, Calendar, Sun, Moon 
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "../../context/ThemeContext";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const ProfitLossDashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  
  const [summaryData, setSummaryData] = useState([]);
  const [rawCategoryData, setRawCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("all");

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('pnl-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        console.log("PnL update: Payment change detected");
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        console.log("PnL update: Expense change detected");
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, categoryRes] = await Promise.all([
        pnlAPI.getSummary(),
        pnlAPI.getCategoryStats(),
      ]);
      
      console.log("PnL Summary:", summaryRes);
      
      const parseMoney = (val) => {
        if (!val) return 0;
        // detailed cleanup: remove '₹', commas, spaces, etc.
        const clean = String(val).replace(/[^0-9.-]+/g, "");
        return Number(clean) || 0;
      };

      const sanitizedSummary = (summaryRes.data || []).map(item => ({
        ...item,
        total_revenue: parseMoney(item.total_revenue),
        total_expense: parseMoney(item.total_expense),
        net_profit: parseMoney(item.net_profit),
      }));

      setSummaryData(sanitizedSummary);
      
      if (categoryRes.data) {
        setRawCategoryData(categoryRes.data);
      }

    } catch (error) {
      console.error("Error fetching PnL data:", error);
    } finally {
      setLoading(false);
    }
  };

  const availableMonths = useMemo(() => {
    const months = new Set(summaryData.map(item => item.month));
    return Array.from(months).sort((a, b) => new Date(b) - new Date(a));
  }, [summaryData]);

  const filteredSummaryData = useMemo(() => {
    if (filterMonth === "all") return summaryData;
    return summaryData.filter(item => item.month === filterMonth);
  }, [summaryData, filterMonth]);

  const filteredCategoryData = useMemo(() => {
    const dataToFilter = rawCategoryData || [];
    const filtered = filterMonth === "all" 
      ? dataToFilter 
      : dataToFilter.filter(item => {
          if (!item.date && !item.created_at) return false;
          const d = new Date(item.date || item.created_at);
          if (isNaN(d.getTime())) return false;
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
          return monthKey === filterMonth;
        });

    const parseMoney = (val) => {
      if (!val) return 0;
      const clean = String(val).replace(/[^0-9.-]+/g, "");
      return Number(clean) || 0;
    };

    const catMap = filtered.reduce((acc, curr) => {
      const cat = curr.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + parseMoney(curr.amount);
      return acc;
    }, {});
    
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [rawCategoryData, filterMonth]);

  // derived stats
  const aggregateStats = useMemo(() => {
    return filteredSummaryData.reduce((acc, curr) => {
      acc.revenue += Number(curr.total_revenue) || 0;
      acc.expense += Number(curr.total_expense) || 0;
      acc.profit += Number(curr.net_profit) || 0;
      return acc;
    }, { revenue: 0, expense: 0, profit: 0 });
  }, [filteredSummaryData]);

  const profitMargin = aggregateStats.revenue ? ((aggregateStats.profit / aggregateStats.revenue) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3", isDark ? "text-white" : "text-slate-900")}>
            Profit & Loss Analysis <TrendingUp className="text-emerald-500" />
          </h1>
          <p className={cn("mt-1 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            Comprehensive financial breakdown and performance metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={toggleTheme}
            className={cn(
              "p-2.5 rounded-xl border backdrop-blur-md transition-all flex justify-center items-center hover:scale-105 active:scale-95",
              isDark ? "bg-slate-800/50 border-white/10 text-amber-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            )}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-md transition-all",
            isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-white border-slate-200 text-slate-700 shadow-sm"
          )}>
            <Calendar size={16} className="text-slate-500" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className={cn("bg-transparent border-none outline-none cursor-pointer", isDark ? "text-slate-300" : "text-slate-700")}
            >
              <option value="all" className={isDark ? "bg-slate-800 text-white" : "bg-white text-black"}>All Time</option>
              {availableMonths.map((m) => (
                <option key={m} value={m} className={isDark ? "bg-slate-800 text-white" : "bg-white text-black"}>
                  {new Date(m).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <div className={cn("p-4 rounded-2xl border backdrop-blur-md relative overflow-hidden", isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white border-slate-200 shadow-sm")}>
            <div className="flex items-center justify-between mb-3">
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-emerald-400" : "text-emerald-600")}>Total Revenue</span>
                <IndianRupee size={18} className="text-emerald-500" />
            </div>
            <div className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>
                ₹{aggregateStats.revenue.toLocaleString()}
            </div>
        </div>

        <div className={cn("p-4 rounded-2xl border backdrop-blur-md relative overflow-hidden", isDark ? "bg-rose-500/10 border-rose-500/20" : "bg-white border-slate-200 shadow-sm")}>
             <div className="flex items-center justify-between mb-3">
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-rose-400" : "text-rose-600")}>Total Expenses</span>
                <TrendingDown size={18} className="text-rose-500" />
            </div>
            <div className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>
                ₹{aggregateStats.expense.toLocaleString()}
            </div>
        </div>

        <div className={cn("p-4 rounded-2xl border backdrop-blur-md relative overflow-hidden", isDark ? "bg-blue-500/10 border-blue-500/20" : "bg-white border-slate-200 shadow-sm")}>
             <div className="flex items-center justify-between mb-3">
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-blue-400" : "text-blue-600")}>Net Profit</span>
                <PieIcon size={18} className="text-blue-500" />
            </div>
            <div className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>
                ₹{aggregateStats.profit.toLocaleString()}
            </div>
        </div>

         <div className={cn("p-4 rounded-2xl border backdrop-blur-md relative overflow-hidden", isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-white border-slate-200 shadow-sm")}>
             <div className="flex items-center justify-between mb-3">
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-amber-400" : "text-amber-600")}>Profit Margin</span>
                <ArrowUpRight size={18} className="text-amber-500" />
            </div>
            <div className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>
                {profitMargin}%
            </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className={cn("p-6 rounded-2xl border backdrop-blur-md", isDark ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
          <h3 className={cn("text-lg font-bold mb-6", isDark ? "text-white" : "text-slate-900")}>Monthly Performance</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredSummaryData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short'})} stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} />
                <YAxis 
                    stroke={isDark ? "#94a3b8" : "#64748b"} 
                    fontSize={12} 
                    tickFormatter={(val) => val === 0 ? "₹0" : `₹${(val/1000).toFixed(1)}k`} 
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#fff' : '#000' }}
                    formatter={(val) => `₹${Number(val).toLocaleString()}`}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Legend />
                <Bar dataKey="total_revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total_expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
         <div className={cn("p-6 rounded-2xl border backdrop-blur-md", isDark ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
          <h3 className={cn("text-lg font-bold mb-6", isDark ? "text-white" : "text-slate-900")}>Expense Distribution</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {filteredCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    
      {/* Detailed Table */}
      <div className={cn("rounded-2xl border overflow-hidden backdrop-blur-md", isDark ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("p-4 border-b", isDark ? "border-white/5" : "border-slate-100")}>
            <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className={cn("text-xs font-black uppercase tracking-wider", isDark ? "bg-white/5 text-slate-400" : "bg-slate-200/60 border-b border-slate-300 text-slate-950")}>
                    <tr>
                        <th className="px-6 py-4">Month</th>
                        <th className="px-6 py-4">Property</th>
                        <th className="px-6 py-4 text-right">Revenue</th>
                        <th className="px-6 py-4 text-right">Expenses</th>
                        <th className="px-6 py-4 text-right">Net Profit</th>
                    </tr>
                </thead>
                <tbody className={cn("text-sm font-bold divide-y", isDark ? "divide-white/5 text-slate-300" : "divide-slate-100 text-slate-900")}>
                    {filteredSummaryData.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center italic opacity-50">No data available</td></tr>
                    ) : (
                        filteredSummaryData.map((row, idx) => (
                            <tr key={idx} className={cn("transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{new Date(row.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</td>
                                <td className="px-6 py-4 font-bold text-blue-500">{row.pgs?.name || "Global / Unassigned"}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-500 text-base">₹{Number(row.total_revenue).toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-bold text-rose-500 text-base">₹{Number(row.total_expense).toLocaleString()}</td>
                                <td className={cn("px-6 py-4 text-right font-black text-lg underline decoration-2 underline-offset-4", row.net_profit >= 0 ? "text-blue-500 decoration-blue-500/30" : "text-red-500 decoration-red-500/30")}>
                                    ₹{Number(row.net_profit).toLocaleString()}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossDashboard;
