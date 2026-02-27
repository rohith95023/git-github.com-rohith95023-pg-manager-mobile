import { motion } from 'framer-motion';
import { User, Phone, Briefcase, ChevronRight, Shield } from 'lucide-react';
import { PROFESSION_OPTIONS } from './schemas';
import { InputField } from './InputField';
import { cn } from './utils';

export const Step1Personal = ({ formData, handleInputChange, errors, theme, isDark }: any) => {
    return (
        <motion.div
            key="step1"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-4"
        >
            <h3 className="text-sm font-bold uppercase text-blue-500 mb-2">Personal Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Full Name *" name="fullName" value={formData.fullName} onChange={handleInputChange} error={errors.fullName} icon={User} theme={theme} />
                <InputField label="Phone Number *" name="phone" value={formData.phone} onChange={handleInputChange} error={errors.phone} icon={Phone} theme={theme} maxLength={10} />
                <InputField label="Email Address" name="email" value={formData.email} onChange={handleInputChange} error={errors.email} icon={User} theme={theme} />

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Gender *</label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className={cn(
                            "p-2.5 rounded-xl border outline-none transition-all",
                            isDark ? "bg-slate-800 border-white/10 text-white focus:ring-blue-500/50" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/50",
                            errors.gender && "!border-rose-500 !focus:ring-rose-500/30 !ring-2 !ring-rose-500/20"
                        )}
                    >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                    {errors.gender && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{errors.gender}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Date of Birth *</label>
                    <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        className={cn(
                            "w-full p-2.5 rounded-xl border outline-none transition-all",
                            isDark ? "bg-slate-800 border-white/10 text-white focus:ring-blue-500/50" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/50",
                            errors.dob && "!border-rose-500 !focus:ring-rose-500/30 !ring-2 !ring-rose-500/20"
                        )}
                    />
                    {errors.dob && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{errors.dob}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Profession *</label>
                    <div className="relative group">
                        <select
                            name="profession"
                            value={formData.profession}
                            onChange={handleInputChange}
                            className={cn(
                                "w-full p-2.5 pl-10 rounded-xl border outline-none appearance-none transition-all cursor-pointer",
                                isDark ? "bg-slate-800 border-white/10 text-white focus:ring-blue-500/50" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/50",
                                errors.profession && "!border-rose-500 !focus:ring-rose-500/30 !ring-2 !ring-rose-500/20"
                            )}
                        >
                            <option value="">Select Profession</option>
                            {PROFESSION_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>
                    {errors.profession && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{errors.profession}</span>}
                </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-white/10 my-4" />

            <div className="flex items-center justify-between mb-2">
                <h3 className={cn(
                    "text-sm font-bold uppercase",
                    (() => {
                        const age = formData.dob ? new Date().getFullYear() - new Date(formData.dob).getFullYear() : 20;
                        return age < 16 ? "text-rose-500 animate-pulse" : "text-amber-500";
                    })()
                )}>
                    Guardian Details {formData.dob && (new Date().getFullYear() - new Date(formData.dob).getFullYear() < 16) && "(Required for Minors) *"}
                </h3>
            </div>

            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-2xl transition-all",
                (() => {
                    const age = formData.dob ? new Date().getFullYear() - new Date(formData.dob).getFullYear() : 20;
                    return age < 16 ? (isDark ? "bg-rose-500/5 ring-1 ring-rose-500/20" : "bg-rose-50 ring-1 ring-rose-500/20") : "";
                })()
            )}>
                <InputField
                    label="Guardian Name *"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleInputChange}
                    error={errors.guardianName}
                    icon={User}
                    theme={theme}
                    className={formData.dob && (new Date().getFullYear() - new Date(formData.dob).getFullYear() < 16) && !formData.guardianName ? "ring-2 ring-rose-500/20" : ""}
                />
                <InputField
                    label="Guardian Phone *"
                    name="guardianPhone"
                    value={formData.guardianPhone}
                    onChange={handleInputChange}
                    error={errors.guardianPhone}
                    icon={Phone}
                    theme={theme}
                    maxLength={10}
                    className={formData.dob && (new Date().getFullYear() - new Date(formData.dob).getFullYear() < 16) && !formData.guardianPhone ? "ring-2 ring-rose-500/20" : ""}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">ID Type *</label>
                    <select
                        name="idType"
                        value={formData.idType}
                        onChange={handleInputChange}
                        className={cn(
                            "p-2.5 rounded-xl border outline-none transition-all",
                            isDark ? "bg-slate-800 border-white/10 text-white focus:ring-blue-500/50" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-500/50",
                            errors.idType && "!border-rose-500 !focus:ring-rose-500/30 !ring-2 !ring-rose-500/20"
                        )}
                    >
                        <option value="AADHAR">Aadhaar</option>
                        <option value="PAN">PAN Card</option>
                        <option value="PASSPORT">Passport</option>
                        <option value="DL">Driving License</option>
                        <option value="VOTER">Voter ID</option>
                    </select>
                    {errors.idType && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1 block animate-pulse px-1">{errors.idType}</span>}
                </div>
                <div className="md:col-span-2">
                    <InputField label="ID Number *" name="idNumber" value={formData.idNumber} onChange={handleInputChange} error={errors.idNumber} icon={Shield} theme={theme} />
                </div>
            </div>
        </motion.div>
    );
};