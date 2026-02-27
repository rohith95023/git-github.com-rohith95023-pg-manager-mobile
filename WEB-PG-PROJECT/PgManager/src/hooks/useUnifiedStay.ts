import { useState, useEffect } from "react";
import { pgAPI } from "../api/pg.api";
import { roomAPI } from "../api/room.api";
import { bedAPI } from "../api/bed.api";
import { tenantAPI } from "../api/tenant.api";
import { tenantService } from "../services/tenant.service";
import { personalDetailsSchema, stayDetailsSchema } from "../components/UnifiedStayManager/schemas";

export const useUnifiedStay = (initialData: any, isOpen: boolean, onClose: () => void, onSuccess: (action: string, paid: boolean) => void) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [pgs, setPgs] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [showSelectionHint, setShowSelectionHint] = useState(false);
    const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" as "success" | "error" | "warning" | "info" });

    const getInitialFormData = () => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("unifiedStayManager_draft");
            if (saved && !initialData) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse draft", e);
                }
            }
        }
        return {
            fullName: "", email: "", phone: "", gender: "MALE", dob: "", profession: "",
            guardianName: "", guardianPhone: "", idType: "AADHAR", idNumber: "",
            stayType: "MONTHLY", joinedDate: new Date().toISOString().split("T")[0], vacateDate: "",
            rentPaymentType: "FIXED_FIRST_DAY", rentAmount: "", maintenanceAmount: "0", maintenanceType: "", securityDeposit: "0",
            pgId: "", roomId: "", bedId: "", paidAmount: "", paymentMethod: "CASH"
        };
    };

    const [formData, setFormData] = useState<any>(getInitialFormData());

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setErrors({});
            if (initialData) {
                setFormData({
                    fullName: initialData.full_name || "", email: initialData.email || "", phone: initialData.phone || "",
                    gender: initialData.gender || "MALE", dob: initialData.dob || "", profession: initialData.profession || "",
                    guardianName: initialData.guardian_name || "", guardianPhone: initialData.guardian_phone || "",
                    idType: initialData.id_type || "AADHAR", idNumber: initialData.id_number || "",
                    stayType: initialData.stay_type || "MONTHLY",
                    joinedDate: initialData.move_in_date || new Date().toISOString().split("T")[0], vacateDate: initialData.vacate_date || "",
                    rentPaymentType: initialData.rent_cycle || "FIXED_FIRST_DAY", rentAmount: String(initialData.custom_rent || initialData.rent_per_month || initialData.rent_per_day || ""),
                    maintenanceAmount: String(initialData.maintenance_amount || "0"), maintenanceType: initialData.maintenance_type || "",
                    securityDeposit: String(initialData.security_deposit || "0"),
                    pgId: initialData.pg_id || "", roomId: initialData.room_id || "", bedId: initialData.bed_id || "",
                    paidAmount: "", paymentMethod: "CASH"
                });
            } else {
                setFormData(getInitialFormData());
            }
            fetchPGs();
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (isOpen && !initialData) {
            localStorage.setItem("unifiedStayManager_draft", JSON.stringify(formData));
        }
    }, [formData, isOpen, initialData]);

    const fetchPGs = async () => {
        try {
            const data = await pgAPI.getActive();
            setPgs(data || []);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        if (formData.pgId) {
            roomAPI.getActiveByPgId(formData.pgId).then(data => setRooms(data || [])).catch(console.error);
        } else {
            setRooms([]);
        }
    }, [formData.pgId]);

    useEffect(() => {
        if (formData.roomId) {
            bedAPI.getByRoomId(formData.roomId).then(data => {
                const sorted = (data || []).sort((a: any, b: any) => {
                    if (a.status === "AVAILABLE" && b.status !== "AVAILABLE") return -1;
                    if (a.status !== "AVAILABLE" && b.status === "AVAILABLE") return 1;
                    return String(a.bed_number).localeCompare(String(b.bed_number), undefined, { numeric: true });
                });
                setBeds(sorted);
                setFormData((prev: any) => {
                    if (prev.bedId && !sorted.find((b: { id: any; }) => b.id === prev.bedId)) return { ...prev, bedId: "" };
                    return prev;
                });
            }).catch(console.error);
        } else {
            setBeds([]);
        }
    }, [formData.roomId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let val = value;

        if (name === "phone" || name === "guardianPhone") val = val.replace(/\D/g, "").slice(0, 10);
        if (name === "fullName" || name === "guardianName") val = val.replace(/[^a-zA-Z\s.]/g, "");
        if (name === "idNumber" && formData.idType === "AADHAR") val = val.replace(/\D/g, "").slice(0, 12);
        if (["rentAmount", "securityDeposit", "paidAmount", "maintenanceAmount"].includes(name)) val = val.replace(/\D/g, "").slice(0, 7);

        setFormData((prev: any) => {
            const next = { ...prev, [name]: val };
            if (name === "stayType") {
                if (val === "DAILY") {
                    next.maintenanceAmount = "0"; next.securityDeposit = "0"; next.rentPaymentType = "JOIN_DATE_BASED";
                } else if (val === "MONTHLY") {
                    const pg = pgs.find(p => p.id === next.pgId);
                    next.maintenanceAmount = String(pg?.maintenance_amount || 0);
                    next.maintenanceType = pg?.maintenance_type || "";
                    next.securityDeposit = String(pg?.security_deposit || 0);
                }
            }
            if (name === "pgId") { next.roomId = ""; next.bedId = ""; }
            if (name === "roomId") {
                const r = rooms.find(r => r.id === val);
                const p = pgs.find(pg => pg.id === next.pgId);
                next.bedId = "";
                next.rentAmount = next.stayType === "MONTHLY" ? String(r?.rent || "") : "";
                next.maintenanceAmount = next.stayType === "MONTHLY" ? String(p?.maintenance_amount || 0) : "0";
                next.maintenanceType = next.stayType === "MONTHLY" ? p?.maintenance_type || "" : "";
                next.securityDeposit = next.stayType === "MONTHLY" ? String(p?.security_deposit || 0) : "0";
            }
            return next;
        });

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const validateStep1 = () => {
        const res = personalDetailsSchema.safeParse(formData);
        if (res.success) { setErrors({}); return true; }
        const errs: Record<string, string> = {};
        res.error.issues.forEach(i => { errs[String(i.path[0])] = i.message; });
        setErrors(errs);
        return false;
    };

    const validateStep2 = () => {
        const res = stayDetailsSchema.safeParse({ ...formData, rentAmount: Number(formData.rentAmount), securityDeposit: Number(formData.securityDeposit || 0) });
        const errs: Record<string, string> = {};
        if (!res.success) {
            res.error.issues.forEach(i => { errs[String(i.path[0])] = i.message; });
        }
        if (!formData.pgId) errs.pgId = "Property is required";
        if (!formData.roomId) errs.roomId = "Room is required";
        if (!formData.bedId) errs.bedId = "Bed is required";

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleNext = async () => {
        if (step === 1) {
            if (validateStep1()) {
                setLoading(true);
                try {
                    const dup = await tenantAPI.checkDuplicateId(formData.idType, formData.idNumber, initialData?.id);
                    if (dup) {
                        const msg = `This ${formData.idType} is already registered.`;
                        setErrors(prev => ({ ...prev, idNumber: msg }));
                        setToast({ isOpen: true, message: msg, type: "error" });
                        return;
                    }
                    setStep(2);
                } catch (err) { console.error(err); } finally { setLoading(false); }
            } else {
                setToast({ isOpen: true, message: "Oops! Some personal details are missing or incorrect. Please check the highlighted fields.", type: "error" });
            }
        }
    };

    const handleSubmit = async () => {
        if (!validateStep2()) {
            setToast({ isOpen: true, message: "Almost there! Please select a Property, Room, and Bed to complete the assignment.", type: "error" });
            return;
        }
        setLoading(true);
        try {
            const paidNow = Number(formData.paidAmount || 0);
            if (initialData?.id) {
                await tenantService.updateTenant(initialData.id, formData, initialData, paidNow);
            } else {
                await tenantService.createTenant(formData, paidNow);
            }
            localStorage.removeItem("unifiedStayManager_draft");
            onSuccess(initialData ? "updated" : "created", paidNow > 0);
            onClose();
        } catch (err: any) {
            console.error(err);
            setToast({ isOpen: true, message: err.message || "Submission Failed", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return {
        step, setStep, loading, errors, setErrors, pgs, rooms, beds, formData, setFormData,
        handleInputChange, handleNext, handleBack: () => setStep(1), handleSubmit,
        showSelectionHint, setShowSelectionHint,
        toast, setToast,
        handleClose: () => { localStorage.removeItem("unifiedStayManager_draft"); onClose(); }
    };
};
