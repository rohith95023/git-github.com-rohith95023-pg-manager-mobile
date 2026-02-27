import React from 'react';
import { IndianRupee, Plus, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AmountInput = ({ 
  label, 
  value, 
  onChange, 
  error, 
  isDark = false, 
  placeholder = "0.00",
  name
}) => {
  const handleAdjust = (adjustment) => {
    const currentVal = parseFloat(value) || 0;
    const newVal = Math.max(0, currentVal + adjustment);
    onChange({ target: { name, value: newVal.toString() } });
  };

  return (
    <div className="space-y-2 w-full">
      {label && (
        <div className="flex items-center justify-between h-5 ml-1">
          <label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
            {label}
          </label>
        </div>
      )}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <IndianRupee size={16} className="text-slate-500" />
        </div>
        
        <input 
          type="text"
          name={name}
          value={value}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length <= 7) {
                onChange({ target: { name, value: val } });
            }
          }}
          placeholder={placeholder}
          inputMode="numeric"
          className={cn(
            "w-full border-2 rounded-2xl py-2.5 pl-11 pr-[100px] focus:outline-none focus:ring-4 transition-all font-bold text-sm h-[50px]", 
            isDark ? "bg-slate-800/30 border-white/5 text-white focus:ring-blue-500/20" : "bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-500/10",
            error && "!border-rose-500 !focus:ring-rose-500/20 !ring-2 !ring-rose-500/20"
          )}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent group-hover:border-blue-500/20 transition-all">
          <button 
            type="button"
            onClick={() => handleAdjust(-1000)}
            className={cn(
                "h-9 px-2.5 rounded-lg flex items-center justify-center text-[11px] font-black transition-all active:scale-90",
                isDark ? "bg-white/5 hover:bg-rose-500/20 text-rose-400" : "bg-white hover:bg-rose-50 text-rose-500 border border-slate-200"
            )}
            title="-1000"
          >
            -1K
          </button>
          <button 
            type="button"
            onClick={() => handleAdjust(1000)}
            className={cn(
                "h-9 px-2.5 rounded-lg flex items-center justify-center text-[11px] font-black transition-all active:scale-90",
                isDark ? "bg-white/5 hover:bg-emerald-500/20 text-emerald-400" : "bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200"
            )}
            title="+1000"
          >
            +1K
          </button>
        </div>
      </div>
      {error && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest px-2 animate-pulse mt-1">{error}</p>}
    </div>
  );
};

export default AmountInput;
