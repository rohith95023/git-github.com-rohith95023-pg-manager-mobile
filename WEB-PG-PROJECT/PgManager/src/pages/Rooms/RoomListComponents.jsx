import React from "react";
import { DoorOpen, Building2, Layers, IndianRupee, Pencil, Trash2, AlertCircle } from "lucide-react";

function cn(...inputs) {
    return inputs.filter(Boolean).join(' ');
}

export const RoomListComponents = ({
    filteredRooms,
    pgs,
    isDark,
    getRoomConfig,
    handleStatusChange,
    handleEdit,
    handleDelete,
    resetForm,
    setShowModal,
    setFilterPg
}) => {
    return (
        <>
            <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={cn("border-b text-xs font-black uppercase tracking-wider", isDark ? "bg-white/5 border-white/10 text-slate-400" : "bg-slate-200/60 border-b border-slate-300 text-slate-950")}>
                                <th className="px-8 py-5">Room Information</th>
                                <th className="px-8 py-5">Hierarchy</th>
                                <th className="px-8 py-5">Financials</th>
                                <th className="px-8 py-5">Room Status</th>
                                <th className="px-8 py-5">Admin Status</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={cn("text-sm transition-all", isDark ? "divide-y divide-white/5" : "divide-y divide-slate-100")}>
                            {filteredRooms.map((room) => {
                                const currentOcc = room.current_occupancy || room.currentOccupancy || 0;
                                const computedStatus = room.status === 'MAINTENANCE' ? 'MAINTENANCE' : 
                                             room.status === 'INACTIVE' ? 'INACTIVE' :
                                             currentOcc >= room.capacity ? 'FULL' :
                                             currentOcc > 0 ? 'PARTIAL' : 'AVAILABLE';
                                
                                return (
                                <tr key={room.id} className={cn("transition-all group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className={cn("h-10 w-11 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110", isDark ? "bg-slate-800 border-white/10 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600")}>
                                                <DoorOpen size={20} />
                                            </div>
                                            <div>
                                                <p className={cn("font-bold text-base", isDark ? "text-white" : "text-slate-900")}>Room {room.room_number || room.roomNumber}</p>
                                                <p className="text-[10px] font-semibold text-slate-500">{getRoomConfig(room.room_type || room.roomType).label}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1 text-left">
                                            <span className={cn("flex items-center gap-2 text-sm font-black", isDark ? "text-slate-300" : "text-slate-900")}>
                                                <Building2 size={12} className="text-blue-600" /> {room.pgs?.name}
                                            </span>
                                            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <Layers size={10} /> Floor {room.floor || room.floor_number || room.floorNumber}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1 text-left">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Monthly Rent</span>
                                                <span className="text-emerald-600 font-bold text-base flex items-center gap-0.5">
                                                    <IndianRupee size={14} className="mt-0.5" /> {(room.rent || room.monthlyRent)?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex flex-col pt-1 border-t border-slate-100 dark:border-white/5">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Security Dep</span>
                                                <span className={cn("text-xs font-bold", isDark ? "text-slate-300" : "text-slate-700")}>
                                                    ₹{((room.deposit || room.securityDeposit) || (room.pgs?.security_deposit || 0)).toLocaleString()}
                                                    {(!(room.deposit || room.securityDeposit) && room.pgs?.security_deposit) && <span className="ml-1 text-[8px] opacity-40">(Default)</span>}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold border",
                                            computedStatus === "AVAILABLE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                            computedStatus === "PARTIAL" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                            computedStatus === "FULL" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                            "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                        )}>
                                            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", 
                                                computedStatus === "AVAILABLE" ? "bg-emerald-500" : 
                                                computedStatus === "PARTIAL" ? "bg-amber-600" :
                                                computedStatus === "FULL" ? "bg-rose-500" : "bg-blue-500"
                                            )} />
                                            {computedStatus}
                                            {' '}({currentOcc}/{room.capacity})
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <select
                                            value={['AVAILABLE', 'FULL', 'PARTIAL'].includes(room.status) ? 'ACTIVE' : room.status}
                                            onChange={(e) => handleStatusChange(room, e.target.value)}
                                            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none cursor-pointer transition-all", 
                                                ['AVAILABLE', 'FULL', 'PARTIAL'].includes(room.status) 
                                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                                    : room.status === 'MAINTENANCE'
                                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                        : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                            )}
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                            <option value="MAINTENANCE">Maintenance</option>
                                        </select>
                                    </td>
                                    <td className="px-8 py-5 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-3">
                                            <button 
                                                onClick={() => handleEdit(room)}
                                                className="p-2.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-lg shadow-blue-500/10"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(room.id)}
                                                className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-lg shadow-rose-500/10"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                            {filteredRooms.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <Building2 size={48} className="text-slate-500" />
                                            <div className="space-y-1">
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {pgs.length === 0 ? "No Properties Found" : "No Rooms Mapped Yet"}
                                                </p>
                                                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest leading-relaxed">
                                                    {pgs.length === 0 ? "Property setup required" : "Your inventory for this filter is empty"}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className={cn("md:hidden divide-y", isDark ? "divide-white/5" : "divide-slate-100")}>
                    {filteredRooms.map((room) => {
                        const currentOcc = room.current_occupancy || room.currentOccupancy || 0;
                        const computedStatus = room.status === 'MAINTENANCE' ? 'MAINTENANCE' : 
                                             room.status === 'INACTIVE' ? 'INACTIVE' :
                                             currentOcc >= room.capacity ? 'FULL' :
                                             currentOcc > 0 ? 'PARTIAL' : 'AVAILABLE';
                        return (
                        <div key={room.id} className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3 text-left">
                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", isDark ? "bg-slate-800 border-white/10 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600")}>
                                        <DoorOpen size={18} />
                                    </div>
                                    <div>
                                        <h3 className={cn("font-bold text-base", isDark ? "text-white" : "text-slate-900")}>Room {room.room_number || room.roomNumber}</h3>
                                        <p className="text-[11px] font-bold text-blue-500 uppercase">{getRoomConfig(room.room_type || room.roomType).label}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border",
                                        computedStatus === "AVAILABLE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                        computedStatus === "PARTIAL" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                        computedStatus === "FULL" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                        "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    )}>
                                        {computedStatus} ({currentOcc}/{room.capacity})
                                    </div>
                                    <select
                                        value={['AVAILABLE', 'FULL', 'PARTIAL'].includes(room.status) ? 'ACTIVE' : room.status}
                                        onChange={(e) => handleStatusChange(room, e.target.value)}
                                        className={cn("px-2 py-1 rounded-lg text-[10px] font-semibold border outline-none cursor-pointer", 
                                            ['AVAILABLE', 'FULL', 'PARTIAL'].includes(room.status) 
                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                                : room.status === 'MAINTENANCE'
                                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                        )}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <div className="space-y-1 text-left">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Financials</p>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex flex-col">
                                            <span className="text-emerald-500 font-bold text-sm flex items-center gap-0.5 leading-none">
                                                <IndianRupee size={10} /> {(room.rent || room.monthlyRent)?.toLocaleString()}
                                                <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Rent</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col pt-1 border-t border-slate-100 dark:border-white/5">
                                            <span className={cn("text-[10px] font-bold flex items-center gap-1", isDark ? "text-slate-300" : "text-slate-700")}>
                                                ₹{((room.deposit || room.securityDeposit) || (room.pgs?.security_deposit || 0)).toLocaleString()}
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">Dep</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Hierarchy</p>
                                    <div className="flex flex-col">
                                        <span className={cn("text-xs font-bold truncate", isDark ? "text-slate-200" : "text-slate-800")}>
                                            {room.pgs?.name}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60">Floor {room.floor || room.floor_number || room.floorNumber}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button onClick={() => handleEdit(room)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500/10 text-blue-400 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-blue-500/20 transition-all active:scale-95">
                                    <Pencil size={14} /> Edit
                                </button>
                                <button onClick={() => handleDelete(room.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-rose-500/20 transition-all active:scale-95">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                        );
                    })}
                    {filteredRooms.length === 0 && (
                        <div className="p-10 text-center space-y-4">
                            <div className="flex flex-col items-center gap-3 opacity-40">
                                <Building2 size={40} className="text-slate-500" />
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    No Rooms Found
                                </p>
                            </div>
                        </div>
                    )}
                </div>
        </>
    );
};
