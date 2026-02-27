import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

export const InputField = ({ label, name, value, onChange, error, icon: Icon, theme, type = "text", maxLength, onIncrement, onDecrement, stepLabel = "1000", inputMode, disabled, onDisabledClick, className }: any) => {
    const isDark = theme === "dark";
    return (
        <div
            className="flex flex-col gap-1.5"
            onClick={() => disabled && onDisabledClick && onDisabledClick()}
        >
            <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
            <div className="relative group">
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    maxLength={maxLength}
                    inputMode={inputMode}
                    disabled={disabled}
                    className={cn(
                        "w-full p-2.5 pl-10 rounded-xl border outline-none focus:ring-2 transition-all",
                        isDark ? "bg-slate-800 border-white/10 text-white focus:ring-blue-500/50" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/50",
                        (onIncrement || onDecrement) && "pr-32",
                        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                        error && "!border-rose-500 !focus:ring-rose-500/30 !ring-2 !ring-rose-500/20",
                        className
                    )}
                />
                {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />}

                {(onIncrement || onDecrement) && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 p-1">
                        <button
                            type="button"
                            onClick={onDecrement}
                            disabled={disabled}
                            className={cn(
                                "h-8 px-2 rounded-lg text-[10px] font-black transition-all active:scale-90",
                                isDark ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300" : "bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            -{stepLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onIncrement}
                            disabled={disabled}
                            className={cn(
                                "h-8 px-2 rounded-lg text-[10px] font-black transition-all active:scale-90",
                                isDark ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            +{stepLabel}
                        </button>
                    </div>
                )}
            </div>
            {error && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{error}</span>}
        </div>
    );
};
