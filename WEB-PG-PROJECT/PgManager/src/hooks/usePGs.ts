import { usePGModals } from "./usePGModals";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { pgAPI, roomAPI } from "../services/api";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export const usePGs = (pgSchema: any) => {

  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const [pgs, setPgs] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPg, setEditingPg] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // showToast must be defined before usePGModals as it's passed as parameter
  const showToast = (message: string, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [expandedPgId, setExpandedPgId] = useState<string | null>(null);
  const [hasAttemptedProceed, setHasAttemptedProceed] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    totalFloors: 1,
    securityDeposit: 0,
    maintenanceAmount: 0,
    maintenanceType: null,
    genderType: "CO-LIVING",
    amenities: [],
    status: "ACTIVE",
    description: "",
    support_contact: "",
  });

  const fetchData = async () => {
    try {
      const [activePgs, archivedPgs, roomsData, bedsData, tenantsData, paymentsData]: any[] = await Promise.all([
        pgAPI.getAll(),
        pgAPI.getArchived(),
        roomAPI.getAll(),
        supabase.from("beds").select("status, rooms!inner(pg_id)"),
        supabase.from("tenants").select("pg_id, status, stay_type, balance, daily_stay_details(move_in_date, vacate_date, rent_per_day, paid_amount, maintenance_amount)"),
        supabase.from("payments").select("pg_id, amount, payment_date")
      ]);

      const allPgs = [...(activePgs || []), ...(archivedPgs || [])];

      // Aggregate data for analytics
      const analytics: Record<string, any> = {};
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      allPgs.forEach((pg: any) => {
        const pgBeds = (bedsData.data || []).filter((b: any) => {
          // Handle joined room data: rooms column is an object or array depending on query result
          const room = Array.isArray(b.rooms) ? b.rooms[0] : b.rooms;
          return room?.pg_id === pg.id;
        });
        const pgTenants = (tenantsData.data || []).filter((t: any) => t.pg_id === pg.id && (t.status === 'ACTIVE' || t.status === 'INACTIVE'));
        const pgPayments = (paymentsData.data || []).filter((p: any) => p.pg_id === pg.id && new Date(p.payment_date) >= firstDayOfMonth);

        const monthlyDues = pgTenants.filter((t: any) => t.stay_type === 'MONTHLY').reduce((sum: number, t: any) => sum + Number(t.balance || 0), 0);
        const dailyDues = pgTenants.filter((t: any) => t.stay_type === 'DAILY').reduce((sum: number, t: any) => {
          const d = Array.isArray(t.daily_stay_details) ? t.daily_stay_details[0] : t.daily_stay_details;
          if (!d) return sum;

          const start = new Date(d.move_in_date);
          const end = new Date(d.vacate_date);
          let diffDays = 1;
          if (end > start) diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          const totalRent = (diffDays * Number(d.rent_per_day || 0)) + Number(d.maintenance_amount || 0);
          const balance = Math.max(0, totalRent - Number(d.paid_amount || 0));
          return sum + balance;
        }, 0);

        analytics[pg.id] = {
          totalBeds: pgBeds.length,
          occupiedBeds: pgBeds.filter((b: any) => b.status === 'OCCUPIED').length,
          residentsCount: pgTenants.filter((t: any) => t.status === 'ACTIVE').length,
          currentMonthRevenue: Math.round(pgPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)),
          pendingDues: Math.round(monthlyDues + dailyDues)
        };
      });

      setPgs(allPgs.map((pg: any) => ({ ...pg, analytics: analytics[pg.id] })));
      setRooms(roomsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const {
    statusConfirm, setStatusConfirm,
    archiveConfirm, setArchiveConfirm,
    restoreConfirm, setRestoreConfirm,
    hardDeleteConfirm, setHardDeleteConfirm,
    handleDelete, handleRestore, confirmRestore, confirmArchive,
    handlePermanentDelete, confirmHardDelete, handleStatusChange, confirmStatusChange
  } = usePGModals(pgs, rooms, () => fetchData(), showToast, setLoading);



  useEffect(() => {
    fetchData();

    // Real-time subscription
    const channel = supabase.channel('pgs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pgs' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Draft persistence for new property creation
  useEffect(() => {
    const saved = localStorage.getItem("pg_onboarding_draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setFormData(draft.formData);
        setCurrentStep(draft.currentStep);
        // Only auto-open if it was a create flow (no editingPg)
        if (!draft.editingPg) {
          setShowModal(true);
        }
      } catch (e) {
        console.error("Failed to load PG draft", e);
      }
    }
  }, []);

  useEffect(() => {
    if (showModal && !editingPg) {
      localStorage.setItem("pg_onboarding_draft", JSON.stringify({
        formData,
        currentStep,
        editingPg: null
      }));
    }
  }, [formData, currentStep, showModal, editingPg]);

  const fetchArchived = async () => {
    try {
      const archivedData = await pgAPI.getArchived();
      return archivedData || [];
    } catch (error) {
      console.error("Error fetching archived PGs:", error);
      return [];
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      resetForm();
      setCurrentStep(1);
      setShowModal(true);
      searchParams.delete("action");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Ensure state is clean on step change
  useEffect(() => {
    setHasAttemptedProceed(false);
    setFormErrors({});
  }, [currentStep]);

  const validateField = (name: string, value: any) => {
    try {
      const schemaFieldMap: Record<string, string> = {
        totalFloors: "total_floors",
        totalRooms: "total_rooms",
        genderType: "gender_type"
      };

      const schemaKey = schemaFieldMap[name] || name;
      const fieldSchema = pgSchema.shape[schemaKey];

      if (!fieldSchema) return null;

      let val = value;
      if (["totalFloors", "securityDeposit", "maintenanceAmount"].includes(name)) {
        val = value === "" ? undefined : Number(value);
      }

      const result = fieldSchema.safeParse(val);
      if (!result.success) {
        return result.error.issues[0].message;
      }

      if (name === "name") {
        const conflict = pgs.find(p => p.id !== editingPg?.id && p.name?.trim().toLowerCase() === value?.trim().toLowerCase());
        if (conflict) return "Building name already exists";
      }

      if (editingPg) {
        if (name === 'totalFloors' && Number(value) < (editingPg.total_floors || editingPg.totalFloors || 0)) {
          return `Cannot reduce below ${editingPg.total_floors || editingPg.totalFloors} floors`;
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFormErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    // Clear the error for this field when user starts fixing it
    setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let val = value;

    // Strict numeric handling for floors, deposit, maintenance, pincode, and contact
    if (['totalFloors', 'securityDeposit', 'maintenanceAmount', 'pincode', 'support_contact'].includes(name)) {
      const numericValue = value.replace(/[^0-9]/g, '');
      val = numericValue;
      if (['totalFloors', 'securityDeposit', 'maintenanceAmount'].includes(name) && numericValue !== "") {
        (val as any) = parseInt(numericValue, 10);
      }
    }

    // Alphabetic only for City and State
    if (name === 'city' || name === 'state') {
      val = value.replace(/[^a-zA-Z\s]/g, '');
    }

    // Alphanumeric + hyphens for Address
    if (name === 'address') {
      val = value.replace(/[^a-zA-Z0-9\s-]/g, '');
    }

    setFormData({ ...formData, [name]: val });

    // Proactive validation: if field has an error, re-validate immediately
    if (formErrors[name]) {
      const error = validateField(name, val);
      setFormErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev: any) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a: string) => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const validateStep1 = () => {
    try {
      const errors: Record<string, string> = {};

      // Manual business logic
      const duplicateName = pgs.find((p: any) =>
        p.id !== editingPg?.id &&
        p.name?.trim().toLowerCase() === formData.name?.trim().toLowerCase()
      );
      if (duplicateName) {
        errors.name = "Building name already exists";
      }

      if (editingPg) {
        if (Number(formData.totalFloors) < (editingPg.totalFloors || 0)) {
          errors.totalFloors = `Cannot reduce below ${editingPg.totalFloors} floors`;
        }
      }

      // Zod partial check
      const payload = {
        ...formData,
        total_floors: formData.totalFloors === ("" as any) ? undefined : Number(formData.totalFloors),
        security_deposit: formData.securityDeposit === ("" as any) ? undefined : Number(formData.securityDeposit),
        maintenance_amount: formData.maintenanceAmount === ("" as any) ? undefined : Number(formData.maintenanceAmount),
        maintenance_type: formData.maintenanceType,
        gender_type: formData.genderType,
        owner_id: (user as any)?.id || "00000000-0000-0000-0000-000000000000",
        address: "Valid Address Placeholder", // Skip address check for step 1
        city: "Valid City",
        state: "Valid State",
        pincode: "123456"
      };

      const result = pgSchema.safeParse(payload);

      if (!result.success) {
        result.error.issues.forEach((issue: any) => {
          const field = issue.path[0];
          const fieldMap: Record<string, string> = {
            total_floors: "totalFloors",
            security_deposit: "securityDeposit",
            maintenance_amount: "maintenanceAmount",
            maintenance_type: "maintenanceType",
            gender_type: "genderType"
          };
          const mappedField = fieldMap[field] || field;

          if (["name", "totalFloors", "securityDeposit", "maintenanceAmount", "maintenanceType", "genderType", "status", "support_contact"].includes(mappedField) && !errors[mappedField]) {
            errors[mappedField] = issue.message;
          }
        });
      }

      return { isValid: Object.keys(errors).length === 0, errors };
    } catch (err) {
      console.error("Step 1 validation error:", err);
      return { isValid: false, errors: { general: "Validation failed" } };
    }
  };

  const handleNextStep = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const validation = validateStep1();
    if (validation.isValid) {
      setCurrentStep(2);
    } else {
      setFormErrors(validation.errors);
      setHasAttemptedProceed(true);
    }
  };

  const validateForm = () => {
    try {
      const errors: Record<string, string> = {};
      if (!(user as any)?.id) throw new Error("User identity not found");

      // Duplicate checks
      const duplicateName = pgs.find((p: any) =>
        p.id !== editingPg?.id && p.name?.trim().toLowerCase() === formData.name?.trim().toLowerCase()
      );
      if (duplicateName) errors.name = "Building name already exists";

      const pgRooms = rooms.filter((r: any) => (r.pgId || r.pg_id) === editingPg?.id);
      if (editingPg) {
        if (Number(formData.totalFloors) < (editingPg.totalFloors || 0)) errors.totalFloors = `Min ${editingPg.totalFloors} floors`;
        if (formData.status === "ACTIVE" && pgRooms.length === 0) errors.status = "Add rooms first";
      }

      // Final Zod check
      const payload = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        description: formData.description,
        status: formData.status,
        support_contact: formData.support_contact,
        owner_id: (user as any).id,
        total_floors: Number(formData.totalFloors),
        security_deposit: Number(formData.securityDeposit),
        maintenance_amount: Number(formData.maintenanceAmount),
        maintenance_type: formData.maintenanceType,
        gender_type: formData.genderType,
        amenities: formData.amenities
      };

      const result = pgSchema.safeParse(payload);
      if (!result.success) {
        result.error.issues.forEach((err: any) => {
          const field = err.path[0];
          if (!errors[field]) errors[field] = err.message;
        });
      }

      setFormErrors(errors);
      return { success: Object.keys(errors).length === 0, data: payload, errors };
    } catch (error: any) {
      console.error("Validation error:", error);
      setFormErrors({ general: error.message });
      return { success: false, errors: { general: error.message } };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      handleNextStep();
      return;
    }
    console.log("Submitting form with data:", formData);

    if (!user) {
      showToast("Session expired. Please login again.", "error");
      return;
    }

    const validation = validateForm();
    setHasAttemptedProceed(true);
    if (!validation.success) {
      console.warn("PG Validation Failed:", validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPg) {
        await pgAPI.update(editingPg.id, validation.data);
        showToast("Property updated successfully");
      } else {
        await pgAPI.create(validation.data);
        showToast("Property Created Successfully");
      }
      await fetchData(); // Force refresh local state
      localStorage.removeItem("pg_onboarding_draft");
      setShowModal(false);
      setEditingPg(null);
      resetForm();
    } catch (error: any) {
      console.error("PG saving error:", error);
      showToast("Error saving property: " + (error.message || "Unknown error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setHasAttemptedProceed(false);
    setFormData({
      name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      totalFloors: 1,
      securityDeposit: 0,
      maintenanceAmount: 0,
      maintenanceType: null,
      genderType: "CO-LIVING",
      amenities: [],
      status: "ACTIVE",
      description: "",
      support_contact: "",
    });
    setFormErrors({});
  };

  const handleEdit = (pg: any) => {
    setEditingPg(pg);
    setFormData({
      name: pg.name,
      address: pg.address,
      city: pg.city,
      state: pg.state,
      pincode: pg.pincode,
      totalFloors: pg.total_floors || pg.totalFloors || 1,
      securityDeposit: pg.security_deposit || 0,
      maintenanceAmount: pg.maintenance_amount || 0,
      maintenanceType: pg.maintenance_type || null,
      genderType: pg.gender_type || pg.genderType || "CO-LIVING",
      amenities: pg.amenities || [],
      status: pg.status || "ACTIVE",
      description: pg.description || "",
      support_contact: pg.support_contact || "",
    });
    setCurrentStep(1);
    setShowModal(true);
  };

  const displayPgs = useMemo(() => {
    return pgs.map((pg: any) => {
      const pgRooms = rooms.filter((r: any) => (r.pg_id || r.pgId) === pg.id);
      const totalRooms = pgRooms.length;
      const occupiedRooms = pgRooms.filter((r: any) => (r.current_occupancy || r.currentOccupancy || 0) > 0).length;
      const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      return {
        ...pg,
        computedRooms: totalRooms,
        computedAvailable: pgRooms.filter(r => r.status === "AVAILABLE" || r.status === "PARTIAL").length,
        occupancy
      };
    }).filter(pg => {
      const matchesSearch = pg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pg.city?.toLowerCase().includes(searchTerm.toLowerCase());

      const isArchived = pg.status === "INACTIVE" || pg.name?.includes(" (Archived - ");

      if (showArchived) {
        return isArchived && matchesSearch;
      }
      return !isArchived && matchesSearch && pg.status !== "INACTIVE";
    });
  }, [pgs, rooms, searchTerm, showArchived]);

  const stepErrors = useMemo(() => {
    const step1Fields = ["name", "totalFloors", "securityDeposit", "maintenanceAmount", "maintenanceType", "genderType", "status", "support_contact"];
    const step2Fields = ["address", "city", "state", "pincode"];

    const relevantFields = currentStep === 1 ? step1Fields : step2Fields;
    const currentErrors = {};

    Object.keys(formErrors).forEach(key => {
      if (relevantFields.includes(key) && formErrors[key]) {
        (currentErrors as any)[key] = formErrors[key];
      }
    });

    return currentErrors;
  }, [formErrors, currentStep]);


  return {
    isDark, pgs, rooms, loading, setLoading, showModal, setShowModal,
    editingPg, setEditingPg, currentStep, setCurrentStep,
    searchTerm, setSearchTerm, formErrors, setFormErrors,
    isSubmitting, toast, setToast, showArchived, setShowArchived,
    statusConfirm, setStatusConfirm, archiveConfirm, setArchiveConfirm,
    restoreConfirm, setRestoreConfirm, hardDeleteConfirm, setHardDeleteConfirm,
    expandedPgId, setExpandedPgId, hasAttemptedProceed, setHasAttemptedProceed,
    formData, setFormData,
    fetchData, fetchArchived, validateField, handleBlur, handleFocus,
    showToast, handleInputChange, handleAmenityToggle, validateStep1,
    handleNextStep, validateForm, handleSubmit, resetForm, handleEdit,
    handleDelete, handleRestore, confirmRestore, confirmArchive,
    handlePermanentDelete, confirmHardDelete, handleStatusChange, confirmStatusChange,
    displayPgs, stepErrors
  };

};
