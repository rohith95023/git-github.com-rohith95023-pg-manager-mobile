import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '../utils/cn'; // Assuming you have a cn utility, or I can define it locally

const Toast = ({ message, type = 'success', isOpen, onClose, duration = 3000 }) => {
    useEffect(() => {
        if (isOpen && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, duration, onClose]);

    const icons = {
        success: <CheckCircle2 size={20} className="text-emerald-500" />,
        error: <AlertCircle size={20} className="text-rose-500" />,
        warning: <AlertCircle size={20} className="text-amber-500" />,
        info: <Info size={20} className="text-blue-500" />
    };

    const bgs = {
        success: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
        error: "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20",
        warning: "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
        info: "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20"
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 50, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.95 }}
                    className="fixed top-6 right-6 z-[9999] w-full max-w-[360px] px-4 md:px-0"
                >
                    <div className={cn(
                        "relative flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden",
                    )}>
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
                            bgs[type]
                        )}>
                            {icons[type]}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                                {type.toUpperCase()}
                            </p>
                            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                {message}
                            </p>
                        </div>

                        <button 
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                        >
                            <X size={16} />
                        </button>
                        
                        {/* Progress Bar */}
                        {duration > 0 && (
                            <motion.div 
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: duration / 1000, ease: "linear" }}
                                className={cn(
                                    "absolute bottom-0 left-0 h-1",
                                    type === 'success' ? "bg-emerald-500/50" :
                                    type === 'error' ? "bg-rose-500/50" :
                                    type === 'warning' ? "bg-amber-500/50" :
                                    "bg-blue-500/50"
                                )}
                            />
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
