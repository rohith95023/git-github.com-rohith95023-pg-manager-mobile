import React from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AlertModal = ({ 
  isOpen, 
  onClose, 
  title = "Action Blocked", 
  subtitle = "",
  message = "This action is currently not allowed.", 
  buttonText = "CLOSE",
  type = "error", // 'error', 'warning', 'info'
  actionText,
  onAction,
  isDark = true
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-8 text-center flex flex-col items-center">
              {/* Icon Container */}
              <div className="flex justify-center mb-4">
                <div className={cn(
                    "h-16 w-16 rounded-2xl flex items-center justify-center border-2 shadow-sm transition-all duration-300",
                    type === 'error' ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/15 text-rose-600 shadow-rose-500/5" :
                    type === 'warning' ? "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/15 text-amber-600 shadow-amber-500/5" :
                    "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/15 text-blue-600 shadow-blue-500/5"
                )}>
                    {type === 'error' ? <X size={26} strokeWidth={2.5} /> :
                     type === 'warning' ? <AlertCircle size={26} strokeWidth={2.5} /> :
                     <CheckCircle2 size={26} strokeWidth={2.5} />}
                </div>
              </div>

              {/* Text Content */}
              <div className="mb-3">
                <h3 className="text-[24px] font-bold text-slate-900 dark:text-white leading-[1.2] tracking-[-0.3px]">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 opacity-70 mt-1 uppercase tracking-tight">
                    {subtitle}
                  </p>
                )}
              </div>
              
              <p className="text-[14px] font-normal text-slate-500 dark:text-slate-400/80 leading-[1.6] max-w-[340px] px-2 whitespace-pre-line">
                {message}
              </p>

              {/* Action Buttons */}
              <div className="mt-[18px] flex flex-col gap-[10px] w-full">
                <button
                  onClick={onClose}
                  className={cn(
                    "w-full h-[48px] rounded-xl font-semibold text-[14px] uppercase tracking-[2px] transition-all shadow-lg active:scale-[0.98] text-white",
                    type === 'error' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" :
                    type === 'warning' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" :
                    "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  )}
                >
                  {buttonText}
                </button>

                {actionText && onAction && (
                    <button
                        onClick={onAction}
                        className={cn(
                            "w-full py-2 rounded-xl font-medium text-[13px] uppercase tracking-[1px] opacity-60 hover:opacity-100 transition-all active:scale-[0.98]",
                            isDark 
                              ? "bg-white/5 text-white hover:bg-white/10 border border-white/10" 
                              : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200"
                        )}
                    >
                        {actionText}
                    </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AlertModal;
