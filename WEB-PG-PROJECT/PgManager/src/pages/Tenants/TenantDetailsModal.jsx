import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, MapPin, X, Calendar, Building2, ChevronRight, CheckCircle2, Briefcase, Shield } from 'lucide-react';
import { SectionHeader, InfoPill, DocCard, FinanceRow } from './TenantFinderComponents';
import { cn } from '../../lib/utils'; // Adjust if wrong path

export const TenantDetailsModal = ({ selectedTenant, setSelectedTenant, isDark, syncMonthlyBalance }) => {
  if (!selectedTenant) return null;

  return createPortal(
        <AnimatePresence mode="wait">
          {selectedTenant && (
              <motion.div 
                  key="modal-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 transition-all"
                  onClick={() => setSelectedTenant(null)}
              >
                  <motion.div 
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.98, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                          "w-full max-w-5xl max-h-[95vh] overflow-hidden rounded-xl shadow-2xl relative border flex flex-col md:flex-row",
                          isDark ? "bg-[#0f172a] border-slate-700" : "bg-white border-slate-200"
                      )}
                      onClick={(e) => e.stopPropagation()}
                  >
                    {/* Left Side: Profile Identity Pane */}
                    <div className={cn(
                        "w-full md:w-[30%] flex flex-col items-center justify-start p-10 text-center shrink-0 border-r",
                        isDark ? "bg-[#1e293b] border-slate-700" : "bg-slate-50 border-slate-200"
                    )}>
                        <div className="w-full space-y-8">
                            <div className="relative inline-block">
                                <div className={cn(
                                    "h-32 w-32 rounded-2xl flex items-center justify-center border-2 border-slate-300 shadow-md mx-auto overflow-hidden",
                                    isDark ? "bg-slate-800 border-slate-600" : "bg-white"
                                )}>
                                    <User size={64} className={isDark ? "text-slate-400" : "text-slate-300"} />
                                </div>
                                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-lg bg-emerald-500 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-lg">
                                    <CheckCircle2 size={16} className="text-white" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h2 className={cn("text-2xl font-bold tracking-tight uppercase", isDark ? "text-white" : "text-slate-900")}>{selectedTenant.full_name}</h2>
                                    <div className={cn(
                                        "inline-block px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                        selectedTenant.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                                    )}>
                                        {selectedTenant.status}
                                    </div>
                                </div>

                                <div className="pt-6 space-y-4 text-left">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Property Assignment</p>
                                        <div className={cn("flex items-center gap-3 p-3 rounded-lg border", isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200")}>
                                            <Building2 size={16} className="text-blue-500 shrink-0" />
                                            <p className={cn("text-xs font-bold truncate", isDark ? "text-slate-200" : "text-slate-700")}>
                                                {selectedTenant.pgs?.name || "Unassigned"}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enrollment Date</p>
                                        <div className={cn("flex items-center gap-3 p-3 rounded-lg border", isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200")}>
                                            <Calendar size={16} className="text-blue-500 shrink-0" />
                                            <p className={cn("text-xs font-bold", isDark ? "text-slate-200" : "text-slate-700")}>
                                                {new Date(selectedTenant.move_in_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Information Matrix */}
                    <div className="flex-1 overflow-y-auto p-8 relative">
                        <button 
                            onClick={() => setSelectedTenant(null)}
                            className={cn(
                                "absolute top-6 right-8 p-2 rounded-lg transition-all border",
                                isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700" : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                            )}
                        >
                            <X size={18} />
                        </button>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10 mt-4">
                            {/* Matrix Column A */}
                            <div className="space-y-10">
                                <section>
                                    <SectionHeader title="Contact Directory" />
                                    <div className="grid grid-cols-1 gap-4 pt-4">
                                        <InfoPill icon={<Phone size={16} />} label="Registered Number" value={selectedTenant.phone} />
                                        <InfoPill icon={<Mail size={16} />} label="Email Address" value={selectedTenant.email} />
                                        <InfoPill icon={<Briefcase size={16} />} label="Monthly Occupation" value={selectedTenant.profession} />
                                        <InfoPill icon={<User size={16} />} label="Gender Identity" value={selectedTenant.gender} />
                                    </div>
                                </section>

                                <section>
                                    <SectionHeader title="Identity Credentials" />
                                    <div className="pt-4">
                                        <DocCard icon={<Shield size={16} />} label={selectedTenant.id_type || "Government ID"} value={selectedTenant.id_number} isDark={isDark} />
                                    </div>
                                </section>
                            </div>

                            {/* Matrix Column B */}
                            <div className="space-y-10">
                                <section>
                                    <SectionHeader title="Stay Allocation" />
                                    <div className="pt-4">
                                        <div className={cn(
                                            "p-6 rounded-xl border relative group overflow-hidden transition-all",
                                            isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"
                                        )}>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                                                    <MapPin size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Assigned Unit</p>
                                                    <h3 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>
                                                        Room {selectedTenant.rooms?.room_number || selectedTenant.rooms?.roomNumber || "000"}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className={cn("p-4 rounded-lg border", isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bed Slot</p>
                                                    <p className={cn("text-sm font-bold", isDark ? "text-blue-400" : "text-blue-600")}>{selectedTenant.beds?.bed_number || selectedTenant.beds?.bedNumber || "N/A"}</p>
                                                </div>
                                                <div className={cn("p-4 rounded-lg border", isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Floor Level</p>
                                                    <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{selectedTenant.rooms?.floor || selectedTenant.rooms?.floorNumber || "0"} Floor</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <SectionHeader title="Financial Status" />
                                    <div className={cn(
                                        "mt-4 border rounded-xl divide-y",
                                        isDark ? "border-slate-700 divide-slate-700 bg-slate-800/20" : "border-slate-200 divide-slate-200 bg-slate-50/30"
                                    )}>
                                        {selectedTenant.stay_type === "DAILY" && (
                                            <FinanceRow 
                                                label="Rent Per Day" 
                                                amount={(() => {
                                                    const daily = Array.isArray(selectedTenant.daily_stay_details) ? selectedTenant.daily_stay_details[0] : selectedTenant.daily_stay_details;
                                                    return daily?.rent_per_day || selectedTenant.rent_per_day || 0;
                                                })()} 
                                                isDark={isDark}
                                                sub="Daily Base Rate"
                                            />
                                        )}
                                        <FinanceRow 
                                            label={selectedTenant.stay_type === "DAILY" ? "Total Stay Rent" : "Monthly Rent"} 
                                            amount={(() => {
                                                if (selectedTenant.stay_type === "DAILY") {
                                                    const daily = Array.isArray(selectedTenant.daily_stay_details) ? selectedTenant.daily_stay_details[0] : selectedTenant.daily_stay_details;
                                                    const rpd = daily?.rent_per_day || selectedTenant.rent_per_day || 0;
                                                    const moveIn = daily?.move_in_date || selectedTenant.move_in_date;
                                                    const vacate = daily?.vacate_date || selectedTenant.vacate_date;
                                                    
                                                    if (!moveIn || !vacate) return daily?.total_rent || selectedTenant.total_rent || 0;
                                                    
                                                    const start = new Date(moveIn);
                                                    const end = new Date(vacate);
                                                    let days = 1;
                                                    if (end > start) days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                                                    return days * rpd;
                                                }
                                                return (selectedTenant.rent_per_month || selectedTenant.rooms?.rent || 0);
                                            })()} 
                                            isDark={isDark}
                                            sub={selectedTenant.stay_type === "DAILY" 
                                                ? "Projected stay total"
                                                : "Standard monthly lease"}
                                        />
                                        <FinanceRow 
                                            label="Balance Due" 
                                            amount={(() => {
                                                if (selectedTenant.stay_type === "DAILY") {
                                                    const daily = Array.isArray(selectedTenant.daily_stay_details) ? selectedTenant.daily_stay_details[0] : selectedTenant.daily_stay_details;
                                                    const moveIn = daily?.move_in_date || selectedTenant.move_in_date;
                                                    const vacate = daily?.vacate_date || selectedTenant.vacate_date;
                                                    if (moveIn && vacate) {
                                                        const start = new Date(moveIn);
                                                        const end = new Date(vacate);
                                                        let diffDays = 1;
                                                        if (end > start) diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                                                        const rentBase = diffDays * Number(daily?.rent_per_day || selectedTenant.rent_per_day || 0);
                                                        const maintBase = Number(daily?.maintenance_amount || selectedTenant.maintenance_amount || 0);
                                                        const totRent = rentBase + maintBase;
                                                        return Math.max(0, totRent - Number(daily?.paid_amount || 0));
                                                    }
                                                    return daily?.balance_amount || selectedTenant.balance_amount || 0;
                                                }
                                                return selectedTenant.balance || 0;
                                            })()} 
                                            isDark={isDark}
                                            action={
                                                selectedTenant.stay_type === "MONTHLY" && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            syncMonthlyBalance(selectedTenant);
                                                        }}
                                                        className="p-1 px-2 border rounded-md hover:bg-blue-500 hover:text-white border-blue-500/30 text-blue-500 transition-all text-[10px] font-bold uppercase"
                                                        title="Sync Balance"
                                                    >
                                                        Sync
                                                    </button>
                                                )
                                            }
                                            sub="Pending collection"
                                        />
                                        <FinanceRow 
                                            label="Maintenance Charge" 
                                            amount={
                                                selectedTenant.stay_type === "DAILY" 
                                                  ? (selectedTenant.daily_stay_details?.[0]?.maintenance_amount || selectedTenant.maintenance_amount || 0)
                                                  : (selectedTenant.maintenance_amount || 0)
                                            } 
                                            isDark={isDark}
                                            action={
                                                (() => {
                                                    const daily = Array.isArray(selectedTenant.daily_stay_details) ? selectedTenant.daily_stay_details[0] : selectedTenant.daily_stay_details;
                                                    const isPaid = selectedTenant.stay_type === 'DAILY' ? (daily?.maintenance_paid) : selectedTenant.maintenance_paid;
                                                    return isPaid && (
                                                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Paid</span>
                                                    );
                                                })()
                                            }
                                            sub="Property amenities fee"
                                        />
                                        <FinanceRow 
                                            label="Security Deposit" 
                                            amount={selectedTenant.security_deposit || selectedTenant.securityDeposit || selectedTenant.rooms?.securityDeposit || selectedTenant.rooms?.deposit} 
                                            isDark={isDark}
                                            sub="Refundable on checkout"
                                        />
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      );
};
