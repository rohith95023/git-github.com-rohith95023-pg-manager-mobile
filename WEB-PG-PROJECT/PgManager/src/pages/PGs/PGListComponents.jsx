import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, User, Layers, TrendingUp, CreditCard, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const PGDesktopTable = ({
  displayPgs, expandedPgId, setExpandedPgId, isDark, showArchived,
  handleRestore, handleEdit, handleDelete, handleStatusChange,
  resetForm, setCurrentStep, setShowModal
}) => {
  return (
    <>
      {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={cn(
                  "border-b text-[13px] font-semibold uppercase tracking-[0.2em]",
                  isDark ? "bg-white/5 border-white/10" : "bg-slate-200/60 border-b border-slate-300"
                )}
                style={{ color: "var(--text-secondary)" }}
              >
                <th className="px-8 py-4">Property</th>
                <th className="px-8 py-4">Location</th>
                <th className="px-8 py-4 text-center">Rooms (T/A)</th>
                <th className="px-8 py-4 text-center">Occupancy</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("text-sm font-bold", isDark ? "divide-y divide-white/5" : "divide-y divide-slate-100")}>
              {displayPgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
                        <div className={cn("h-20 w-20 rounded-[2.5rem] flex items-center justify-center border-2 border-dashed transition-all duration-500", isDark ? "bg-slate-800/50 border-white/10 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-400")}>
                            <Building2 size={40} strokeWidth={1} />
                        </div>
                        <div className="space-y-2">
                            <h3 className={cn("text-lg font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                                No Properties Yet
                            </h3>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                Create your first PG property to start tracking rooms, residents, and real-time occupancy.
                            </p>
                        </div>
                        <button 
                            onClick={() => { resetForm(); setCurrentStep(1); setShowModal(true); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                        >
                            + Start Building
                        </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayPgs.map((pg) => {
                  const isExpanded = expandedPgId === pg.id;
                  
                  return (
                    <React.Fragment key={pg.id}>
                      <tr 
                        onClick={() => setExpandedPgId(isExpanded ? null : pg.id)}
                        className={cn(
                          "transition-all group border-b cursor-pointer", 
                          isDark ? "hover:bg-white/5 border-white/5" : "hover:bg-slate-50 border-slate-100",
                          isExpanded && (isDark ? "bg-white/[0.03]" : "bg-blue-50/30")
                        )}
                      >
                        {/* Property Identity */}
                        <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm", 
                                    isDark ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-blue-600 text-white shadow-blue-600/20"
                                )}>
                                    <Building2 size={24} />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-base font-black truncate max-w-[180px]", isDark ? "text-white" : "text-slate-900")}>
                                            {pg.name}
                                        </span>
                                        <div className={cn(
                                            "transition-transform duration-300",
                                            isExpanded ? "rotate-180" : "rotate-0"
                                        )}>
                                            <ChevronDown size={14} className="text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider rounded-md">
                                            {pg.gender_type || pg.genderType}
                                        </span>
                                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-md">
                                            {pg.total_floors || pg.totalFloors || 0} Floors
                                        </span>
                                        <div className="flex items-center gap-2 ml-1 opacity-60">
                                            <div className="flex items-center gap-0.5 text-[10px] text-slate-500" title="Active Residents">
                                                <User size={10} /> {pg.analytics?.residentsCount || 0}
                                            </div>
                                            <div className="flex items-center gap-0.5 text-[10px] text-slate-500" title="Occupied Beds">
                                                <Layers size={10} /> {pg.analytics?.occupiedBeds || 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </td>

                        {/* Location */}
                        <td className="px-8 py-6">
                            <div className="flex flex-col">
                                <span className={cn("text-xs font-black flex items-center gap-1.5 mb-1", isDark ? "text-white" : "text-slate-900")}>
                                    📍 {pg.city}, {pg.state}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight truncate max-w-[200px]">
                                    {pg.address}
                                </span>
                            </div>
                        </td>

                        {/* Rooms (Total / Available) */}
                        <td className="px-8 py-6 text-center">
                            <div className="inline-flex flex-col items-center gap-2">
                                <div className={cn(
                                    "flex items-center rounded-xl p-1 px-2 border transition-all",
                                    isDark ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200"
                                )}>
                                    <div className="flex flex-col items-center min-w-[32px] px-1">
                                        <span className={cn("text-sm font-black", isDark ? "text-white" : "text-slate-900")}>
                                            {pg.computedRooms}
                                        </span>
                                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest leading-none mt-0.5">Total</span>
                                    </div>
                                    <div className="w-px h-6 bg-slate-300/50 dark:bg-white/10 mx-1" />
                                    <div className="flex flex-col items-center min-w-[32px] px-1">
                                        <span className={cn(
                                            "text-sm font-black",
                                            pg.computedAvailable === 0 ? "text-rose-500" : 
                                            pg.computedAvailable <= 3 ? "text-amber-500" : "text-emerald-500"
                                        )}>
                                            {pg.computedAvailable}
                                        </span>
                                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest leading-none mt-0.5">Avail</span>
                                    </div>
                                </div>
                                
                                {/* Refined Capacity Indicators */}
                                <div className="flex gap-0.5">
                                    {[...Array(Math.min(pg.computedRooms, 10))].map((_, i) => (
                                        <div key={i} className={cn(
                                            "h-1 w-1.5 rounded-full transition-all",
                                            i < (pg.computedRooms - pg.computedAvailable) 
                                                ? "bg-blue-500" 
                                                : isDark ? "bg-white/10" : "bg-slate-200"
                                        )} />
                                    ))}
                                    {pg.computedRooms > 10 && <span className="text-[8px] text-slate-400 font-bold leading-none">+</span>}
                                </div>
                            </div>
                        </td>

                        {/* Occupancy Indicator */}
                        <td className="px-8 py-6">
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2 w-full max-w-[80px]">
                                    <div className="h-1.5 flex-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className={cn(
                                                "h-full transition-all duration-500",
                                                pg.occupancy > 80 ? "bg-emerald-500" : 
                                                pg.occupancy > 50 ? "bg-blue-500" : "bg-amber-500"
                                            )}
                                            style={{ width: `${pg.occupancy}%` }}
                                        />
                                    </div>
                                    <span className={cn("text-xs font-black", pg.occupancy > 80 ? "text-emerald-500" : pg.occupancy > 50 ? "text-blue-500" : "text-amber-500")}>
                                        {pg.occupancy}%
                                    </span>
                                </div>
                            </div>
                        </td>

                        {/* Status Dropdown */}
                        <td className="px-8 py-6">
                             <div className="relative inline-flex items-center">
                                <select
                                    value={pg.status || "ACTIVE"}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(pg, e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={cn(
                                        "pl-5 pr-8 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all appearance-none",
                                        pg.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                        pg.status === 'MAINTENANCE' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                        "bg-slate-500/10 text-slate-600 border-slate-500/20"
                                    )}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                </select>
                                <div className={cn(
                                    "absolute left-2 w-1.5 h-1.5 rounded-full",
                                    pg.status === 'ACTIVE' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                    pg.status === 'MAINTENANCE' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                                    "bg-slate-500"
                                )} />
                                <ChevronDown size={10} className="absolute right-2 text-current opacity-60 pointer-events-none" />
                             </div>
                        </td>

                        {/* Actions */}
                        <td className="px-8 py-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                                {showArchived && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRestore(pg.id); }}
                                        className={cn("p-2 rounded-lg transition-all", isDark ? "hover:bg-blue-500/10 text-blue-500" : "hover:bg-blue-50 text-blue-600")}
                                        title="Restore Property"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleEdit(pg); }}
                                    className={cn("p-2 rounded-lg transition-all", isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-600")}
                                >
                                    <Pencil size={18} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(pg.id); }}
                                    className={cn("p-2 rounded-lg transition-all", isDark ? "hover:bg-rose-500/10 text-rose-500" : "hover:bg-rose-50 text-rose-600")}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </td>
                      </tr>

                      {/* Expansion Row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <td colSpan={6} className="px-8 pt-4 pb-8">
                                <div className={cn(
                                    "p-6 rounded-2xl flex flex-col md:flex-row gap-6 border border-dashed",
                                    isDark ? "bg-blue-500/[0.02] border-blue-500/20" : "bg-blue-50/20 border-blue-200"
                                )}>
                                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <TrendingUp size={12} className="text-emerald-500" /> Monthly Revenue
                                            </p>
                                            <p className={cn("text-xl font-black", isDark ? "text-white" : "text-slate-900")}>
                                                ₹{(pg.analytics?.currentMonthRevenue || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <CreditCard size={12} className="text-amber-500" /> Pending Dues
                                            </p>
                                            <p className={cn("text-xl font-black", pg.analytics?.pendingDues > 0 ? "text-rose-500" : isDark ? "text-white" : "text-slate-900")}>
                                                ₹{(pg.analytics?.pendingDues || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <User size={12} className="text-blue-500" /> Active Residents
                                            </p>
                                            <p className={cn("text-xl font-black", isDark ? "text-white" : "text-slate-900")}>
                                                {pg.analytics?.residentsCount || 0}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <Layers size={12} className="text-indigo-500" /> Bed Utilization
                                            </p>
                                            <p className={cn("text-xl font-black", isDark ? "text-white" : "text-slate-900")}>
                                                {pg.analytics?.occupiedBeds} / {pg.analytics?.totalBeds}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 md:border-l border-slate-200 dark:border-white/10 md:pl-6 shrink-0">
                                        <a 
                                          href={`/rooms?pg=${pg.id}`}
                                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
                                        >
                                          View Inventory
                                        </a>
                                        <a 
                                          href={`/tenants?pg=${pg.id}`}
                                          className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                            isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                          )}
                                        >
                                          Manage Residents
                                        </a>
                                    </div>
                                </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        
    </>
  );
};

export const PGMobileList = ({
  displayPgs, expandedPgId, setExpandedPgId, isDark, showArchived,
  handleRestore, handleEdit, handleDelete, handleStatusChange,
  resetForm, setCurrentStep, setShowModal
}) => {
  return (
    <>
      {/* Mobile View */}
        <div className={cn("md:hidden divide-y", isDark ? "divide-white/5" : "divide-slate-100")}>
          {displayPgs.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center gap-4">
                <Building2 size={48} className="opacity-20" />
                <p className="text-sm font-bold text-slate-500">No properties built yet.</p>
                <button 
                    onClick={() => { resetForm(); setCurrentStep(1); setShowModal(true); }}
                    className="text-xs font-black uppercase text-blue-500"
                >
                    + Create One
                </button>
             </div>
          ) : (
            displayPgs.map((pg) => {
              const isExpanded = expandedPgId === pg.id;
              return (
                <div key={pg.id} className={cn("transition-all", isExpanded && (isDark ? "bg-white/[0.03]" : "bg-blue-50/20"))}>
                  <div 
                    onClick={() => setExpandedPgId(isExpanded ? null : pg.id)}
                    className="p-6 space-y-6 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4 text-left">
                          <div className={cn(
                             "h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform",
                             isExpanded && "scale-90 rotate-3",
                             isDark ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" : "bg-blue-600 shadow-blue-600/20"
                          )}>
                            <Building2 size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                                <h3 className={cn("font-black text-lg truncate max-w-[150px]", isDark ? "text-white" : "text-slate-900")}>{pg.name}</h3>
                                <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">📍 {pg.city} • {pg.gender_type || pg.genderType}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className={cn(
                                "h-1.5 w-12 rounded-full overflow-hidden",
                                isDark ? "bg-white/10" : "bg-slate-200"
                            )}>
                                <div 
                                    className={cn(
                                        "h-full",
                                        pg.occupancy > 80 ? "bg-emerald-500" : pg.occupancy > 50 ? "bg-blue-500" : "bg-amber-500"
                                    )}
                                    style={{ width: `${pg.occupancy}%` }}
                                />
                            </div>
                            <span className={cn("text-[10px] font-black", pg.occupancy > 80 ? "text-emerald-500" : pg.occupancy > 50 ? "text-blue-500" : "text-amber-500")}>
                                {pg.occupancy}% OCC
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={cn("p-3 rounded-xl flex flex-col gap-1 border", isDark ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm")}>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Rooms</p>
                          <p className={cn("text-xl font-black", isDark ? "text-white" : "text-slate-900")}>{pg.computedRooms}</p>
                        </div>
                        <div className={cn("p-3 rounded-xl flex flex-col gap-1 border", isDark ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm")}>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available</p>
                          <p className={cn("text-xl font-black", pg.computedAvailable > 0 ? "text-emerald-500" : "text-rose-500")}>{pg.computedAvailable}</p>
                        </div>
                    </div>

                    <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-6 pt-4 border-t border-dashed border-slate-200 dark:border-white/10"
                          >
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Revenue (Month)</p>
                                    <p className={cn("text-base font-black", isDark ? "text-white" : "text-slate-900")}>₹{(pg.analytics?.currentMonthRevenue || 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pending Dues</p>
                                    <p className={cn("text-base font-black text-rose-500")}>₹{(pg.analytics?.pendingDues || 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Residents</p>
                                    <p className={cn("text-base font-black", isDark ? "text-white" : "text-slate-900")}>{pg.analytics?.residentsCount}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Beds (O/T)</p>
                                    <p className={cn("text-base font-black", isDark ? "text-white" : "text-slate-900")}>{pg.analytics?.occupiedBeds} / {pg.analytics?.totalBeds}</p>
                                </div>
                             </div>

                             <div className="flex gap-2">
                                {showArchived && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRestore(pg.id); }} 
                                        className="flex-1 py-2.5 bg-blue-600/10 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw size={14} /> Restore
                                    </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handleEdit(pg); }} className="flex-1 py-2.5 bg-slate-600/10 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-500/20">
                                  Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(pg.id); }} className="flex-1 py-2.5 bg-rose-600/10 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                                  Delete
                                </button>
                             </div>
                             
                             <div className="flex flex-col gap-2">
                                <a href={`/rooms?pg=${pg.id}`} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg shadow-blue-600/20">
                                    Full Inventory
                                </a>
                                <div className="flex items-center justify-between px-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Update Status</span>
                                    <select
                                        value={pg.status || "ACTIVE"}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange(pg, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className={cn(
                                            "bg-transparent text-[10px] font-black uppercase outline-none text-right",
                                            pg.status === 'ACTIVE' ? "text-emerald-500" : "text-amber-500"
                                        )}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                    </select>
                                </div>
                             </div>
                          </motion.div>
                        )}
      {/* Mobile View */}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })
          )}
        </div>
    </>
  );
};
