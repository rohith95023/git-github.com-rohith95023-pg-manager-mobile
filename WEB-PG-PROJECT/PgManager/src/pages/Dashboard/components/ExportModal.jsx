import React, { useState } from "react";
import { X, FileSpreadsheet, FileJson, Download, ShieldCheck, Database, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { backupAPI } from "../../../services/api";

const ExportModal = ({ isOpen, onClose, isDark, dashboardStats }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [status, setStatus] = useState("");

    if (!isOpen) return null;

    const cn = (...inputs) => inputs.filter(Boolean).join(' ');

    const handleExport = async (format) => {
        setIsExporting(true);
        setStatus("Fetching system data...");
        
        try {
            // 1. Fetch all data
            const systemData = await backupAPI.getSystemData();
            
            // 2. Prepare for snapshot (data safety as requested)
            const timestamp = new Date().toISOString();
            const filename = `PG_Manager_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}`;
            
            setStatus("Securing snapshot in Database...");
            await backupAPI.createSnapshot({ ...systemData, dashboardStats }, filename, format);

            setStatus(`Generating ${format} file...`);

            if (format === "XLSX") {
                const wb = XLSX.utils.book_new();
                
                // Add sheets for each component (only those that are arrays)
                Object.entries(systemData).forEach(([key, data]) => {
                    if (Array.isArray(data)) {
                        const ws = XLSX.utils.json_to_sheet(data);
                        XLSX.utils.book_append_sheet(wb, ws, key.charAt(0).toUpperCase() + key.slice(1));
                    }
                });

                // Add Dashboard context as a single-row array
                if (dashboardStats) {
                    const dashboardWs = XLSX.utils.json_to_sheet([dashboardStats]);
                    XLSX.utils.book_append_sheet(wb, dashboardWs, "DashboardSummary");
                }

                XLSX.writeFile(wb, `${filename}.xlsx`);
            } else if (format === "CSV") {
                // For CSV, we'll zip or just provide the main tenants data for simplicity in one file, 
                // but better to provide all in a "Master" sheet if CSV.
                // Actually, CSV is single sheet. Let's flatten important data or focus on Tenants/Payments.
                
                const allData = [
                    ...systemData.pgs.map(p => ({ ...p, table: 'Property' })),
                    ...systemData.tenants.map(t => ({ ...t, table: 'Resident' })),
                    ...systemData.payments.map(p => ({ ...p, table: 'Payment' })),
                    ...systemData.expenses.map(e => ({ ...e, table: 'Expense' }))
                ];

                const ws = XLSX.utils.json_to_sheet(allData);
                const csvOutput = XLSX.utils.sheet_to_csv(ws);
                const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.setAttribute("download", `${filename}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            setStatus("Export successful!");
            setTimeout(() => {
                setIsExporting(false);
                onClose();
            }, 1000);

        } catch (error) {
            console.error("Export failed:", error);
            setStatus("Error: " + (error.message || "Unknown error occurred"));
            setTimeout(() => setIsExporting(false), 3000);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className={cn("fixed inset-0 transition-opacity backdrop-blur-sm", isDark ? "bg-slate-950/80" : "bg-slate-900/40")} 
                onClick={!isExporting ? onClose : undefined}
            />
            
            <div className={cn(
                "relative w-full max-w-lg border rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden",
                isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
            )}>
                {/* Header Section */}
                <div className={cn(
                    "px-8 py-6 flex items-center justify-between border-b",
                    isDark ? "border-white/5 bg-white/5" : "border-slate-100 bg-slate-50/50"
                )}>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 className={cn("text-xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                                System Data Export
                            </h2>
                            <p className={cn("text-xs font-bold uppercase tracking-widest leading-none mt-1.5 opacity-60", isDark ? "text-slate-400" : "text-slate-500")}>
                                Full Database Snapshot
                            </p>
                        </div>
                    </div>
                    {!isExporting && (
                        <button 
                            onClick={onClose}
                            className={cn("p-2.5 rounded-xl transition-all", isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-200 text-slate-500")}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="p-8 space-y-8">
                    {/* Security Notice */}
                    <div className={cn(
                        "p-4 rounded-2xl flex items-start gap-4 border",
                        isDark ? "bg-blue-500/5 border-blue-500/10 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-700"
                    )}>
                        <ShieldCheck size={20} className="shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest leading-none">Data Integrated Safety</p>
                            <p className="text-[11px] font-medium leading-relaxed opacity-80">
                                This action will capture all PG Properties, Residents, Rooms, and Financial records into a standalone backup table before downloading. Your data remains secure and isolated.
                            </p>
                        </div>
                    </div>

                    {isExporting ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <Loader2 size={48} className="text-blue-600 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className={cn("text-sm font-bold animate-pulse", isDark ? "text-white" : "text-slate-900")}>
                                    {status}
                                </p>
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Please stay on this page</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => handleExport("XLSX")}
                                className={cn(
                                    "group relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all active:scale-[0.97]",
                                    isDark 
                                        ? "bg-emerald-500/5 border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10" 
                                        : "bg-emerald-50 border-emerald-100/50 hover:border-emerald-500 hover:bg-emerald-500/5"
                                )}
                            >
                                <div className="h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet size={32} />
                                </div>
                                <div className="text-center">
                                    <span className={cn("text-base font-black tracking-tight block", isDark ? "text-white" : "text-slate-900")}>Excel Workbook</span>
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Multi-Sheet (.xlsx)</span>
                                </div>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Download size={16} className="text-emerald-500" />
                                </div>
                            </button>

                            <button 
                                onClick={() => handleExport("CSV")}
                                className={cn(
                                    "group relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all active:scale-[0.97]",
                                    isDark 
                                        ? "bg-blue-500/5 border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10" 
                                        : "bg-blue-50 border-blue-100/50 hover:border-blue-500 hover:bg-blue-500/5"
                                )}
                            >
                                <div className="h-16 w-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                    <FileJson size={32} />
                                </div>
                                <div className="text-center">
                                    <span className={cn("text-base font-black tracking-tight block", isDark ? "text-white" : "text-slate-900")}>CSV Document</span>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Fast & Flat (.csv)</span>
                                </div>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Download size={16} className="text-blue-500" />
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                {!isExporting && (
                    <div className={cn(
                        "px-8 py-5 border-t flex items-center justify-center gap-2",
                        isDark ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50/50"
                    )}>
                        <AlertCircle size={14} className="text-slate-400" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                            Snapshot will be stored under "system history" for your safety.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportModal;
