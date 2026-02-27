import { useState, useEffect } from "react";
import { bedAPI, pgAPI, roomAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";
import { useCallback } from "react";
import { 
    Bed as BedIcon, Search, Filter, Home, Layers, 
    User, AlertCircle, Check, MoreVertical, Hammer,
    Trash2, RefreshCw, X, ChevronRight, Clock, Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ConfirmationModal from "../../components/ConfirmationModal";
import AlertModal from "../../components/AlertModal";
import Toast from "../../components/Toast";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const BedsManagement = ({ isDark, pgs, showArchived, filterPg, setFilterPg, searchTerm, setSearchTerm }) => {
    const [beds, setBeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [statusConfirm, setStatusConfirm] = useState({ isOpen: false, bed: null, newStatus: "", isLoading: false });
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchBeds = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const data = await bedAPI.getAll();
            setBeds(data || []);
        } catch (error) {
            console.error("Error fetching beds:", error);
            showToast("Failed to fetch beds", "error");
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBeds(true);

        const channel = supabase.channel('beds-page-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => fetchBeds(false))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchBeds(false))
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchBeds]);

    const handleStatusUpdate = (bed, newStatus, blocked = false, blockReason = "") => {
        const pgStatus = bed.rooms?.pgs?.status;
        if (pgStatus === "INACTIVE") {
            setStatusConfirm({
                isOpen: true,
                bed,
                newStatus,
                blocked: true,
                blockReason: "Cannot modify bed status for an archived property.",
                isLoading: false
            });
            return;
        }

        if (blocked) {
            setStatusConfirm({
                isOpen: true,
                bed,
                newStatus,
                blocked: true,
                blockReason,
                isLoading: false
            });
            return;
        }

        if (bed.status === "OCCUPIED" && newStatus !== "OCCUPIED") {
            setStatusConfirm({
                isOpen: true,
                bed,
                newStatus,
                blocked: true,
                blockReason: "Cannot move occupied bed to maintenance. Please vacate the tenant first.",
                isLoading: false
            });
            return;
        }

        setStatusConfirm({
            isOpen: true,
            bed,
            newStatus,
            blocked: false,
            isLoading: false
        });
    };

    const confirmStatusUpdate = async () => {
        const { bed, newStatus } = statusConfirm;
        setStatusConfirm(prev => ({ ...prev, isLoading: true }));
        try {
            await bedAPI.update(bed.id, { status: newStatus });
            showToast(`Bed status updated to ${newStatus}`);
            fetchBeds();
        } catch (error) {
            showToast(error.message || "Failed to update status", "error");
        } finally {
            setStatusConfirm({ isOpen: false, bed: null, newStatus: "", isLoading: false });
        }
    };

    const filteredBeds = beds.filter(bed => {
        const room = bed.rooms || {};
        const pg = room.pgs || {};
        const tenant = bed.tenants || {};

        const isArchived = pg.status === "INACTIVE" || 
                           pg.status === "DELETED" || 
                           pg.name?.includes(" (Archived - ");

        const matchesSearch = 
            bed.bed_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            room.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesPg = !filterPg || room.pg_id === filterPg;
        const matchesStatus = filterStatus === "ALL" || bed.status === filterStatus;

        if (showArchived) {
            return matchesSearch && matchesPg && matchesStatus && isArchived;
        }
        return matchesSearch && matchesPg && matchesStatus && !isArchived;
    });

    const relevantBeds = beds.filter(bed => {
        const room = bed.rooms || {};
        const pg = room.pgs || {};
        const isArchived = pg.status === "INACTIVE" || 
                           pg.status === "DELETED" || 
                           pg.name?.includes(" (Archived - ");
        const matchesPg = !filterPg || room.pg_id === filterPg;

        return matchesPg && (showArchived ? isArchived : !isArchived);
    });

    const stats = {
        total: relevantBeds.length,
        available: relevantBeds.filter(b => b.status === "AVAILABLE").length,
        occupied: relevantBeds.filter(b => b.status === "OCCUPIED").length,
        maintenance: relevantBeds.filter(b => b.status === "MAINTENANCE").length
    };

    if (loading && beds.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8">
            <Toast 
                isOpen={!!toast}
                message={toast?.message}
                type={toast?.type}
                onClose={() => setToast(null)}
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Beds", value: stats.total, icon: BedIcon, color: "blue", gradient: "from-blue-500/20 to-indigo-500/20" },
                    { label: "Available", value: stats.available, icon: Check, color: "emerald", gradient: "from-emerald-500/20 to-teal-500/20" },
                    { label: "Occupied", value: stats.occupied, icon: User, color: "rose", gradient: "from-rose-500/20 to-pink-500/20" },
                    { label: "Maintenance", value: stats.maintenance, icon: Hammer, color: "amber", gradient: "from-amber-500/20 to-orange-500/20" }
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className={cn(
                            "p-4 rounded-3xl border relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 group",
                            isDark ? "bg-slate-900/50 border-white/5" : "bg-white border-slate-200 shadow-sm"
                        )}
                    >
                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", stat.gradient)} />
                        <div className="relative z-10 flex items-center gap-4">
                            <div className={cn(
                                "h-12 w-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:rotate-12",
                                isDark ? `bg-${stat.color}-500/10 border-${stat.color}-500/20 text-${stat.color}-400` : `bg-${stat.color}-50 border-${stat.color}-100 text-${stat.color}-600`
                            )}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest leading-none mb-1 opacity-60", isDark ? "text-slate-400" : "text-slate-500")}>{stat.label}</p>
                                <p className={cn("text-2xl font-black", isDark ? "text-white" : "text-slate-900")}>{stat.value}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filter & Search Bar */}
            <div className={cn(
                "backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl border p-5",
                isDark ? "bg-slate-900/80 border-white/5" : "bg-white border-slate-200/60"
            )}>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-500" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search bed, room, property or tenant..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn(
                                "w-full border rounded-[1.5rem] py-4 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm",
                                isDark ? "bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                            )}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-slate-500" />
                            <select 
                                value={filterPg}
                                onChange={(e) => setFilterPg(e.target.value)}
                                className={cn(
                                    "border rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm min-w-[200px]",
                                    isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                                )}
                            >
                                <option value="">All Properties</option>
                                {pgs?.map(pg => (
                                    <option key={pg.id} value={pg.id}>
                                        {pg.name} {pg.status === 'INACTIVE' ? '(Archived)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className={cn(
                                "border rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm",
                                isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            )}
                        >
                            <option value="ALL">All Status</option>
                            <option value="AVAILABLE">Available</option>
                            <option value="OCCUPIED">Occupied</option>
                            <option value="MAINTENANCE">Maintenance</option>
                        </select>

                        {(filterPg || searchTerm || filterStatus !== "ALL") && (
                            <button 
                                onClick={() => { setFilterPg(""); setSearchTerm(""); setFilterStatus("ALL"); }}
                                className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                title="Clear All Filters"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                        <button 
                            onClick={fetchBeds}
                            className={cn(
                                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                                isDark ? "bg-white/5 text-slate-400 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                </div>
            </div>

            {/* Beds Grid Interface */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredBeds.map((bed, idx) => {
                        const room = bed.rooms || {};
                        const pg = room.pgs || {};
                        const tenantName = bed.tenants?.full_name;
                        const isUnderMaintenance = bed.status === "MAINTENANCE";

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                key={bed.id}
                                className={cn(
                                    "relative p-5 rounded-[2.5rem] border group transition-all duration-500 overflow-hidden",
                                    isDark 
                                        ? "bg-slate-900/40 border-white/5 hover:border-blue-500/20 hover:bg-slate-900/60" 
                                        : "bg-white border-slate-200 hover:border-blue-500/30 hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)]"
                                )}
                            >
                                {/* Hover Glow Effect */}
                                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />

                                <div className="relative z-10 space-y-5">
                                    {/* Header Section */}
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 group-hover:rotate-6",
                                            isDark ? "bg-slate-800 border-white/10 text-blue-400" : "bg-blue-50 border-blue-100/50 text-blue-600"
                                        )}>
                                            <BedIcon size={24} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className={cn("text-lg font-black tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
                                                    {bed.bed_number}
                                                </h3>
                                                <div className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest",
                                                    bed.status === "AVAILABLE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                    bed.status === "OCCUPIED" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                    "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                )}>
                                                    <div className={cn(
                                                        "h-1 w-1 rounded-full",
                                                        bed.status === "AVAILABLE" ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" :
                                                        bed.status === "OCCUPIED" ? "bg-blue-400" :
                                                        "bg-amber-500 animate-pulse"
                                                    )} />
                                                    {bed.status}
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-0.5 uppercase tracking-tighter">
                                                Room {room.room_number} <ChevronRight size={10} className="text-slate-600" /> {pg.name}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Detail Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={cn("p-3 rounded-2xl border transition-colors", isDark ? "bg-white/5 border-white/5 group-hover:bg-white/10" : "bg-slate-50 border-slate-100 group-hover:bg-slate-100/50")}>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 opacity-60">Floor</p>
                                            <p className={cn("text-xs font-black flex items-center gap-2", isDark ? "text-slate-200" : "text-slate-800")}>
                                                <Layers size={14} className="text-blue-500" /> {room.floor || 'G'}
                                            </p>
                                        </div>
                                        <div className={cn("p-3 rounded-2xl border transition-colors", isDark ? "bg-white/5 border-white/5 group-hover:bg-white/10" : "bg-slate-50 border-slate-100 group-hover:bg-slate-100/50")}>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 opacity-60">Resident</p>
                                            <p className={cn("text-xs font-black flex items-center gap-2 truncate", isDark ? "text-slate-200" : "text-slate-800")}>
                                                <User size={14} className={tenantName ? "text-emerald-500" : "text-slate-400"} /> 
                                                {tenantName || <span className="text-[9px] text-slate-400 italic">VACANT</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Section */}
                                    <div className="pt-1">
                                        {!isUnderMaintenance ? (
                                            <button 
                                                onClick={() => {
                                                    if (bed.status === "OCCUPIED") {
                                                        handleStatusUpdate(bed, "MAINTENANCE", true, "Cannot move occupied bed to maintenance. Please vacate the tenant first.");
                                                    } else {
                                                        handleStatusUpdate(bed, "MAINTENANCE");
                                                    }
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                                                    bed.status === "OCCUPIED"
                                                        ? "opacity-30 cursor-default bg-slate-500/10 text-slate-500"
                                                        : isDark 
                                                            ? "bg-white/5 text-slate-400 hover:bg-amber-500/10 hover:text-amber-500 border border-transparent hover:border-amber-500/20" 
                                                            : "bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-amber-600 border border-slate-100 hover:border-amber-200"
                                                )}
                                            >
                                                <Hammer size={14} /> Maintenance
                                            </button>
                                        ) : (
                                            <div className="h-[42px]" /> 
                                        )}
                                    </div>
                                </div>

                                {/* Maintenance Overlay */}
                                <AnimatePresence>
                                    {isUnderMaintenance && (
                                        <motion.div 
                                            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                                            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
                                            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                                            className="absolute inset-0 z-20 bg-amber-500/10 flex flex-col items-center justify-center p-4 text-center"
                                        >
                                            <motion.div
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="bg-slate-900/90 backdrop-blur-xl p-6 rounded-[2rem] border border-amber-500/30 shadow-2xl space-y-4 w-full"
                                            >
                                                <div className="h-12 w-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-amber-500/10">
                                                    <Hammer size={24} className="text-amber-500 animate-pulse" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-amber-500 font-black text-[10px] uppercase tracking-widest">
                                                        {room.status === "INACTIVE" ? "Unavailable Mode" : "Maintenance Mode"}
                                                    </h4>
                                                    <div className="py-2 px-3 bg-white/5 rounded-xl border border-white/5 mx-auto w-fit">
                                                        <p className="text-[10px] text-white font-black tracking-tight flex items-center gap-1.5">
                                                            <Building2 size={12} className="text-amber-500" /> {pg.name}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 flex items-center justify-center gap-2">
                                                            <span className="flex items-center gap-1"><Layers size={10} /> Floor {room.floor || 'G'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                                                            <span className="flex items-center gap-1"><Home size={10} /> Room {room.room_number}</span>
                                                        </p>
                                                    </div>
                                                    <p className="text-[8px] text-slate-500 font-black mt-2 uppercase tracking-tighter">
                                                        {room.status === "INACTIVE" 
                                                            ? "Beds are currently offline" 
                                                            : room.status === "MAINTENANCE" 
                                                                ? "Room itself is in maintenance" 
                                                                : "This bed is currently offline"}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        if (room.status === "MAINTENANCE" || room.status === "INACTIVE") {
                                                            const mode = room.status === "INACTIVE" ? "Unavailable Mode" : "Maintenance Mode";
                                                            handleStatusUpdate(bed, "AVAILABLE", true, `Cannot activate bed: Room is currently in ${mode}. Please make the room 'Active' first.`);
                                                        } else {
                                                            handleStatusUpdate(bed, "AVAILABLE");
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                                                        (room.status === "MAINTENANCE" || room.status === "INACTIVE")
                                                            ? "bg-slate-700 text-slate-400 cursor-default shadow-none"
                                                            : "bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/20"
                                                    )}
                                                >
                                                    {room.status === "INACTIVE" ? "Room Inactive" : (room.status === "MAINTENANCE" ? "Room In Maintenance" : "Bring Online")}
                                                </button>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {filteredBeds.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <div className="h-20 w-20 rounded-full bg-slate-500/10 flex items-center justify-center mb-6">
                        <BedIcon size={40} className="text-slate-500" />
                    </div>
                    <p className="text-lg font-bold">No Beds Found</p>
                    <p className="text-sm font-medium uppercase tracking-widest mt-1">Try adjusting your filters or search term</p>
                </div>
            )}

            {/* Blocked Action Modal */}
            <AlertModal 
                isOpen={statusConfirm.isOpen && statusConfirm.blocked}
                onClose={() => setStatusConfirm({ isOpen: false, bed: null, newStatus: "", isLoading: false, blocked: false })}
                title="Action Blocked"
                message={statusConfirm.blockReason}
                type="error"
            />

            <ConfirmationModal 
                isOpen={statusConfirm.isOpen && !statusConfirm.blocked}
                onClose={() => setStatusConfirm({ isOpen: false, bed: null, newStatus: "", isLoading: false, blocked: false })}
                onConfirm={confirmStatusUpdate}
                title={statusConfirm.newStatus === "MAINTENANCE" ? "Move to Maintenance?" : "Bring Online?"}
                message={statusConfirm.newStatus === "MAINTENANCE" 
                        ? `Are you sure you want to mark Bed ${statusConfirm.bed?.bed_number} in Room ${statusConfirm.bed?.rooms?.room_number} as under maintenance? This bed will not be available for new bookings.` 
                        : `Are you sure you want to mark Bed ${statusConfirm.bed?.bed_number} as available for residents?`}
                confirmText={statusConfirm.newStatus === "MAINTENANCE" ? "Move to Maintenance" : "Make Available"}
                cancelText="Cancel"
                isLoading={statusConfirm.isLoading}
                type={statusConfirm.newStatus === "MAINTENANCE" ? "warning" : "success"}
            />
        </div>
    );
};

export default BedsManagement;
