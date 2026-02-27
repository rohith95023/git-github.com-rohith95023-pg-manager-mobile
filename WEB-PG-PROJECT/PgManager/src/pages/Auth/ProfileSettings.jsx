import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Camera, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Clock,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X,
  Sun,
  Moon
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const ProfileSettings = () => {
    const { fetchProfile } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";
    const navigate = useNavigate();
    
    const [isEditing, setIsEditing] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [toast, setToast] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // Auth and DB profile state
    const [authUser, setAuthUser] = useState(null);
    const [profileUser, setProfileUser] = useState(null);

    // Profile form state
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        role: "",
        gender: "",
        dob: "",
        created_at: "",
        last_sign_in_at: ""
    });

    // Password form state
    const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
    const [pwdData, setPwdData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [pwdErrors, setPwdErrors] = useState({});
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [showOldPwd, setShowOldPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setAuthUser(user);

            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (profile) setProfileUser(profile);

            setFormData({
                full_name: profile?.full_name || user?.user_metadata?.full_name || "",
                email: user.email || "",
                phone: profile?.phone || user?.user_metadata?.phone || "",
                role: profile?.role || user?.user_metadata?.role || "USER",
                gender: profile?.gender || user?.user_metadata?.gender || "",
                dob: profile?.dob || user?.user_metadata?.dob || "",
                created_at: user.created_at || "",
                last_sign_in_at: user.last_sign_in_at || ""
            });
        };
        loadInitialData();
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        let val = value;
        
        if (name === "phone") {
            val = value.replace(/[^0-9]/g, '').slice(0, 10);
        }
        if (name === "full_name") {
            val = value.slice(0, 40);
        }
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleProfileSubmit = async (e) => {
        e?.preventDefault?.();
        setLoadingProfile(true);
        try {
            if (!authUser) throw new Error("Not authenticated");

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    gender: formData.gender,
                    dob: formData.dob || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', authUser.id);

            if (error) throw error;

            if (fetchProfile) await fetchProfile(authUser.id);
            showToast("Profile updated successfully!");
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast(error.message || "Failed to update profile", "error");
        } finally {
            setLoadingProfile(false);
        }
    };

    // Password Validation
    const validatePassword = (pwd) => {
        const errors = [];
        if (pwd.length < 8) errors.push("Min 8 chars");
        if (!/[A-Z]/.test(pwd)) errors.push("1 uppercase");
        if (!/[a-z]/.test(pwd)) errors.push("1 lowercase");
        if (!/[0-9]/.test(pwd)) errors.push("1 number");
        return errors;
    };

    const calculateStrength = (pwd) => {
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[a-z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        return score; // 0 to 4
    };

    const pwdStrength = calculateStrength(pwdData.newPassword);

    const handlePwdChange = (e) => {
        const { name, value } = e.target;
        setPwdData(prev => ({ ...prev, [name]: value }));
        
        // Clear specific error on type
        setPwdErrors(prev => ({ ...prev, [name]: null }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        const newErrors = {};
        if (!pwdData.oldPassword) newErrors.oldPassword = "Old password is required";
        
        const pwdReqs = validatePassword(pwdData.newPassword);
        if (pwdReqs.length > 0) newErrors.newPassword = `Must contain: ${pwdReqs.join(', ')}`;
        
        if (pwdData.confirmPassword !== pwdData.newPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setPwdErrors(newErrors);
            return;
        }

        setLoadingPassword(true);
        try {
            // Step 1: Reauthenticate to verify old password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: authUser.email,
                password: pwdData.oldPassword
            });

            if (signInError) {
                setPwdErrors({ oldPassword: "Old password incorrect" });
                setLoadingPassword(false);
                return;
            }

            // Step 2: Update Password
            const { error: updateError } = await supabase.auth.updateUser({
                password: pwdData.newPassword
            });

            if (updateError) throw updateError;

            showToast("Password updated successfully!");
            setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" });
            setPwdErrors({});
            setIsPasswordSectionOpen(false);

        } catch (err) {
            console.error("Password update error", err);
            showToast(err.message || "Failed to update password", "error");
        } finally {
            setLoadingPassword(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Toast */}
            {toast && (
                <div className={cn(
                    "fixed top-8 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top fade-in duration-500",
                    toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                )}>
                    {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold text-sm tracking-wide">{toast.message}</span>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                <div>
                    <h1 className={cn("text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]")}>My Profile</h1>
                    <p className={cn("mt-1 text-sm text-[var(--text-secondary)] flex items-center gap-2")}>
                        <Shield size={16} className="text-blue-500" /> Account management and security
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleTheme}
                        className={cn(
                            "p-2.5 rounded-xl border backdrop-blur-md transition-all flex justify-center items-center hover:scale-105 active:scale-95",
                            isDark ? "bg-slate-800/50 border-white/10 text-amber-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                        )}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    {!isEditing && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-sm"
                        >
                            Edit Profile
                        </button>
                    )}
                    <button 
                        onClick={() => navigate(-1)}
                        className={cn(
                            "p-2.5 rounded-xl border backdrop-blur-md transition-all flex justify-center items-center hover:scale-105 active:scale-95 sm:relative", 
                            isDark ? "bg-slate-800/50 border-white/10 text-white hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                        )}
                        aria-label="Close Profile"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Profile Detail Card */}
            <div className={cn(
                "backdrop-blur-md rounded-[1.5rem] overflow-hidden shadow-xl border p-6 md:p-8 relative",
                isDark ? "bg-slate-900/40 border-slate-700/50 shadow-slate-900/50" : "bg-white border-slate-200"
            )}>
                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4 relative z-10 mb-8">
                    <div className="relative group">
                        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl md:text-5xl font-black shadow-2xl ring-4 ring-blue-500/20">
                            {formData.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        {isEditing && (
                            <button className="absolute bottom-0 right-0 p-2.5 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-white/10 text-blue-600 hover:scale-110 transition-transform">
                                <Camera size={20} />
                            </button>
                        )}
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">{formData.full_name || "User Name"}</h2>
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20 mt-2 inline-block">
                            {formData.role || "USER"}
                        </span>
                    </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/20 to-transparent my-6 relative z-10" />

                {/* Form Section */}
                <form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 relative z-10">
                    <div className="space-y-1.5 ">
                        <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1 flex items-center gap-2">
                            <User size={14} className="text-blue-500" /> Full Name
                        </label>
                        <input 
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleProfileChange}
                            disabled={!isEditing}
                            maxLength={40}
                            className={cn(
                                "w-full h-11 border rounded-xl px-4 focus:outline-none focus:ring-2 transition-all font-semibold",
                                isDark ? "bg-slate-800/60 border-slate-700/50 text-white focus:ring-blue-500/50" : "bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20",
                                !isEditing && "opacity-70 cursor-not-allowed border-transparent bg-transparent pl-2 ring-0 shadow-none font-bold"
                            )}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1 flex items-center gap-2">
                            <Mail size={14} className="text-blue-500" /> Email Address
                        </label>
                        <div title="Email cannot be changed for security reasons.">
                            <input 
                                type="email"
                                name="email"
                                value={formData.email}
                                disabled={true}
                                className={cn(
                                    "w-full h-11 border rounded-xl px-4 focus:outline-none focus:ring-2 transition-all font-semibold opacity-60 cursor-not-allowed",
                                    isDark ? "bg-slate-800/30 border-slate-700/30 text-white" : "bg-slate-100 border-slate-200 text-slate-900",
                                    !isEditing && "bg-transparent border-transparent pl-2 opacity-70 shadow-none font-bold"
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1 flex items-center gap-2">
                            <Phone size={14} className="text-blue-500" /> Phone Number
                        </label>
                        <input 
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleProfileChange}
                            disabled={!isEditing}
                            maxLength={10}
                            inputMode="numeric"
                            className={cn(
                                "w-full h-11 border rounded-xl px-4 focus:outline-none focus:ring-2 transition-all font-semibold",
                                isDark ? "bg-slate-800/60 border-slate-700/50 text-white focus:ring-blue-500/50" : "bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20",
                                !isEditing && "opacity-70 cursor-not-allowed border-transparent bg-transparent pl-2 ring-0 shadow-none font-bold"
                            )}
                        />
                    </div>

                    <div className="space-y-1.5 flex gap-3 flex-col sm:flex-row h-full">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1 flex items-center gap-2">
                                <User size={14} className="text-blue-500" /> Gender
                            </label>
                            <select 
                                name="gender"
                                value={formData.gender}
                                onChange={handleProfileChange}
                                disabled={!isEditing}
                                className={cn(
                                    "w-full h-11 border rounded-xl px-4 focus:outline-none focus:ring-2 transition-all font-semibold",
                                    isDark ? "bg-slate-800/60 border-slate-700/50 text-white focus:ring-blue-500/50" : "bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20",
                                    !isEditing && "opacity-70 cursor-not-allowed border-transparent bg-transparent pl-2 text-left appearance-none ring-0 shadow-none font-bold"
                                )}
                            >
                                <option value="">Not specified</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                            </select>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1 flex items-center gap-2">
                                <Calendar size={14} className="text-blue-500" /> Date of Birth
                            </label>
                            <input 
                                type="date"
                                name="dob"
                                value={formData.dob}
                                onChange={handleProfileChange}
                                disabled={!isEditing}
                                max={new Date().toISOString().split("T")[0]}
                                className={cn(
                                    "w-full h-11 border rounded-xl px-4 focus:outline-none focus:ring-2 transition-all font-semibold  [&::-webkit-calendar-picker-indicator]:dark:invert",
                                    isDark ? "bg-slate-800/60 border-slate-700/50 text-white focus:ring-blue-500/50" : "bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20",
                                    !isEditing && "opacity-70 cursor-not-allowed border-transparent bg-transparent pl-2 appearance-none [&::-webkit-calendar-picker-indicator]:hidden ring-0 shadow-none font-bold"
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 mt-2 pt-4 border-t border-[var(--border-color)]">
                        <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1 flex items-center gap-2">
                            <Calendar size={14} className="text-slate-500" /> Account Created At
                        </label>
                        <p className={cn("px-2 text-sm font-semibold opacity-70", isDark ? "text-slate-300" : "text-slate-700")}>
                            {formatDate(formData.created_at)}
                        </p>
                    </div>

                    <div className="space-y-1.5 mt-2 pt-4 border-t border-[var(--border-color)]">
                        <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1 flex items-center gap-2">
                            <Clock size={14} className="text-slate-500" /> Last Login
                        </label>
                        <p className={cn("px-2 text-sm font-semibold opacity-70", isDark ? "text-slate-300" : "text-slate-700")}>
                            {formatDate(formData.last_sign_in_at)}
                        </p>
                    </div>

                    {isEditing && (
                        <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-[var(--border-color)] mt-4">
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    // Reset effectively via re-firing component load or state
                                }}
                                className="px-6 py-2.5 rounded-xl font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={loadingProfile}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-black transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                {loadingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Save Changes
                            </button>
                        </div>
                    )}
                </form>
            </div>


            {/* Passwords Section */}
            <div className={cn(
                "backdrop-blur-md rounded-[1.5rem] overflow-hidden shadow-xl border transition-all duration-300",
                isDark ? "bg-slate-900/40 border-slate-700/50" : "bg-white border-slate-200",
                isPasswordSectionOpen ? "min-h-[400px]" : "h-20"
            )}>
                <button 
                    onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)}
                    className="w-full h-20 px-6 md:px-8 flex items-center justify-between hover:bg-slate-500/5 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Lock size={20} className="group-hover:scale-110 transition-transform"/>
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">Change Password</h2>
                            <p className="text-xs text-[var(--text-secondary)] font-medium">Securely update your account authorization.</p>
                        </div>
                    </div>
                    <div>
                        {isPasswordSectionOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                    </div>
                </button>

                <div className={cn("px-6 md:px-8 pb-8 transition-opacity duration-300 delay-100", isPasswordSectionOpen ? "opacity-100 visible h-auto" : "opacity-0 invisible h-0 overflow-hidden hidden")}>
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/20 to-transparent mb-6" />

                    <form onSubmit={handlePasswordSubmit} className="max-w-md mx-auto space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1">
                                Old Password
                            </label>
                            <div className="position-relative relative">
                                <input 
                                    type={showOldPwd ? "text" : "password"}
                                    name="oldPassword"
                                    value={pwdData.oldPassword}
                                    onChange={handlePwdChange}
                                    className={cn(
                                        "w-full h-11 border rounded-xl px-4 pr-10 focus:outline-none focus:ring-2 transition-all font-semibold",
                                        isDark ? "bg-slate-800/60 border-slate-700/50 text-white focus:ring-blue-500/50" : "bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20",
                                        pwdErrors.oldPassword && "border-rose-500 focus:ring-rose-500/50"
                                    )}
                                />
                                <button type="button" onClick={() => setShowOldPwd(!showOldPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">
                                    {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {pwdErrors.oldPassword && <p className="text-rose-500 text-xs font-bold pl-1">{pwdErrors.oldPassword}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1">
                                New Password
                            </label>
                            <div className="position-relative relative">
                                <input 
                                    type={showNewPwd ? "text" : "password"}
                                    name="newPassword"
                                    value={pwdData.newPassword}
                                    onChange={handlePwdChange}
                                    className={cn(
                                        "w-full h-11 border rounded-xl px-4 pr-10 focus:outline-none focus:ring-2 transition-all font-semibold",
                                        isDark ? "bg-slate-800/60 border-slate-700/50 text-white focus:ring-blue-500/50" : "bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20",
                                        pwdErrors.newPassword && "border-rose-500 focus:ring-rose-500/50"
                                    )}
                                />
                                <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">
                                    {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {pwdData.newPassword && (
                                <div className="flex gap-1 mt-2 pl-1 h-1.5">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className={cn("h-full flex-1 rounded-full",
                                            pwdStrength >= i ? (
                                                pwdStrength === 1 ? "bg-rose-500" :
                                                pwdStrength === 2 ? "bg-amber-500" :
                                                pwdStrength === 3 ? "bg-blue-500" : "bg-emerald-500"
                                            ) : isDark ? "bg-slate-800" : "bg-slate-200"
                                        )} />
                                    ))}
                                </div>
                            )}
                            {pwdErrors.newPassword && <p className="text-rose-500 text-xs font-bold pl-1">{pwdErrors.newPassword}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1">
                                Confirm New Password
                            </label>
                            <input 
                                type="password"
                                name="confirmPassword"
                                value={pwdData.confirmPassword}
                                onChange={handlePwdChange}
                                className={cn(
                                    "w-full h-11 border rounded-xl px-4 focus:outline-none focus:ring-2 transition-all font-semibold",
                                    isDark ? "bg-slate-800/60 border-slate-700/50 text-white focus:ring-blue-500/50" : "bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20",
                                    pwdErrors.confirmPassword && "border-rose-500 focus:ring-rose-500/50"
                                )}
                            />
                            {pwdErrors.confirmPassword && <p className="text-rose-500 text-xs font-bold pl-1">{pwdErrors.confirmPassword}</p>}
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                type="submit"
                                disabled={loadingPassword || !pwdData.oldPassword || !pwdData.newPassword || !pwdData.confirmPassword}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-2.5 rounded-xl font-black transition-all shadow-xl shadow-rose-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                            >
                                {loadingPassword ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Confirmation Modal overlay */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={cn(
                        "w-full max-w-sm md:max-w-md rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200",
                        isDark ? "bg-slate-900 border border-slate-700 shadow-xl shadow-slate-950/50" : "bg-white border border-slate-200"
                    )}>
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
                        <h2 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2.5 text-[var(--text-primary)]">
                            <AlertCircle className="text-blue-500" strokeWidth={2.5} size={24} /> 
                            Confirm Changes
                        </h2>
                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-8 leading-relaxed ml-1">
                            Are you sure you want to save these profile changes? This will modify your personal details across the application.
                        </p>
                        <div className="flex justify-end gap-3 w-full">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-all active:scale-95"
                                disabled={loadingProfile}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { setShowConfirmModal(false); handleProfileSubmit(e); }}
                                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
                                disabled={loadingProfile}
                            >
                                {loadingProfile ? <Loader2 className="animate-spin" size={18} /> : null}
                                Yes, Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ProfileSettings;
