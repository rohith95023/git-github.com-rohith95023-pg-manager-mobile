
import React from 'react';
import { Clock, ArrowUpRight } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const DailyStayCard = ({ tenants = [], paidMap = {}, onExpand, isDark }) => {
  return (
    <div className={cn(
      "backdrop-blur-md rounded-2xl overflow-hidden shadow-xl transition-colors duration-300 h-full flex flex-col",
      isDark ? "bg-slate-900/50 border border-white/10" : "bg-white border border-slate-200"
    )}>
      <div className={cn(
        "p-4 md:p-5 flex items-center justify-between shrink-0",
        isDark ? "border-b border-white/5" : "border-b border-slate-100"
      )}>
        <h2 className={cn("text-base md:text-lg font-semibold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
          <Clock size={18} className="text-amber-500" /> Daily Stay Tenants
        </h2>
        <button 
            onClick={onExpand}
            className="text-xs text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1 font-medium"
        >
          View All <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-hidden flex-1">
        <table className="w-full text-left min-w-[300px]">
          <tbody>
            {tenants.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500 italic text-xs">No active daily stays</td></tr>
            ) : tenants.map((tenant) => (
              <tr 
                key={tenant.id} 
                className={cn(
                    "transition-colors cursor-pointer border-b last:border-0",
                    isDark ? "hover:bg-white/5 border-white/5" : "hover:bg-slate-50 border-slate-100"
                )} 
                onClick={onExpand}
              >
                <td className={cn("px-5 py-3 font-medium text-xs", isDark ? "text-white" : "text-slate-900")}>
                    <div className="flex flex-col">
                        <span>{tenant.full_name}</span>
                        <span className={cn("text-[10px]", isDark ? "text-slate-500" : "text-slate-400")}>
                            {new Date(tenant.move_in_date).toLocaleDateString([], { day: 'numeric', month: 'short' })} - {new Date(tenant.vacate_date).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                        tenant.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        tenant.status === 'UPCOMING' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        tenant.status === 'OVERDUE' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        "bg-slate-500/10 text-slate-500 border-slate-500/20"
                      )}>
                        {tenant.status}
                      </span>
                      {(() => {
                           const tId = tenant.tenant_id || tenant.tenants?.id;
                           const actualPaid = paidMap[tId] || 0;
                           const start = new Date(tenant.move_in_date);
                           const end = new Date(tenant.vacate_date);
                           let diffDays = 1;
                           if (end > start) diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                           
                           const rpd = Number(tenant.rent_per_day || 0);
                           const maint = Number(tenant.maintenance_amount || 0);
                           const totalExpected = (diffDays * rpd) + maint;
                           const due = Math.max(0, totalExpected - actualPaid);
                           
                           return due > 0 ? (
                               <span className="text-[10px] text-rose-500 font-medium">₹{due.toLocaleString('en-IN')} Due</span>
                           ) : null;
                       })()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyStayCard;
