import { DoorOpen, Building2, Bed as BedIcon, X } from "lucide-react";
import AmountInput from "../../components/AmountInput";

const RoomFormModal = ({
    showModal,
    setShowModal,
    isDark,
    formData,
    formErrors,
    handleInputChange,
    handleSubmit,
    isSubmitting,
    editingRoom,
    pgs,
    floorOptions,
    setHighlightPg,
    setHighlightFloor,
    highlightPg,
    highlightFloor,
    getRoomConfig,
    handlePGSelection
}) => {
    // The cn helper from local
    const cn = (...inputs) => inputs.filter(Boolean).join(' ');

    return (
        <>
            {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className={cn("fixed inset-0 backdrop-blur-md transition-opacity", isDark ? "bg-slate-950/80" : "bg-black/40")} />
          <div className={cn("relative w-full max-w-2xl border rounded-[2rem] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] overflow-hidden", "bg-[var(--bg-surface)] border-[var(--border-soft)]")}>
           <div className={cn("p-4 border-b flex items-center justify-between shrink-0", "border-[var(--border-soft)] bg-[var(--bg-surface)] rounded-t-[2rem]")}>
               <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-600 border border-violet-500/20 shadow-sm">
                       <DoorOpen size={20} strokeWidth={2.5} />
                   </div>
                   <div>
                       <h2 className={cn("text-lg font-bold tracking-tight", "text-[var(--text-primary)]")}>
                           {editingRoom ? "Update Room" : "Create New Room"}
                       </h2>
                       <p className="text-[10px] font-medium text-slate-500 mt-0.5 uppercase tracking-widest">Manage your room inventory</p>
                   </div>
               </div>
               <button
                 onClick={() => setShowModal(false)}
                 className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-all", isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500")}
               >
                 <X size={20} />
               </button>
           </div>

           <form onSubmit={handleSubmit} className="p-4 space-y-3 flex-1">
             <div className="space-y-3">
                <div className="flex items-center gap-3">
                   <div className="h-5 w-1.5 bg-blue-600 rounded-full" />
                   <span className="text-xs font-semibold text-blue-600">Room Placement</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2 text-left">
                        <label className={cn("text-sm font-semibold ml-1", isDark ? "text-slate-500" : "text-slate-400")}>Select Property *</label>
                        <select 
                            value={formData.pgId}
                            onChange={(e) => handlePGSelection(e.target.value)}
                            className={cn(
                                "w-full border rounded-2xl py-2.5 px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm", 
                                isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900",
                                formErrors.pgId && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20",
                                highlightPg && "ring-4 ring-blue-500 border-blue-500 scale-[1.02] shadow-xl z-20"
                            )}
                        >
                            <option value="">Select PG</option>
                            {pgs.map(pg => <option key={pg.id} value={pg.id}>{pg.name}</option>)}
                        </select>
                        {formErrors.pgId && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest px-2 animate-pulse mt-1">{formErrors.pgId}</p>}
                    </div>
                    <div className="space-y-2 text-left">
                        <label className={cn("text-sm font-semibold ml-1", isDark ? "text-slate-500" : "text-slate-400")}>Floor Number *</label>
                        <div 
                            className="relative"
                            onClick={() => {
                                if (!formData.pgId) {
                                    setHighlightPg(true);
                                    setTimeout(() => setHighlightPg(false), 2000);
                                }
                            }}
                        >
                            <select 
                                name="floorNumber"
                                value={formData.floorNumber}
                                onChange={handleInputChange}
                                disabled={!formData.pgId || floorOptions.length === 0}
                                className={cn(
                                    "w-full border rounded-2xl py-2.5 px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm", 
                                    isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900",
                                    (!formData.pgId || floorOptions.length === 0) && "opacity-50 cursor-not-allowed pointer-events-none",
                                    formErrors.floorNumber && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20",
                                    highlightFloor && "ring-4 ring-blue-500 border-blue-500 scale-[1.02] shadow-xl z-20"
                                )}
                            >
                                {!formData.pgId ? (
                                    <option value="">Select Property First</option>
                                ) : floorOptions.length === 0 ? (
                                    <option value="">No Floors Defined</option>
                                ) : (
                                    <>
                                        <option value="">Select Floor</option>
                                        {floorOptions.map(floor => (
                                            <option key={floor} value={floor}>Floor {floor}</option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                        {formErrors.floorNumber && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest px-2 animate-pulse mt-1">{formErrors.floorNumber}</p>}
                    </div>
                 </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="h-5 w-1.5 bg-blue-600 rounded-full" />
                    <span className="text-xs font-semibold text-blue-600">Room Specifications</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2 text-left">
                        <label className={cn("text-sm font-semibold ml-1", isDark ? "text-slate-500" : "text-slate-400")}>Room Number *</label>
                        <div 
                            className="relative"
                            onClick={() => {
                                if (!formData.floorNumber) {
                                    if (!formData.pgId) {
                                        setHighlightPg(true);
                                        setTimeout(() => setHighlightPg(false), 2000);
                                    } else {
                                        setHighlightFloor(true);
                                        setTimeout(() => setHighlightFloor(false), 2000);
                                    }
                                }
                            }}
                        >
                            <input 
                                name="roomNumber"
                                value={formData.roomNumber}
                                onChange={handleInputChange}
                                disabled={!formData.floorNumber}
                                placeholder={!formData.floorNumber ? "Select Floor First" : "e.g. 101"}
                                className={cn(
                                    "w-full border rounded-2xl py-2.5 px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm", 
                                    isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900",
                                    !formData.floorNumber && "opacity-50 cursor-not-allowed pointer-events-none",
                                    formErrors.roomNumber && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20"
                                )}
                            />
                        </div>
                        {formErrors.roomNumber && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest px-2 animate-pulse mt-1">{formErrors.roomNumber}</p>}
                    </div>
                    <div className="space-y-2 text-left">
                        <label className={cn("text-sm font-semibold ml-1", isDark ? "text-slate-500" : "text-slate-400")}>Room Type *</label>
                        <div 
                            className="relative"
                            onClick={() => {
                                if (!formData.floorNumber) {
                                    if (!formData.pgId) {
                                        setHighlightPg(true);
                                        setTimeout(() => setHighlightPg(false), 2000);
                                    } else {
                                        setHighlightFloor(true);
                                        setTimeout(() => setHighlightFloor(false), 2000);
                                    }
                                }
                            }}
                        >
                            <select 
                                name="roomType"
                                value={formData.roomType}
                                disabled={!formData.floorNumber}
                                onChange={handleInputChange}
                                className={cn(
                                    "w-full border rounded-2xl py-2.5 px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm", 
                                    isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900",
                                    !formData.floorNumber && "opacity-50 cursor-not-allowed pointer-events-none",
                                    formErrors.roomType && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20"
                                )}
                            >
                                <option value="SINGLE">1 Share</option>
                                <option value="DOUBLE">2 Share</option>
                                <option value="TRIPLE">3 Share</option>
                                <option value="FOUR_SHARE">4 Share</option>
                                <option value="FIVE_SHARE">5 Share</option>
                                <option value="OTHERS">Others</option>
                            </select>
                        </div>
                        {formErrors.roomType && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest px-2 animate-pulse mt-1">{formErrors.roomType}</p>}
                    </div>
                    {formData.roomType === "OTHERS" && (
                        <div className="space-y-2 text-left animate-in flip-in-x duration-300">
                            <label className={cn("text-xs font-semibold ml-1", isDark ? "text-slate-500" : "text-slate-400")}>Sharing Count (Max 99) *</label>
                            <input 
                                name="capacity"
                                value={formData.capacity}
                                onChange={handleInputChange}
                                placeholder="Enter sharing count"
                                maxLength={2}
                                className={cn(
                                    "w-full border rounded-2xl py-2.5 px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm", 
                                    isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900",
                                    formErrors.capacity && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20"
                                )}
                            />
                            {formErrors.capacity && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest px-2 animate-pulse mt-1">{formErrors.capacity}</p>}
                        </div>
                    )}
                    <AmountInput 
                        label="Monthly Rent (₹) *"
                        name="monthlyRent"
                        value={formData.monthlyRent}
                        isDark={isDark}
                        onChange={handleInputChange}
                        error={formErrors.monthlyRent}
                    />

                    <div className="space-y-2 text-left">
                        <label className={cn("text-xs font-semibold ml-1", isDark ? "text-slate-500" : "text-slate-400")}>Initial Status *</label>
                        <select 
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className={cn(
                                "w-full border rounded-2xl py-2.5 px-5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm", 
                                isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            )}
                        >
                            <option value="AVAILABLE">Active</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>
                {formData.roomType && (
                    <div className={cn("px-3 py-2 rounded-xl border flex items-center gap-2", isDark ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50 border-blue-100")}>
                        <BedIcon size={14} className="text-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                            Auto: {formData.capacity} beds for {formData.roomType} room
                        </span>
                    </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={cn("flex-1 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all border", isDark ? "bg-slate-800 hover:bg-slate-700 text-white border-white/5" : "bg-gray-100 hover:bg-gray-200 text-slate-700 border-slate-200")}
                >
                  Cancel
                </button>
                 <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                      "flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                      isSubmitting && "animate-pulse"
                  )}
                >
                  {isSubmitting ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : editingRoom ? "Confirm Update" : "Confirm Creation"}
                </button>
              </div>
           </form>
          </div>
        </div>
      )}


        </>
    );
};

export default RoomFormModal;
