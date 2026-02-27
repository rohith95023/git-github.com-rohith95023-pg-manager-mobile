import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

export const SectionHeader = ({ title }) => (
    <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-500">
            {title}
        </h4>
    </div>
);

export const InfoPill = ({ icon, label, value }) => (
    <div className="flex items-start gap-4">
        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mb-0.5">{label}</p>
            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{value || 'N/A'}</p>
        </div>
    </div>
);

export const DocCard = ({ icon, label, value, isDark }) => (
    <div className={cn(
        "p-4 rounded-xl border flex items-center justify-between gap-4",
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
    )}>
        <div className="flex items-center gap-3">
            <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center text-slate-500",
                isDark ? "bg-slate-900" : "bg-slate-100"
            )}>
                {icon}
            </div>
            <div>
                <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mb-0.5">{label}</p>
                <p className="text-[9px] font-medium text-blue-500/60 uppercase">Identity Verified</p>
            </div>
        </div>
        <p className={cn(
            "text-lg font-bold tracking-tight",
            isDark ? "text-slate-100" : "text-blue-600"
        )}>
            {value || 'N/A'}
        </p>
    </div>
);

export const FinanceRow = ({ label, amount, isDark, sub, action }) => (
    <div className="p-4 flex items-center justify-between group transition-colors hover:bg-slate-500/5">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <p className={cn("text-xs font-semibold", isDark ? "text-slate-300" : "text-slate-700")}>{label}</p>
                {action}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
        </div>
        <div className="text-right">
            <p className={cn(
                "text-lg font-bold tracking-tight",
                label.includes('Balance') ? (Number(amount) > 0 ? "text-rose-500" : "text-emerald-500") :
                (isDark ? "text-white" : "text-slate-900")
            )}>
                <span className="text-xs mr-1 opacity-50 font-medium">₹</span>
                {Number(amount || 0).toLocaleString()}
            </p>
        </div>
    </div>
);