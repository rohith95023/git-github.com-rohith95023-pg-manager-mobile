import { PGDesktopTable, PGMobileList } from "./PGListComponents";
import { PGFormModal } from "./PGFormModal";
import { usePGs } from "../../hooks/usePGs";
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { 
    Plus, Pencil, Trash2, X, Building2, MapPin, 
    Layers, DoorOpen, Search, Filter, CheckCircle2,
    AlertCircle, Info, ChevronDown, ChevronUp, User, CreditCard,
    TrendingUp, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "../../components/ThemeToggle";
import ConfirmationModal from "../../components/ConfirmationModal";
import AlertModal from "../../components/AlertModal";
import { z } from "zod";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "../../context/ThemeContext";
import Toast from "../../components/Toast";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AMENITIES_LIST = [
    "WiFi", "AC", "Power Backup", "Parking", "CCTV", 
    "Laundry", "Food", "Geyser", "Gym", "Clean Service"
];

const pgSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Building Name is required")
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be 3-100 characters")
    .regex(/^[a-zA-Z0-9\s.\-&]+$/, "Only letters, numbers, spaces, ., -, & allowed")
    .refine(val => val.trim().length > 0, "Only spaces are not allowed"),
  address: z.string()
    .trim()
    .min(1, "Address is required")
    .min(5, "Address must be at least 5 characters")
    .max(60, "Address must be max 60 characters")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Only letters, numbers, spaces, and hyphens (-) allowed"),
  city: z.string()
    .trim()
    .min(1, "City is required")
    .min(2, "City must be at least 2 characters")
    .max(30, "City must be max 30 characters")
    .regex(/^[a-zA-Z\s]+$/, "Only alphabets and spaces are allowed"),
  state: z.string()
    .trim()
    .min(1, "State is required")
    .min(2, "State must be at least 2 characters")
    .max(30, "State must be max 30 characters")
    .regex(/^[a-zA-Z\s]+$/, "Only alphabets and spaces are allowed"),
  pincode: z.string()
    .min(1, "Pincode is required")
    .length(6, "Pincode must be exactly 6 digits")
    .regex(/^[0-9]{6}$/, "Pincode must be exactly 6 digits (numbers only)"),
  total_floors: z.number({ 
    required_error: "Total Floors is required",
    invalid_type_error: "Total Floors must be a number" 
  }).int("Floors must be an integer")
    .min(1, "Minimum 1 floor required")
    .max(99, "Maximum 99 floors"),
  security_deposit: z.number({ 
    required_error: "Security Deposit is required",
    invalid_type_error: "Security Deposit must be a number" 
  }).min(0, "Deposit cannot be negative"),
  maintenance_amount: z.number({ invalid_type_error: "Amount must be a number" })
    .min(0, "Amount cannot be negative")
    .optional(),
  maintenance_type: z.enum(["one_time", "monthly"], {
    errorMap: () => ({ message: "Select maintenance type" })
  }).optional().nullable(),
  gender_type: z.enum(["MALE", "FEMALE", "CO-LIVING"], {
    errorMap: () => ({ message: "Allowed values: Male, Female, Co-Living" })
  }),
  amenities: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DELETED"]),
  description: z.string().optional(),
  support_contact: z.string()
    .trim()
    .min(1, "Support contact is required")
    .length(10, "Must be exactly 10 digits")
    .regex(/^[0-9]+$/, "Only numbers allowed"),
  owner_id: z.string().uuid(),
}).refine((data) => {
  if (data.maintenance_amount > 0 && !data.maintenance_type) {
    return false;
  }
  return true;
}, {
  message: "Maintenance type is required when amount is specified",
  path: ["maintenance_type"]
});

