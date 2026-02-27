import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Building2, X, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const PGFormModal = ({
  showModal, setShowModal, isDark, editingPg, currentStep, setCurrentStep,
  handleSubmit, formData, setFormData, handleInputChange, handleBlur, handleFocus,
  formErrors, AMENITIES_LIST, handleAmenityToggle, handleNextStep,
  isSubmitting
}) => {
  return (
    <>
      {/* Modern Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className={cn("fixed inset-0 backdrop-blur-md transition-opacity", isDark ? "bg-slate-950/80" : "bg-black/40")} />
          <div className={cn("relative w-full max-w-xl border rounded-[2rem] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] overflow-hidden", "bg-[var(--bg-surface)] border-[var(--border-soft)]")}>
            
            {/* Modal Header */}
            <div className={cn("p-4 border-b flex items-center justify-between shrink-0", "border-[var(--border-soft)] bg-[var(--bg-surface)] rounded-t-[2rem]")}>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 border border-blue-500/20 shadow-sm">
                        <Building2 size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className={cn("text-lg font-bold tracking-tight", "text-[var(--text-primary)]")}>
                            {editingPg ? "Edit Property" : "Add New Property"}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className={cn("h-1.5 w-10 rounded-full transition-colors", currentStep >= 1 ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700")}></div>
                            <div className={cn("h-1.5 w-10 rounded-full transition-colors", currentStep >= 2 ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700")}></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Step {currentStep} of 2</span>
                        </div>
                    </div>
                </div>
                <button
                  onClick={() => {
                      localStorage.removeItem("pg_onboarding_draft");
                      setShowModal(false);
                  }}
                  className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-all", isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500")}
                >
                  <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 flex-1 space-y-3">
              
                {/* Step 1: Identity & Capacity */}
                {currentStep === 1 && (
                <div className="space-y-3">
                    <div className="space-y-1.5 text-left">
                        <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Building Name *</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            onFocus={handleFocus}
                            placeholder="E.g. Heritage Heights"
                            maxLength={100}
                            className={cn(
                            "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm",
                            isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                            formErrors.name && "!border-rose-500 !focus:ring-rose-500 !ring-2 !ring-rose-500/20"
                            )}
                        />
                        {formErrors.name && <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-1 animate-pulse px-1">{formErrors.name}</p>}
                    </div>

                    <div className="space-y-1.5 text-left">
                        <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Support Contact</label>
                        <input
                            name="support_contact"
                            value={formData.support_contact}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            onFocus={handleFocus}
                            placeholder="10-digit phone number"
                            maxLength={10}
                            inputMode="numeric"
                            className={cn(
                            "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm",
                            isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                            formErrors.support_contact && "!border-rose-500 !focus:ring-rose-500 !ring-2 !ring-rose-500/20"
                            )}
                        />
                        {formErrors.support_contact && <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-1 animate-pulse px-1">{formErrors.support_contact}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 text-left">
                            <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Total Floors *</label>
                            <input
                                type="text"
                                name="totalFloors"
                                value={formData.totalFloors}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                            onFocus={handleFocus}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={2}
                                placeholder="Max 99"
                                className={cn(
                                    "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm",
                                    isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                                    formErrors.totalFloors && "!border-rose-500 !focus:ring-rose-500 !ring-2 !ring-rose-500/20"
                                )}
                            />
                            {formErrors.totalFloors && <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-1 animate-pulse px-1">{formErrors.totalFloors}</p>}
                        </div>
                        <div className="space-y-1.5 text-left">
                            <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Security Deposit (Default) *</label>
                            <input
                                type="text"
                                name="securityDeposit"
                                value={formData.securityDeposit}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                            onFocus={handleFocus}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Deposit per room"
                                className={cn(
                                    "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm",
                                    isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                                    formErrors.securityDeposit && "!border-rose-500 !focus:ring-rose-500 !ring-2 !ring-rose-500/20"
                                )}
                            />
                            {formErrors.securityDeposit && <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-1 animate-pulse px-1">{formErrors.securityDeposit}</p>}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600">
                                <Info size={14} />
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Maintenance Charges</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 text-left">
                                <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Amount</label>
                                <input
                                    type="text"
                                    name="maintenanceAmount"
                                    value={formData.maintenanceAmount}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    onFocus={handleFocus}
                                    inputMode="numeric"
                                    placeholder="0"
                                    className={cn(
                                        "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm",
                                        isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                                        formErrors.maintenanceAmount && "!border-rose-500 !focus:ring-rose-500 !ring-2 !ring-rose-500/20"
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5 text-left">
                                <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Charge Type</label>
                                <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-xl h-11 border border-slate-300 dark:border-white/10 shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(f => ({ ...f, maintenanceType: 'one_time' }))}
                                        className={cn(
                                            "flex-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center",
                                            formData.maintenanceType === 'one_time' 
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]" 
                                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                        )}
                                    >
                                        One Time
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(f => ({ ...f, maintenanceType: 'monthly' }))}
                                        className={cn(
                                            "flex-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center",
                                            formData.maintenanceType === 'monthly' 
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]" 
                                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                        )}
                                    >
                                        Monthly
                                    </button>
                                </div>
                                {formErrors.maintenance_type && <p className="text-[10px] font-bold text-rose-500 mt-1">{formErrors.maintenance_type}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 text-left">
                            <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Gender Type</label>
                            <select
                                name="genderType"
                                value={formData.genderType}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                            onFocus={handleFocus}
                                className={cn(
                                    "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm",
                                    isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                                    formErrors.genderType && "border-rose-500 focus:ring-rose-500"
                                )}
                            >
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="CO-LIVING">Co-Living</option>
                            </select>
                            {formErrors.genderType && <p className="text-xs text-rose-500 mt-1">{formErrors.genderType}</p>}
                        </div>
                        <div className="space-y-1.5 text-left">
                            <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                onFocus={handleFocus}
                                className={cn(
                                    "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm",
                                    isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                                    formErrors.status && "border-rose-500 focus:ring-rose-500"
                                )}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                            {formErrors.status && <p className="text-xs text-rose-500 mt-1">{formErrors.status}</p>}
                        </div>
                    </div>
                </div>
                )}

                {/* Step 2: Location & Amenities */}
                {currentStep === 2 && (
                <div className="space-y-3">
                    <div className="space-y-1.5 text-left">
                        <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Full Address *</label>
                        <input
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            onFocus={handleFocus}
                            placeholder="Street, Area (Max 60 chars)"
                            maxLength={60}
                            className={cn(
                                "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm",
                                isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                                formErrors.address && "!border-rose-500 !focus:ring-rose-500 !ring-2 !ring-rose-500/20"
                            )}
                        />
                        {formErrors.address && <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-1 animate-pulse px-1">{formErrors.address}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5 text-left">
                            <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>City *</label>
                            <input 
                                name="city" 
                                value={formData.city} 
                                onChange={handleInputChange} 
                                onBlur={handleBlur}
                                onFocus={handleFocus}
                                placeholder="City" 
                                maxLength={30}
                                className={cn(
                                    "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm", 
                                    isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                                    formErrors.city && "!border-rose-500 !focus:ring-rose-500 !ring-2 !ring-rose-500/20"
                                )} 
                            />
                            {formErrors.city && <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-1 animate-pulse px-1">{formErrors.city}</p>}
                        </div>
                        <div className="space-y-1.5 text-left">
                            <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>State *</label>
                            <input 
                                name="state" 
                                value={formData.state} 
                                onChange={handleInputChange} 
                                onBlur={handleBlur}
                                onFocus={handleFocus}
                                placeholder="State" 
                                maxLength={30}
                                className={cn(
                                    "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm", 
                                    isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                                    formErrors.state && "!border-rose-500 !focus:ring-rose-500 !ring-2 !ring-rose-500/20"
                                )} 
                            />
                            {formErrors.state && <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-1 animate-pulse px-1">{formErrors.state}</p>}
                        </div>
                        <div className="space-y-1.5 text-left">
                            <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Pincode *</label>
                            <input 
                                name="pincode" 
                                value={formData.pincode} 
                                onChange={handleInputChange} 
                                onBlur={handleBlur}
                                onFocus={handleFocus}
                                placeholder="6 digits" 
                                maxLength={6}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className={cn(
                                    "w-full h-10 border rounded-xl px-4 focus:outline-none focus:ring-1 transition-all text-sm", 
                                    isDark ? "bg-slate-800/50 border-white/10 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500",
                                    formErrors.pincode && "!border-rose-500 !focus:ring-rose-500 !ring-2 !ring-rose-500/20"
                                )} 
                            />
                            {formErrors.pincode && <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-1 animate-pulse px-1">{formErrors.pincode}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={cn("text-xs font-medium opacity-70 ml-1", isDark ? "text-slate-300" : "text-slate-600")}>Amenities Selection</label>
                        <div className="flex flex-wrap gap-1.5 text-left">
                            {AMENITIES_LIST.map(amenity => (
                                <button
                                    key={amenity}
                                    type="button"
                                    onClick={() => handleAmenityToggle(amenity)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                        formData.amenities.includes(amenity)
                                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                            : isDark ? "bg-slate-800 border-white/5 text-slate-400 hover:text-white hover:border-white/20" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    {amenity}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                )}

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-3">
                   <button
                      type="button"
                      onClick={() => {
                          if (currentStep === 1) {
                              localStorage.removeItem("pg_onboarding_draft");
                              setShowModal(false);
                          } else {
                              setCurrentStep(1);
                          }
                      }}
                      className={cn("flex-1 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border", isDark ? "hover:bg-white/5 text-slate-300 border-white/5" : "hover:bg-slate-50 text-slate-600 border-slate-200")}
                  >
                      {currentStep === 1 ? "Cancel" : "← Back"}
                  </button>
                  {currentStep === 1 ? (
                      <button
                          type="button"
                          onClick={handleNextStep}
                          className="flex-1 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                      >
                          Next Step →
                      </button>
                  ) : (
                      <button
                          type="submit"
                          disabled={isSubmitting}
                          className={cn(
                              "flex-1 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2",
                              isSubmitting && "opacity-50 cursor-not-allowed"
                          )}
                      >
                          {isSubmitting ? <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 size={16} />}
                          {editingPg ? "Update Property" : "Create Property"}
                      </button>
                  )}
              </div>
            </form>
          </div>
        </div>
      )}

      
    </>
  );
};
