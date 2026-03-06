import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, BedDouble, CheckCircle2, CreditCard, Shield } from 'lucide-react';
import { InputField } from './InputField';
import { cn } from './utils';

export const Step2Stay = ({
    formData, handleInputChange, errors, theme, isDark,
    pgs, rooms, beds, showSelectionHint, handleDisabledClick, initialData, setFormData, setErrors
}: any) => {
    return (
        <motion.div
            key="step2"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="space-y-4"
        >
            {/* 1. Room Assignment Section (Moved to top) */}
            <h3 className="text-sm font-bold uppercase text-emerald-500 mb-2">Room Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        Property
                        {showSelectionHint && !formData.pgId && <span className="text-[10px] text-rose-500 font-black animate-bounce ml-auto">SELECT THIS FIRST</span>}
                    </label>
                    <select
                        name="pgId"
                        value={formData.pgId}
                        onChange={handleInputChange}
                        className={cn(
                            "p-2.5 rounded-xl border outline-none transition-all",
                            isDark ? "bg-slate-800 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900",
                            showSelectionHint && !formData.pgId && "ring-2 ring-rose-500 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
                            errors.pgId && "!border-rose-500 !ring-2 !ring-rose-500/20"
                        )}
                    >
                        <option value="">Select PG</option>
                        {pgs.map((pg: any) => <option key={pg.id} value={pg.id}>{pg.name}</option>)}
                    </select>
                    {errors.pgId && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{errors.pgId}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        Room
                        {showSelectionHint && formData.pgId && !formData.roomId && <span className="text-[10px] text-rose-500 font-black animate-bounce ml-auto">THEN SELECT A ROOM</span>}
                    </label>
                    <div
                        className="relative"
                        onClick={() => {
                            if (!formData.pgId) {
                                handleDisabledClick();
                            }
                        }}
                    >
                        <select
                            name="roomId"
                            value={formData.roomId}
                            onChange={handleInputChange}
                            disabled={!formData.pgId}
                            className={cn(
                                "w-full p-2.5 rounded-xl border outline-none transition-all",
                                isDark ? "bg-slate-800 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900",
                                !formData.pgId && "opacity-50 cursor-not-allowed pointer-events-none",
                                showSelectionHint && formData.pgId && !formData.roomId && "ring-2 ring-rose-500 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
                                errors.roomId && "!border-rose-500 !ring-2 !ring-rose-500/20"
                            )}
                        >
                            <option value="">Select Room</option>
                            {rooms.map((room: any) => (
                                <option key={room.id} value={room.id}>
                                    Room {room.room_number || room.roomNumber} - Floor {room.floor || room.floorNumber}
                                </option>
                            ))}
                        </select>
                    </div>
                    {errors.roomId && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{errors.roomId}</span>}
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-3">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        Available Beds
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-md text-[9px]",
                            beds.filter((b: any) => b.status === 'AVAILABLE').length > 0
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-rose-500/10 text-rose-500"
                        )}>
                            {beds.filter((b: any) => b.status === 'AVAILABLE' || (initialData && (b.id === initialData.bed_id || b.id === initialData.beds?.id))).length} Vacant
                        </span>
                    </label>
                    {!formData.roomId ? (
                        <div className={cn("text-center py-8 rounded-2xl border border-dashed", isDark ? "border-white/10 text-white/20" : "border-slate-200 text-slate-400")}>
                            <p className="text-[10px] uppercase font-bold tracking-widest italic">Please select a room first</p>
                        </div>
                    ) : beds.length === 0 ? (
                        <div className={cn("text-center py-8 rounded-2xl border border-dashed", isDark ? "border-white/10 text-white/20" : "border-slate-200 text-slate-400")}>
                            <p className="text-[10px] uppercase font-bold tracking-widest italic">No beds configured for this room</p>
                        </div>
                    ) : beds.filter((b: any) => b.status === 'AVAILABLE' || (initialData && (b.id === initialData.bed_id || b.id === initialData.beds?.id))).length === 0 ? (
                        <div className={cn("text-center py-8 rounded-2xl border border-dashed bg-rose-500/5", isDark ? "border-rose-500/20 text-rose-500/50" : "border-rose-500/20 text-rose-500/60")}>
                            <p className="text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-2">
                                <AlertCircle size={14} /> Beds are full in this room
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-1">
                            {beds.map((bed: any) => {
                                const isOccupied = bed.status === "OCCUPIED";
                                const isMaintenance = bed.status === "MAINTENANCE";
                                const isSelected = formData.bedId === bed.id;

                                // Allow selecting the bed if it's ALREADY assigned to this tenant (during edit)
                                const isAssignedToSelf = initialData && (bed.id === initialData.bed_id || bed.id === initialData.beds?.id);
                                const isAvailable = bed.status === "AVAILABLE" || isAssignedToSelf;

                                return (
                                    <button
                                        key={bed.id}
                                        type="button"
                                        disabled={!isAvailable}
                                        onClick={() => {
                                            setFormData((prev: any) => ({ ...prev, bedId: bed.id }));
                                            if (errors.bedId) setErrors((prev: any) => ({ ...prev, bedId: "" }));
                                        }}
                                        className={cn(
                                            "relative p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                                            isSelected
                                                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                                : isAvailable
                                                    ? isDark
                                                        ? "bg-slate-800/50 border-white/5 hover:border-blue-500/50 text-slate-300"
                                                        : "bg-white border-slate-200 hover:border-blue-500 text-slate-600 shadow-sm"
                                                    : isDark
                                                        ? "bg-slate-900 border-transparent opacity-40 cursor-not-allowed"
                                                        : "bg-slate-100 border-transparent opacity-50 cursor-not-allowed",
                                            (errors.bedId && !isSelected) && "border-rose-500/30"
                                        )}
                                    >
                                        <BedDouble size={18} className={cn(isSelected ? "text-white" : isAvailable ? "text-emerald-500" : isMaintenance ? "text-blue-500" : "text-rose-500")} />
                                        <span className="text-[11px] font-black">{bed.bedNumber}</span>

                                        {/* Status Badge */}
                                        {!isAvailable && (
                                            <span className={cn(
                                                "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter",
                                                isOccupied ? "bg-rose-600 text-white" : "bg-blue-600 text-white"
                                            )}>
                                                {bed.status}
                                            </span>
                                        )}

                                        {isAssignedToSelf && (
                                            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter bg-emerald-600 text-white shadow-sm">
                                                Current
                                            </span>
                                        )}

                                        {isAvailable && isSelected && (
                                            <div className="absolute top-1 right-1">
                                                <CheckCircle2 size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {errors.bedId && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{errors.bedId}</span>}
                </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-white/10 my-4" />

            {/* 2. Rent Related Details (Moved down) */}
            <div className="flex gap-2 p-1 rounded-xl bg-gray-100 dark:bg-white/5 mb-4">
                <button
                    onClick={() => {
                        setFormData((prev: any) => {
                            const selectedRoom = rooms.find((r: any) => r.id === prev.roomId);
                            const selectedPg = pgs.find((p: any) => p.id === prev.pgId);
                            return {
                                ...prev,
                                stayType: "MONTHLY",
                                rentAmount: selectedRoom ? String(selectedRoom.monthlyRent || selectedRoom.rent || "") : prev.rentAmount,
                                maintenanceAmount: String(selectedPg?.maintenance_amount || 0),
                                maintenanceType: selectedPg?.maintenance_type || "",
                                securityDeposit: String(selectedPg?.security_deposit || 0)
                            };
                        });
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${formData.stayType === "MONTHLY" ? "bg-white text-blue-600 shadow" : "text-gray-500"}`}
                >
                    Monthly Stay
                </button>
                <button
                    onClick={() => {
                        setFormData((prev: any) => ({
                            ...prev,
                            stayType: "DAILY",
                            rentAmount: "",
                            maintenanceAmount: "0",
                            securityDeposit: "0",
                            rentPaymentType: "JOIN_DATE_BASED"
                        }));
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${formData.stayType === "DAILY" ? "bg-white text-blue-600 shadow" : "text-gray-500"}`}
                >
                    Daily Stay
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Joined Date *</label>
                    <input
                        type="date"
                        name="joinedDate"
                        value={formData.joinedDate}
                        onChange={handleInputChange}
                        className={cn(
                            "p-2.5 rounded-xl border outline-none transition-all",
                            isDark ? "bg-slate-800 border-white/10 text-white focus:ring-blue-500/50" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/50",
                            errors.joinedDate && "!border-rose-500 !ring-2 !ring-rose-500/20"
                        )}
                    />
                    {errors.joinedDate && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{errors.joinedDate}</span>}
                </div>

                {formData.stayType === "DAILY" && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Vacate Date *</label>
                        <input
                            type="date"
                            name="vacateDate"
                            value={formData.vacateDate}
                            onChange={handleInputChange}
                            className={cn(
                                "p-2.5 rounded-xl border outline-none transition-all",
                                isDark ? "bg-slate-800 border-white/10 text-white focus:ring-blue-500/50" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/50",
                                errors.vacateDate && "!border-rose-500 !ring-2 !ring-rose-500/20"
                            )}
                        />
                        {errors.vacateDate && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{errors.vacateDate}</span>}
                    </div>
                )}

                {formData.stayType === "MONTHLY" && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Rent Cycle *</label>
                        <select name="rentPaymentType" value={formData.rentPaymentType} onChange={handleInputChange} className={`p-2.5 rounded-xl border outline-none ${isDark ? "bg-slate-800 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                            <option value="FIXED_FIRST_DAY">1st of Every Month</option>
                            <option value="JOIN_DATE_BASED">According to Join Date</option>
                        </select>
                    </div>
                )}

                <InputField
                    label={`Rent Per ${formData.stayType === "MONTHLY" ? "Month" : "Day"} *`}
                    name="rentAmount"
                    value={formData.rentAmount}
                    onChange={handleInputChange}
                    error={errors.rentAmount}
                    icon={CreditCard}
                    theme={theme}
                    type="text"
                    inputMode="numeric"
                    disabled={!formData.roomId}
                    onDisabledClick={handleDisabledClick}
                    stepLabel={formData.stayType === "MONTHLY" ? "1000" : "500"}
                    onIncrement={() => {
                        if (!formData.roomId) return;
                        const step = formData.stayType === "MONTHLY" ? 1000 : 500;
                        const newVal = Number(formData.rentAmount || 0) + step;
                        if (newVal <= 9999999) setFormData((prev: any) => ({ ...prev, rentAmount: String(newVal) }));
                    }}
                    onDecrement={() => {
                        if (!formData.roomId) return;
                        const step = formData.stayType === "MONTHLY" ? 1000 : 500;
                        const newVal = Math.max(0, Number(formData.rentAmount || 0) - step);
                        setFormData((prev: any) => ({ ...prev, rentAmount: String(newVal) }));
                    }}
                />
                <InputField
                    label="Security Deposit"
                    name="securityDeposit"
                    value={formData.securityDeposit}
                    onChange={handleInputChange}
                    error={errors.securityDeposit}
                    icon={Shield}
                    theme={theme}
                    type="text"
                    inputMode="numeric"
                    disabled={!formData.roomId}
                    onDisabledClick={handleDisabledClick}
                    stepLabel={formData.stayType === "MONTHLY" ? "1000" : "500"}
                    onIncrement={() => {
                        if (!formData.roomId) return;
                        const step = formData.stayType === "MONTHLY" ? 1000 : 500;
                        const newVal = Number(formData.securityDeposit || 0) + step;
                        if (newVal <= 9999999) setFormData((prev: any) => ({ ...prev, securityDeposit: String(newVal) }));
                    }}
                    onDecrement={() => {
                        if (!formData.roomId) return;
                        const step = formData.stayType === "MONTHLY" ? 1000 : 500;
                        const newVal = Math.max(0, Number(formData.securityDeposit || 0) - step);
                        setFormData((prev: any) => ({ ...prev, securityDeposit: String(newVal) }));
                    }}
                />

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Maintenance Charge</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative group">
                            <input
                                type="text"
                                name="maintenanceAmount"
                                value={formData.maintenanceAmount}
                                onChange={handleInputChange}
                                inputMode="numeric"
                                placeholder="Amount"
                                disabled={!formData.roomId}
                                className={cn(
                                    "w-full p-2.5 pl-8 rounded-xl border outline-none focus:ring-2 transition-all text-sm",
                                    isDark ? "bg-slate-800 border-white/10 text-white focus:ring-blue-500/50" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/50",
                                    !formData.roomId && "opacity-50 cursor-not-allowed pointer-events-none"
                                )}
                            />
                            <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        </div>
                        <select
                            name="maintenanceType"
                            value={formData.maintenanceType}
                            onChange={handleInputChange}
                            disabled={!formData.roomId}
                            className={cn(
                                "w-full p-2.5 rounded-xl border outline-none text-sm transition-all",
                                isDark ? "bg-slate-800 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900",
                                !formData.roomId && "opacity-50 cursor-not-allowed pointer-events-none"
                            )}
                        >
                            <option value="">No Maintenance</option>
                            <option value="one_time">One Time</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>
                {/* Daily Stay Total Rent Info Box */}
                {formData.stayType === "DAILY" && formData.joinedDate && formData.vacateDate && (() => {
                    const start = new Date(formData.joinedDate);
                    const end = new Date(formData.vacateDate);
                    if (end > start) {
                        const diffDays = Math.floor(((end as any).getTime() - (start as any).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        const rentBase = diffDays * Number(formData.rentAmount || 0);
                        const maintenanceBase = Number(formData.maintenanceAmount || 0);
                        const totalRent = rentBase + maintenanceBase;
                        const startStr = start.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });
                        const endStr = end.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });

                        return (
                            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 space-y-2 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Stay Rent</h4>
                                    <span className="text-[10px] font-bold text-slate-400 bg-white/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-md">
                                        {startStr} → {endStr} ({diffDays} Days)
                                    </span>
                                </div>
                                <div className="flex items-end gap-2 text-slate-900 dark:text-white">
                                    <span className="text-2xl font-black">₹{totalRent.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-slate-500 mb-1">
                                        (₹{Number(formData.rentAmount || 0).toLocaleString()} × {diffDays} days)
                                        {maintenanceBase > 0 && ` + ₹${maintenanceBase.toLocaleString()} Maint`}
                                    </span>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Initial Payment Section */}
                <div className="md:col-span-2 p-4 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Initial Payment (Received Today)</h4>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-bold text-emerald-600/70 uppercase">Updates Ledger</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                            label="Amount Paid Now"
                            name="paidAmount"
                            value={formData.paidAmount}
                            onChange={handleInputChange}
                            icon={CreditCard}
                            theme={theme}
                            type="text"
                            inputMode="numeric"
                            disabled={!formData.roomId}
                            onDisabledClick={handleDisabledClick}
                            stepLabel="500"
                            onIncrement={() => {
                                if (!formData.roomId) return;
                                const newVal = Number(formData.paidAmount || 0) + 500;
                                if (newVal <= 9999999) setFormData((prev: any) => ({ ...prev, paidAmount: String(newVal) }));
                            }}
                            onDecrement={() => {
                                if (!formData.roomId) return;
                                const newVal = Math.max(0, Number(formData.paidAmount || 0) - 500);
                                setFormData((prev: any) => ({ ...prev, paidAmount: String(newVal) }));
                            }}
                        />
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Payment Method</label>
                            <div
                                className="relative"
                                onClick={() => {
                                    if (!formData.roomId) {
                                        handleDisabledClick();
                                    }
                                }}
                            >
                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleInputChange}
                                    disabled={!formData.roomId || !formData.paidAmount}
                                    className={cn(
                                        "w-full p-2.5 rounded-xl border outline-none transition-all",
                                        isDark ? "bg-slate-800 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900",
                                        (!formData.roomId || !formData.paidAmount) && "opacity-50 cursor-not-allowed pointer-events-none"
                                    )}
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="ONLINE">Online/UPI</option>
                                    <option value="TRANSFER">Bank Transfer</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    {formData.paidAmount && (() => {
                        let calcBase = 0;
                        if (formData.stayType === "DAILY" && formData.joinedDate && formData.vacateDate) {
                            const start = new Date(formData.joinedDate);
                            const end = new Date(formData.vacateDate);
                            if (end > start) {
                                const diffDays = Math.floor(((end as any).getTime() - (start as any).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                calcBase = (diffDays * Number(formData.rentAmount || 0)) + Number(formData.maintenanceAmount || 0);
                            }
                        } else {
                            const rentPart = Number(formData.rentAmount || 0);
                            const maintPart = (formData.maintenanceType === "monthly" || formData.maintenanceType === "one_time") ? Number(formData.maintenanceAmount || 0) : 0;
                            const depositPart = Number(formData.securityDeposit || 0);
                            calcBase = rentPart + maintPart + depositPart;
                        }
                        const isOverpaid = Number(formData.paidAmount || 0) > calcBase;
                        const balance = isOverpaid ? 0 : Math.max(0, calcBase - Number(formData.paidAmount || 0));

                        return (
                            <div className="mt-2 space-y-1">
                                {isOverpaid ? (
                                    <p className="text-[10px] text-rose-500 font-black animate-pulse flex items-center gap-1 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                                        <AlertTriangle size={14} /> WARNING: Paid amount (₹{Number(formData.paidAmount).toLocaleString()}) is GREATER than total expected (₹{calcBase.toLocaleString()}).
                                    </p>
                                ) : (
                                    <p className="text-[9px] text-emerald-600/70 font-bold italic">
                                        Remaining Balance: ₹{balance.toLocaleString()}
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </motion.div>
    );
};