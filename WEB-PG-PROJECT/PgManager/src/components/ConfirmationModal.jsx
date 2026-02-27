import React from "react";
import { X, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import useMediaQuery from "../hooks/useMediaQuery";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  subtitle = "",
  message = "This action cannot be undone.", 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "info", // 'danger', 'warning', 'info', 'success'
  isLoading = false,
  needsInput = false,
  inputValue = "",
  onInputChange = () => {},
  inputPlaceholder = "Type here...",
  inputLabel = "Confirmation",
  inputError = ""
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn(
          "fixed inset-0 z-[20000] flex justify-center transition-all",
          isMobile ? "items-end px-0 pb-0" : "items-center p-4"
        )}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={isMobile ? { y: 250, opacity: 0 } : { scale: 0.95, opacity: 0, y: 20 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={isMobile ? { y: 250, opacity: 0 } : { scale: 0.95, opacity: 0, y: 20 }}
            className={cn(
              "relative w-full overflow-hidden border shadow-2xl transition-all",
              "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
              isMobile ? "mobile-confirmation-sheet" : "max-w-[480px] rounded-[24px]"
            )}
          >
            <div className="p-8 text-center flex flex-col items-center">
              {/* Icon Box */}
              <div className="flex justify-center mb-4">
                <div className={cn(
                    "h-16 w-16 rounded-2xl flex items-center justify-center border-2 shadow-sm transition-all duration-300",
                    type === 'danger' ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/15 text-rose-600 shadow-rose-500/5" :
                    type === 'warning' ? "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/15 text-amber-600 shadow-amber-500/5" :
                    type === 'success' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/15 text-emerald-600 shadow-emerald-500/5" :
                    "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/15 text-blue-600 shadow-blue-500/5"
                )}>
                    {type === 'danger' ? <X size={26} strokeWidth={2.5} /> :
                     type === 'warning' ? <AlertCircle size={26} strokeWidth={2.5} /> :
                     type === 'success' ? <CheckCircle2 size={26} strokeWidth={2.5} /> :
                     <HelpCircle size={26} strokeWidth={2.5} />}
                </div>
              </div>

              {/* Title Section */}
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
              
              {/* Description */}
              <p className="text-[14px] font-normal text-slate-500 dark:text-slate-400/80 leading-[1.6] max-w-[340px] px-2 whitespace-pre-line">
                {message}
              </p>

              {/* Input Section */}
              {needsInput && (
                <div className="mt-5 w-full text-left">
                  <label className="text-[12px] font-semibold uppercase tracking-[1.2px] text-blue-500 dark:text-blue-400 ml-1 block mb-2 opacity-90">
                    {inputLabel}
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => onInputChange(e.target.value)}
                      placeholder={inputPlaceholder}
                      className="w-full h-12 px-[16px] py-[14px] rounded-[14px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white font-medium text-[14px] outline-none focus:ring-2 focus:ring-blue-500/40 transition-all uppercase placeholder:text-slate-400 placeholder:font-normal shadow-inner"
                    />
                  </div>
                  {inputError && <p className="text-[10px] font-bold text-rose-500 mt-1.5 uppercase tracking-widest ml-1">{inputError}</p>}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-[10px] mt-[18px] w-full">
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={cn(
                    "w-full h-[48px] rounded-xl font-semibold text-[14px] uppercase tracking-[2px] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3",
                    type === 'danger' ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20" :
                    type === 'warning' ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20" :
                    type === 'success' ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20" :
                    "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                  )}
                >
                  {isLoading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : confirmText}
                </button>
                
                {cancelText && (
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="w-full py-2 rounded-xl font-medium text-[13px] uppercase tracking-[1px] text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {cancelText}
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

export default ConfirmationModal;
