import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "../ConfirmationModal";
import { useTheme } from "../../context/ThemeContext";
import { useUnifiedStay } from "../../hooks/useUnifiedStay";
import { Step1Personal } from "./Step1Personal";
import { Step2Stay } from "./Step2Stay";
import Toast from "../Toast";

const UnifiedStayManager = ({ isOpen, onClose, onSuccess, initialData = null }: any) => {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const {
        step, loading, errors, setErrors, pgs, rooms, beds, formData, setFormData,
        handleInputChange, handleNext, handleBack, handleSubmit,
        showSelectionHint, setShowSelectionHint, handleClose,
        toast, setToast
    } = useUnifiedStay(initialData, isOpen, onClose, onSuccess);

    const [resetConfirm, setResetConfirm] = useState(false);

    const handleDisabledClick = () => {
        setShowSelectionHint(true);
        setTimeout(() => setShowSelectionHint(false), 3000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] ${isDark ? "bg-slate-900 border border-white/10" : "bg-white"}`}
            >
                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-[#070b14]">
                    <div>
                        <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                            {initialData ? "Edit Resident Profile" : "Unified Stay Manager"}
                        </h2>
                        <p className="text-xs text-gray-500">
                            {initialData ? "Update resident info and assignment" : "Onboard new residents efficiently"}
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-center mb-6">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>1</div>
                        <div className={`w-12 h-1 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`} />
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>2</div>
                    </div>

                    <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <Step1Personal
                                    key="step1"
                                    formData={formData}
                                    handleInputChange={handleInputChange}
                                    errors={errors}
                                    theme={theme}
                                    isDark={isDark}
                                />
                            )}
                            {step === 2 && (
                                <Step2Stay
                                    key="step2"
                                    formData={formData}
                                    handleInputChange={handleInputChange}
                                    errors={errors}
                                    theme={theme}
                                    isDark={isDark}
                                    pgs={pgs}
                                    rooms={rooms}
                                    beds={beds}
                                    showSelectionHint={showSelectionHint}
                                    handleDisabledClick={handleDisabledClick}
                                    initialData={initialData}
                                    setFormData={setFormData}
                                    setErrors={setErrors}
                                />
                            )}
                        </AnimatePresence>
                    </form>
                </div>

                <div className="p-5 border-t border-gray-200 dark:border-white/10 flex justify-between bg-gray-50 dark:bg-[#070b14] relative z-20">
                    {step === 2 && (
                        <button onClick={handleBack} className="px-5 py-2.5 rounded-xl font-bold bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20 transition-all flex items-center gap-2">
                            Back
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setResetConfirm(true)}
                        className="px-5 py-2.5 rounded-xl font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                    >
                        Reset Data
                    </button>

                    <button
                        onClick={step === 1 ? handleNext : handleSubmit}
                        disabled={loading}
                        className="px-8 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? "Processing..." : step === 1 ? "Next Step" : "Complete Onboarding"}
                    </button>
                </div>
            </motion.div>
            <ConfirmationModal
                isOpen={resetConfirm}
                onClose={() => setResetConfirm(false)}
                onConfirm={() => {
                    localStorage.removeItem("unifiedStayManager_draft");
                    // Form reset implies closing or resetting via hook. A simple page reload or onClose works.
                    window.location.reload();
                }}
                title="Reset All Data?"
                message="Are you sure you want to reset the onboarding form?"
                confirmText="Yes, Reset Everything"
                type="danger"
            />
            <Toast
                isOpen={toast.isOpen}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, isOpen: false })}
            />
        </div>
    );
};

export default UnifiedStayManager;