const PGs = () => {
  const {
    isDark, loading, showModal, setShowModal,
    editingPg, setEditingPg, currentStep, setCurrentStep,
    searchTerm, setSearchTerm, formErrors, setFormErrors,
    isSubmitting, toast, setToast, showArchived, setShowArchived,
    statusConfirm, setStatusConfirm, archiveConfirm, setArchiveConfirm,
    restoreConfirm, setRestoreConfirm, hardDeleteConfirm, setHardDeleteConfirm,
    expandedPgId, setExpandedPgId, hasAttemptedProceed, setHasAttemptedProceed,
    formData, setFormData,
    handleInputChange, handleAmenityToggle, handleBlur, handleFocus,
    handleNextStep, handleSubmit, resetForm, handleEdit,
    handleDelete, handleRestore, confirmRestore, confirmArchive,
    handlePermanentDelete, confirmHardDelete, handleStatusChange, confirmStatusChange,
    displayPgs, stepErrors
  } = usePGs(pgSchema);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 relative">
      <Toast 
        isOpen={!!toast}
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Property Analytics</h1>
          <p className={cn("mt-1 flex items-center gap-2 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            <Building2 size={16} /> Real-time database synchronization active
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <ThemeToggle className="hidden md:flex" />
          <button 
            onClick={() => { resetForm(); setCurrentStep(1); setShowModal(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm"
          >
            <Plus size={18} />
            Create Property
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setShowArchived(false)}
            className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                !showArchived 
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg" 
                    : isDark ? "bg-slate-800 border-white/5 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            )}
          >
              Active
          </button>
          <button 
            onClick={() => setShowArchived(true)}
            className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2",
                showArchived 
                    ? "bg-rose-600 text-white border-rose-600 shadow-lg" 
                    : isDark ? "bg-slate-800 border-white/5 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            )}
          >
              <Info size={14} />
              Archived
          </button>
      </div>

      <div className={cn("backdrop-blur-md rounded-[2rem] overflow-hidden shadow-2xl border", isDark ? "bg-slate-900/50 border-white/5" : "bg-white border-slate-200")}>
        <div className={cn("p-6 border-b flex flex-col md:flex-row gap-4 justify-between items-center", isDark ? "border-white/5 bg-white/5" : "border-slate-100 bg-slate-50")}>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or city..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn("w-full border rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-sm", isDark ? "bg-slate-800/80 border-white/5 text-white" : "bg-white border-slate-200 text-slate-900")} 
            />
          </div>
          <div className={cn("hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-widest", isDark ? "text-slate-400" : "text-slate-500")}>
             <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                 Total: <span className={isDark ? "text-white" : "text-slate-900"}>{displayPgs.length}</span>
             </div>
          </div>
        </div>

        {/* Blocked Action Modals */}
        <AlertModal 
            isOpen={statusConfirm.isOpen && statusConfirm.blocked}
            onClose={() => setStatusConfirm({ isOpen: false, pg: null, newStatus: "", isLoading: false, blocked: false })}
            title="Action Blocked"
            message={statusConfirm.blockReason}
            type="error"
        />

        <AlertModal 
            isOpen={archiveConfirm.isOpen && archiveConfirm.blocked}
            onClose={() => setArchiveConfirm({ isOpen: false, pgId: null, isLoading: false, blocked: false })}
            title="Action Blocked"
            message={archiveConfirm.blockReason}
            type="error"
        />

        <PGDesktopTable 
        displayPgs={displayPgs}
        expandedPgId={expandedPgId}
        setExpandedPgId={setExpandedPgId}
        isDark={isDark}
        showArchived={showArchived}
        handleRestore={handleRestore}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleStatusChange={handleStatusChange}
        resetForm={resetForm}
        setCurrentStep={setCurrentStep}
        setShowModal={setShowModal}
      />
      
      <PGMobileList 
        displayPgs={displayPgs}
        expandedPgId={expandedPgId}
        setExpandedPgId={setExpandedPgId}
        isDark={isDark}
        showArchived={showArchived}
        handleRestore={handleRestore}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleStatusChange={handleStatusChange}
        resetForm={resetForm}
        setCurrentStep={setCurrentStep}
        setShowModal={setShowModal}
      />
    </div>
      <PGFormModal 
        showModal={showModal}
        setShowModal={setShowModal}
        isDark={isDark}
        editingPg={editingPg}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        handleSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        handleInputChange={handleInputChange}
        handleBlur={handleBlur}
        handleFocus={handleFocus}
        formErrors={formErrors}
        AMENITIES_LIST={AMENITIES_LIST}
        handleAmenityToggle={handleAmenityToggle}
        handleNextStep={handleNextStep}
        isSubmitting={isSubmitting}
      />
      
      {/* Side Error Notification */}
      <AnimatePresence>
        {showModal && hasAttemptedProceed && Object.keys(stepErrors).length > 0 && (
            <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="fixed top-24 right-8 z-[200] w-72"
            >
                <div className="bg-white dark:bg-slate-800 border-l-4 border-rose-500 p-4 rounded-r-2xl shadow-2xl flex gap-3 items-start animate-pulse-slow">
                    <div className="bg-rose-500/10 p-2 rounded-lg">
                        <AlertCircle size={20} className="text-rose-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Step {currentStep} Incomplete</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                            We found {Object.keys(stepErrors).length} issues. Please review the highlighted fields in the current step.
                        </p>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={statusConfirm.isOpen}
        onClose={() => setStatusConfirm({ isOpen: false, pg: null, newStatus: "", isLoading: false, blocked: false })}
        onConfirm={statusConfirm.blocked ? () => setStatusConfirm({ isOpen: false, pg: null, newStatus: "", isLoading: false, blocked: false }) : confirmStatusChange}
        title={statusConfirm.blocked ? "Action Blocked" : "Change Property Status?"}
        message={statusConfirm.blocked 
            ? statusConfirm.blockReason 
            : `Are you sure you want to change "${statusConfirm.pg?.name}" to ${statusConfirm.newStatus}?`}
        confirmText={statusConfirm.blocked ? "Close" : "Update Status"}
        cancelText={statusConfirm.blocked ? null : "Cancel"}
        isLoading={statusConfirm.isLoading}
        type={statusConfirm.blocked ? 'danger' : (statusConfirm.newStatus === 'ACTIVE' ? 'success' : 'warning')}
      />

      <ConfirmationModal 
        isOpen={archiveConfirm.isOpen}
        onClose={() => setArchiveConfirm({ isOpen: false, pgId: null, isLoading: false, blocked: false })}
        onConfirm={archiveConfirm.blocked ? () => setArchiveConfirm({ isOpen: false, pgId: null, isLoading: false, blocked: false }) : confirmArchive}
        title={archiveConfirm.blocked ? "Action Blocked" : "Archive Property?"}
        message={archiveConfirm.blocked 
            ? archiveConfirm.blockReason 
            : "Are you sure you want to archive this property? This will suspend all room inventory and preserve financial data."}
        confirmText={archiveConfirm.blocked ? "Close" : "Archive"}
        cancelText={archiveConfirm.blocked ? null : "Cancel"}
        isLoading={archiveConfirm.isLoading}
        type="warning"
      />

      <ConfirmationModal 
        isOpen={restoreConfirm.isOpen}
        onClose={() => setRestoreConfirm({ isOpen: false, pg: null, isLoading: false })}
        onConfirm={confirmRestore}
        title="Restore Property?"
        message={`Restore "${restoreConfirm.pg?.name?.split(" (Archived")[0]}" to active status? All rooms will be set to AVAILABLE.`}
        confirmText="Restore"
        isLoading={restoreConfirm.isLoading}
        type="success"
      />

      <ConfirmationModal 
        isOpen={hardDeleteConfirm.isOpen}
        onClose={() => setHardDeleteConfirm({ isOpen: false, pg: null, isLoading: false, inputValue: "", confirmCode: "", error: "" })}
        onConfirm={confirmHardDelete}
        title="Permanent Delete"
        subtitle="This action is irreversible"
        message={`This will permanently remove "${hardDeleteConfirm.pg?.name?.split(" (Archived")[0]}" and all associated data. This action is irreversible.`}
        confirmText="Permanently Delete"
        isLoading={hardDeleteConfirm.isLoading}
        type="danger"
        needsInput={true}
        inputValue={hardDeleteConfirm.inputValue}
        onInputChange={(val) => setHardDeleteConfirm(prev => ({ ...prev, inputValue: val, error: "" }))}
        inputPlaceholder={`Type "${hardDeleteConfirm.confirmCode}" to confirm`}
        inputLabel={`TYPE "${hardDeleteConfirm.confirmCode}"`}
        inputError={hardDeleteConfirm.error}
      />
    </div>
  );
};

export default PGs;
