/**
 * StatCard Component
 * A reusable statistics display card with consistent styling
 * Used across Dashboard and other pages for displaying key metrics
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const StatCard = React.memo(({ 
  title, 
  value, 
  icon: Icon, 
  color = "text-blue-500", 
  bg = "bg-blue-500/10", 
  border = "border-blue-500/20",
  subValue,
  isDark,
  trend,
  onClick,
  isExpanded,
  isDimmed,
  loading,
  details,
  onClose
}) => {
  const isClickable = !!onClick && !isExpanded;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={cn(
        "p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden flex flex-col",
        isDark ? bg : "bg-white",
        isDark ? border : "border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.02)]",
        isClickable && "cursor-pointer hover:scale-[1.02] hover:shadow-xl",
        isExpanded && "col-span-2 md:col-span-3 lg:col-span-3 row-span-2 shadow-2xl z-20 scale-[1.02] border-blue-500/50",
        isDimmed && "opacity-40 grayscale-[0.5] scale-[0.98] pointer-events-none"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        {Icon && (
          <div className={cn("p-2 rounded-xl transition-colors", color, isDark ? "bg-white/5" : "bg-slate-50 group-hover:bg-white")}>
            <Icon size={20} />
          </div>
        )}
        
        {onClick && (
          <div className={cn(
            "p-1 rounded-lg transition-transform duration-300",
            isExpanded ? "rotate-180 bg-blue-500/10 text-blue-500" : "text-slate-400 group-hover:text-slate-600"
          )}>
            {isExpanded ? (
               <div onClick={(e) => { e.stopPropagation(); onClose(); }} className="cursor-pointer hover:bg-rose-500/20 rounded-md p-1 -m-1">
                 <Icon size={16} className="text-rose-500 rotate-45" /> {/* Close feel with rotated icon or just use X */}
                 <span className="sr-only">Close</span>
               </div>
            ) : (
              <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}
      </div>

      <div className="relative z-10 flex-1">
        <p className={cn("text-[10px] font-bold tracking-widest uppercase mb-1", isDark ? "text-slate-400" : "text-slate-500 group-hover:text-slate-600")}>
          {title}
        </p>
        <div className="flex items-center gap-2">
          <p className={cn("text-2xl font-black transition-all", isDark ? "text-white" : "text-slate-900 group-hover:text-blue-600")}>
            {value}
          </p>
          {trend && (
            <span className={cn(
              "text-xs font-bold px-1.5 py-0.5 rounded",
              trend > 0 ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
            )}>
              {trend > 0 ? "+" : ""}{trend}%
            </span>
          )}
        </div>
        {subValue && (
          <p className={cn("text-xs font-medium mt-1 uppercase tracking-tighter", isDark ? "text-slate-500" : "text-slate-400")}>
            {subValue}
          </p>
        )}
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
           {loading ? (
             <div className="flex items-center justify-center py-8">
               <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
             </div>
           ) : (
             <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
               {details && details.length > 0 ? (
                 details.map((item, idx) => (
                   <div key={idx} className={cn(
                     "flex items-center justify-between p-2 rounded-xl transition-colors",
                     isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
                   )}>
                     <div className="flex flex-col">
                       <span className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>{item.name}</span>
                       <span className="text-[10px] text-slate-500 font-medium">{item.subtitle}</span>
                     </div>
                     <div className="text-right">
                       <span className={cn("text-xs font-black", item.statusColor || (isDark ? "text-blue-400" : "text-blue-600"))}>{item.value}</span>
                       {item.meta && <div className="text-[9px] text-slate-400 mt-0.5">{item.meta}</div>}
                     </div>
                   </div>
                 ))
               ) : (
                 <p className="text-center py-4 text-xs text-slate-500 italic">No details available</p>
               )}
             </div>
           )}
           <div className="mt-4 flex justify-between items-center">
              <button 
                onClick={onClose}
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all",
                  isDark ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Close Panel
              </button>
              {details && details.length > 0 && (
                <Link 
                  to={itemPathMap[title] || "/"} 
                  className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  View Full Page <ArrowUpRight size={12} />
                </Link>
              )}
           </div>
        </div>
      )}

      {/* Subtle Background Icon for Light Mode */}
      {!isDark && !isExpanded && (
        <div className={cn("absolute -right-2 -bottom-2 opacity-[0.03] transition-transform group-hover:scale-110 duration-500", color)}>
          {Icon && <Icon size={80} />}
        </div>
      )}
    </div>
  );
});

const itemPathMap = {
  "Total PGs": "/pgs",
  "Active Rooms": "/rooms",
  "Residents": "/tenants",
  "Active Beds": "/rooms",
  "Available Beds": "/rooms",
  "Monthly Revenue": "/payments",
  "Pending Dues": "/tenants?status=ACTIVE", // or filter by dues
  "Active Daily Stays": "/tenants?stay_type=DAILY",
  "Active Monthly Stays": "/tenants?stay_type=MONTHLY"
};

StatCard.displayName = "StatCard";

export default StatCard;

/**
 * Pre-configured stat card variants for common use cases
 */
export const StatCardVariants = {
  pg: (props) => <StatCard {...props} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />,
  room: (props) => <StatCard {...props} color="text-emerald-500" bg="bg-emerald-500/10" border="border-emerald-500/20" />,
  tenant: (props) => <StatCard {...props} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20" />,
  bed: (props) => <StatCard {...props} color="text-indigo-500" bg="bg-indigo-500/10" border="border-indigo-500/20" />,
  revenue: (props) => <StatCard {...props} color="text-rose-500" bg="bg-rose-500/10" border="border-rose-500/20" />,
  expense: (props) => <StatCard {...props} color="text-orange-500" bg="bg-orange-500/10" border="border-orange-500/20" />,
  profit: (props) => <StatCard {...props} color="text-emerald-500" bg="bg-emerald-500/10" border="border-emerald-500/20" />,
  pending: (props) => <StatCard {...props} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20" />,
};
