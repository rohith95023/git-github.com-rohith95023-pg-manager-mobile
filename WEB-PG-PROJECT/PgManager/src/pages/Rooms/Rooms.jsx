import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { roomAPI, pgAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";
import { 
    Plus,
    Trash2,
    DoorOpen,
    LayoutGrid,
    Bed as BedIcon,
    Search,
    Filter,
    Pencil,
    Check,
    IndianRupee,
    Clock,
    ShieldAlert,
    Lock,
    AlertCircle,
    Building2,
    Layers,
    X,
    ChevronRight,
    AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "../../context/ThemeContext";
import HierarchySelector from "../../components/HierarchySelector";
import AmountInput from "../../components/AmountInput";
import ThemeToggle from "../../components/ThemeToggle";
import ConfirmationModal from "../../components/ConfirmationModal";
import AlertModal from "../../components/AlertModal";
import Toast from "../../components/Toast";
import BedsManagement from "./BedsManagement";
import RoomFormModal from "./RoomFormModal";
import { RoomListComponents } from "./RoomListComponents";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const roomSchema = z.object({
  pgId: z.string().uuid("Please select a valid property"),
  floorNumber: z.number().int().min(1, "Floor must be at least 1"),
  roomNumber: z.string()
    .trim()
    .min(1, "Room number is required")
    .max(7, "Room number cannot exceed 7 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Alphanumeric characters only (no special characters)"),
  roomType: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "FOUR_SHARE", "FIVE_SHARE", "OTHERS"]),
  capacity: z.number().int().min(1, "Minimum 1 bed required").max(99, "Maximum 99 beds"),
  monthlyRent: z.number()
    .min(500, "Rent must be at least ₹500")
    .max(9999999, "Rent cannot exceed 7 digits (₹99,99,999)")
    .refine(val => !isNaN(val) && val > 0, "Rent must be a positive number"),
  status: z.enum(["AVAILABLE", "FULL", "PARTIAL", "MAINTENANCE", "INACTIVE"]),
});

const Rooms = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "beds" ? "beds" : "rooms";
  const [activeTab, setActiveTab] = useState(initialTab); // "rooms" or "beds"

  // Persist tab state to URL search parameters
  useEffect(() => {
    setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set("tab", activeTab);
        return newParams;
    }, { replace: true });
  }, [activeTab, setSearchParams]);

  const [rooms, setRooms] = useState([]);
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState({ isOpen: false, room: null, newStatus: "", isLoading: false, blocked: false });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, roomId: null, isLoading: false, blocked: false });
  const [filterPg, setFilterPg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightPg, setHighlightPg] = useState(false);
  const [highlightFloor, setHighlightFloor] = useState(false);
  const [toast, setToast] = useState(null);
  const fetchTimeoutRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const [floorOptions, setFloorOptions] = useState([]);
  const [formData, setFormData] = useState({
    pgId: "",
    floorNumber: "",
    roomNumber: "",
    roomType: "SINGLE",
    capacity: 1,
    currentOccupancy: 0,
    monthlyRent: "",
    status: "AVAILABLE",
  });

  const getRoomConfig = (type) => {
    switch (type) {
        case "SINGLE": return { capacity: 1, label: "1 Share" };
        case "DOUBLE": return { capacity: 2, label: "2 Share" };
        case "TRIPLE": return { capacity: 3, label: "3 Share" };
        case "FOUR_SHARE": return { capacity: 4, label: "4 Share" };
        case "FIVE_SHARE": return { capacity: 5, label: "5 Share" };
        case "OTHERS": return { capacity: "", label: "Others" };
        default: return { capacity: 1, label: "1 Share" };
    }
  };

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [roomsRes, activePgs, archivedPgs] = await Promise.all([
        roomAPI.getAll(),
        pgAPI.getAll(),
        pgAPI.getArchived(),
      ]);
      // Only update rooms if we got valid data (prevent accidental clearing)
      if (roomsRes && Array.isArray(roomsRes)) {
        setRooms(roomsRes);
      }
      
      const combinedPgs = [...(activePgs || []), ...(archivedPgs || [])];
      setPgs(combinedPgs);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);

    const channel = supabase.channel('rooms-page-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        // Debounce realtime updates to prevent race conditions
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => fetchData(false), 300);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => fetchData(false), 300);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pgs' }, () => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => fetchData(false), 300);
      })
      .subscribe();

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleStatusChange = (room, selectedAdminStatus) => {
    // Check if property is archived
    // If room.pgs is not populated, we fallback to finding it in the pgs state array
    const selectedPg = room.pgs || pgs.find(p => p.id === (room.pg_id || room.pgId));
    
    if (selectedPg && selectedPg.status === "INACTIVE") {
        setStatusConfirm({
            isOpen: true,
            room,
            newStatus: "",
            isLoading: false,
            blocked: true,
            blockReason: "This property is currently ARCHIVED. Room inventory is locked - please restore the property first to modify room status."
        });
        return;
    }

    // If selecting ACTIVE, we default to AVAILABLE and let recalculateOccupancy fix it if needed,
    // or we calculate it optimistically.
    let targetStatus = selectedAdminStatus;
    
    // Logic: If user selects "ACTIVE", we infer the correct occupancy status 
    // to avoid stuck "ACTIVE" state if backend doesn't recalculate immediately.
    // However, for the dropdown value, "ACTIVE" maps to AVAILABLE/FULL/PARTIAL.
    // So if we write "AVAILABLE" to DB, the dropdown will show "ACTIVE".
    
    const currentOccupancy = room.current_occupancy || room.currentOccupancy || 0;
    
    if (selectedAdminStatus === 'ACTIVE') {
        if (currentOccupancy >= room.capacity && room.capacity > 0) targetStatus = 'FULL';
        else if (currentOccupancy > 0) targetStatus = 'PARTIAL';
        else targetStatus = 'AVAILABLE';
    }

    if (currentOccupancy > 0 && (selectedAdminStatus === "MAINTENANCE" || selectedAdminStatus === "INACTIVE")) {
        setStatusConfirm({
            isOpen: true,
            room,
            newStatus: targetStatus,
            displayStatus: selectedAdminStatus,
            isLoading: false,
            // Changed from blocked: true to allow after warning
            isWarning: true,
            warning: `This room has ${currentOccupancy} active tenant(s). Setting it to ${selectedAdminStatus} will mark all EMPTY beds as ${selectedAdminStatus === 'MAINTENANCE' ? 'Maintenance' : 'Unavailable'}, but current tenants will remain assigned. Continue?`
        });
        return;
    }

    setStatusConfirm({
        isOpen: true,
        room,
        newStatus: targetStatus,
        displayStatus: selectedAdminStatus, // For the modal message
        isLoading: false
    });
  };

  const confirmStatusChange = async () => {
    const { room, newStatus } = statusConfirm;
    setStatusConfirm(prev => ({ ...prev, isLoading: true }));
    try {
      await roomAPI.update(room.id, { status: newStatus });
      
      // Cascade status to beds for logical sync
      if (newStatus === "MAINTENANCE" || newStatus === "INACTIVE") {
          // Mark all non-occupied beds as MAINTENANCE when room goes offline
          await supabase.from("beds")
            .update({ status: "MAINTENANCE" })
            .eq("room_id", room.id)
            .neq("status", "OCCUPIED");
      } else if (["AVAILABLE", "FULL", "PARTIAL"].includes(newStatus)) {
          // Restore maintenance beds to AVAILABLE when room comes back online
          await supabase.from("beds")
            .update({ status: "AVAILABLE" })
            .eq("room_id", room.id)
            .eq("status", "MAINTENANCE");
      }

      showToast(`Room status updated to ${newStatus}`);
      fetchData(false);
    } catch (error) {
      showToast("Error updating status: " + error.message, "error");
    } finally {
      setStatusConfirm({ isOpen: false, room: null, newStatus: "", isLoading: false });
    }
  };

  const handlePGSelection = (pgId) => {
    const selectedPg = pgs.find(p => p.id === pgId);
    
    if (selectedPg) {
        const totalFloors = selectedPg.total_floors || selectedPg.totalFloors || 0;
        const floors = Array.from({ length: totalFloors }, (_, i) => i + 1);
        setFloorOptions(floors);
        
        setFormData(prev => ({
          ...prev,
          pgId,
          floorNumber: "",
          roomNumber: ""
        }));
    } else {
        setFloorOptions([]);
        setFormData(prev => ({
          ...prev,
          pgId: "",
          floorNumber: "",
          roomNumber: ""
        }));
    }

    if (formErrors.pgId) setFormErrors(prev => ({ ...prev, pgId: null }));
    if (formErrors.floorNumber) setFormErrors(prev => ({ ...prev, floorNumber: null }));
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    let val = value;
    
    if (type === 'number') {
        val = value === "" ? "" : parseFloat(value);
    }

    if (name === "monthlyRent") {
        const digitsOnly = value.replace(/[^0-9]/g, '');
        if (digitsOnly.length > 7) return;
        val = digitsOnly;
    }

    if (name === "roomNumber") {
        val = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7).toUpperCase();
    }
    
    if (name === "roomType") {
        const config = getRoomConfig(val);
        setFormData(prev => ({ ...prev, [name]: val, capacity: config.capacity }));
    } else if (name === "capacity") {
        const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 2);
        setFormData(prev => ({ ...prev, [name]: digitsOnly === "" ? "" : Number(digitsOnly) }));
    } else if (name === "floorNumber") {
        setFormData(prev => ({ ...prev, [name]: val === "" ? "" : Number(val) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: val }));
    }

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  useEffect(() => {
    if (formData.pgId && formData.floorNumber && !editingRoom) {
      const existingInPg = rooms.filter(r => (r.pg_id || r.pgId) === formData.pgId && (r.floor || r.floorNumber || r.floor_number) === formData.floorNumber);
      const nextIndex = existingInPg.length + 1;
      const suggested = `${formData.floorNumber}${nextIndex.toString().padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, roomNumber: suggested }));
    }
  }, [formData.pgId, formData.floorNumber, rooms, editingRoom]);

  const validateRoom = async () => {
    const errors = {};
    const selectedPg = pgs.find(p => p.id === formData.pgId);

    if (!formData.pgId) {
        errors.pgId = "Property selection required";
    } else if (selectedPg && selectedPg.status !== "ACTIVE") {
        errors.pgId = "Cannot add rooms to an INACTIVE property";
    }

    const totalFloors = selectedPg ? (selectedPg.total_floors || selectedPg.totalFloors || 0) : 0;
    if (selectedPg && (Number(formData.floorNumber) < 1 || Number(formData.floorNumber) > totalFloors)) {
        errors.floorNumber = `Valid floor range: 1 to ${totalFloors}`;
    } else if (!formData.floorNumber) {
        errors.floorNumber = "Floor is required";
    }

    if (formData.roomNumber) {
        const isDuplicate = rooms.some(r => 
            (r.pg_id || r.pgId) === formData.pgId && 
            String(r.room_number || r.roomNumber || '').trim().toLowerCase() === String(formData.roomNumber).trim().toLowerCase() &&
            (!editingRoom || r.id !== editingRoom.id)
        );
        if (isDuplicate) {
            errors.roomNumber = `Room ${formData.roomNumber} already exists in this property`;
        }
    } else {
        errors.roomNumber = "Room number is required";
    }

    const result = roomSchema.safeParse({
        ...formData,
        floor: Number(formData.floorNumber) || 0,
        capacity: Number(formData.capacity) || 1,
        monthlyRent: Number(formData.monthlyRent) || 0,
        status: formData.status || "AVAILABLE"
    });

    if (!result.success) {
        result.error.issues.forEach((issue) => {
            const field = issue.path[0];
            if (!errors[field]) {
                errors[field] = issue.message;
            }
        });
    }

    setFormErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validation = await validateRoom();
    if (!validation.isValid) return;

    setIsSubmitting(true);
    try {
      const payload = {
        room_number: formData.roomNumber.trim().toUpperCase(),
        pg_id: formData.pgId,
        floor: parseInt(formData.floorNumber),
        room_type: formData.roomType,
        capacity: formData.capacity,
        rent: parseFloat(formData.monthlyRent),
        deposit: 0,
        status: editingRoom ? formData.status : "AVAILABLE",
        updated_at: new Date().toISOString()
      };

      if (editingRoom) {
        await roomAPI.update(editingRoom.id, payload);
        showToast("Room updated successfully!");
      } else {
        await roomAPI.create(payload);
        showToast("Room created successfully!");
      }
      await fetchData();
      setShowModal(false);
      setEditingRoom(null);
      resetForm();
    } catch (error) {
      console.error("Error saving room:", error);
      showToast(error.message || "Failed to save room", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      pgId: "",
      floorNumber: "",
      roomNumber: "",
      roomType: "SINGLE",
      capacity: 1,
      currentOccupancy: 0,
      monthlyRent: "",
      status: "AVAILABLE",
    });
    setFormErrors({});
    setFloorOptions([]);
  };

  // Handle create action from FAB
  useEffect(() => {
    if (!loading && searchParams.get("create") === "true") {
        if (pgs.length === 0) {
            showToast("No properties available. Create a property first.", "error");
        } else {
            resetForm();
            setShowModal(true);
        }
        
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.delete("create");
            return newParams;
        }, { replace: true });
    }
  }, [loading, searchParams, pgs]);

  const handleEdit = (room) => {
    // Check if property is archived
    const selectedPg = room.pgs || pgs.find(p => p.id === (room.pg_id || room.pgId));
    if (selectedPg && selectedPg.status === "INACTIVE") {
        setStatusConfirm({
            isOpen: true,
            room,
            newStatus: "",
            isLoading: false,
            blocked: true,
            blockReason: "This property is currently ARCHIVED. Room details are locked - please restore the property first to make changes."
        });
        return;
    }

    setEditingRoom(room);
    if (selectedPg) {
        const totalFloors = selectedPg.total_floors || selectedPg.totalFloors || 0;
        const floors = Array.from({ length: totalFloors }, (_, i) => i + 1);
        setFloorOptions(floors);
    }

    setFormData({
      roomNumber: room.room_number || room.roomNumber,
      pgId: room.pg_id || room.pgId,
      floorNumber: room.floor || room.floorNumber || room.floor_number,
      roomType: room.room_type || room.roomType,
      capacity: room.capacity,
      currentOccupancy: room.current_occupancy || room.currentOccupancy,
      monthlyRent: (room.rent || room.monthlyRent)?.toString() || "",
      status: room.status,
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    const room = rooms.find(r => r.id === id);
    if (!room) return;

    // Check if property is archived
    const selectedPg = room.pgs || pgs.find(p => p.id === (room.pg_id || room.pgId));
    if (selectedPg && selectedPg.status === "INACTIVE") {
        setDeleteConfirm({
            isOpen: true,
            roomId: id,
            blocked: true,
            blockReason: "This property is currently ARCHIVED. Room deletion is prohibited - please restore the property first.",
            isLoading: false
        });
        return;
    }

    if ((room.current_occupancy || room.currentOccupancy) > 0) {
        setDeleteConfirm({
            isOpen: true,
            roomId: id,
            blocked: true,
            blockReason: "Cannot delete room while it is occupied. Please vacate the room first.",
            isLoading: false
        });
        return;
    }

    setDeleteConfirm({
        isOpen: true,
        roomId: id,
        blocked: false,
        isLoading: false
    });
  };

  const confirmDelete = async () => {
    const { roomId } = deleteConfirm;
    setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
    try {
      await roomAPI.delete(roomId);
      showToast("Room deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Error deleting room:", error);
      showToast(error.message || "Failed to delete room", "error");
    } finally {
      setDeleteConfirm({ isOpen: false, roomId: null, isLoading: false, blocked: false });
    }
  };

  const viewRooms = rooms.filter((room) => {
    const matchesPg = filterPg ? (room.pg_id || room.pgId) === filterPg : true;
    const isArchived = room.pgs?.status === "INACTIVE" ||
                       room.pgs?.status === "DELETED" || 
                       room.pgs?.name?.includes(" (Archived - ");
    
    return matchesPg && (showArchived ? isArchived : !isArchived);
  });

  const filteredRooms = viewRooms.filter((room) => {
    const matchesSearch = (room.room_number || room.roomNumber)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          room.pgs?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 relative">
      <Toast 
        isOpen={!!toast}
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 text-left">
          <div>
            <h1 className={cn("text-2xl md:text-4xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {activeTab === "rooms" ? "Room Management" : "Bed Management"}
            </h1>
            <p className={cn("mt-1 text-sm font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
              Dependent hierarchy system: PG → Floor → Room → Bed
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className={cn("flex p-1 rounded-xl w-fit border", isDark ? "bg-slate-900/50 border-white/5" : "bg-slate-100 border-slate-200")}>
              <button 
                  onClick={() => setActiveTab("rooms")}
                  className={cn(
                      "px-6 py-2 rounded-lg text-xs font-semibold transition-all px-8",
                      activeTab === "rooms" 
                          ? "bg-blue-600 text-white shadow-lg" 
                          : isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                  )}
              >
                  Rooms
              </button>
              <button 
                  onClick={() => setActiveTab("beds")}
                  className={cn(
                      "px-6 py-2 rounded-lg text-xs font-semibold transition-all px-8",
                      activeTab === "beds" 
                          ? "bg-blue-600 text-white shadow-lg" 
                          : isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                  )}
              >
                  Beds
              </button>
            </div>

            <div className={cn("flex p-1 rounded-xl w-fit border", isDark ? "bg-slate-900/50 border-white/5" : "bg-slate-100 border-slate-200")}>
              <button 
                  onClick={() => setShowArchived(false)} 
                  className={cn(
                      "px-6 py-2 rounded-lg text-xs font-semibold transition-all px-8",
                      !showArchived 
                          ? "bg-blue-600 text-white shadow-lg" 
                          : isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                  )}
              >
                  Available
              </button>
              <button 
                  onClick={() => setShowArchived(true)} 
                  className={cn(
                      "px-6 py-2 rounded-lg text-xs font-semibold transition-all px-8",
                      showArchived 
                          ? "bg-rose-600 text-white shadow-lg" 
                          : isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                  )}
              >
                  Archives
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-auto">
          <ThemeToggle className="hidden md:flex" />
          {activeTab === "rooms" && (
              <button 
                  onClick={() => { 
                      if (pgs.length === 0) {
                          showToast("No properties available. Create a property first.", "error");
                          return;
                      }
                      setFilterPg("");
                      resetForm(); 
                      setShowModal(true); 
                  }}
                  className={cn(
                      "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg text-sm active:scale-95",
                      pgs.length === 0 
                        ? "bg-slate-500/20 text-slate-500 cursor-not-allowed border border-slate-500/20 shadow-none"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                  )}
              >
                  <Plus size={18} />
                  Add New Room
              </button>
          )}
        </div>
      </div>

      {/* Blocked Action Modals */}
      <AlertModal 
        isOpen={statusConfirm.isOpen && statusConfirm.blocked}
        onClose={() => setStatusConfirm({ isOpen: false, room: null, newStatus: "", isLoading: false, blocked: false })}
        title="Action Blocked"
        message={statusConfirm.blockReason}
        type="error"
      />

      <AlertModal 
        isOpen={deleteConfirm.isOpen && deleteConfirm.blocked}
        onClose={() => setDeleteConfirm({ isOpen: false, roomId: null, isLoading: false, blocked: false })}
        title="Action Blocked"
        message={deleteConfirm.blockReason}
        type="error"
      />

      {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
      ) : activeTab === "rooms" ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Total Rooms", value: viewRooms.length, icon: DoorOpen, color: "blue" },
                    { label: "Available", value: viewRooms.filter(r => r.status === "AVAILABLE" || r.status === "PARTIAL").length, icon: LayoutGrid, color: "emerald" },
                    { label: "Occupied", value: viewRooms.filter(r => r.status === "FULL").length, icon: BedIcon, color: "rose" }
                ].map((stat, i) => (
                    <div key={i} className={cn("p-4 rounded-2xl border flex items-center gap-4 transition-all hover:scale-[1.02]", "bg-[var(--bg-surface)] border-[var(--border-soft)] shadow-sm")}>
                        <div className={cn("h-10 w-11 rounded-xl flex items-center justify-center border", `bg-${stat.color}-500/10 text-${stat.color}-500 border-${stat.color}-500/20`)}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className={cn("text-[9px] font-bold uppercase tracking-widest leading-none mb-1", "text-[var(--text-muted)]")}>{stat.label}</p>
                            <p className={cn("text-2xl font-bold", "text-[var(--text-primary)]")}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className={cn("backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border", "bg-[var(--bg-surface)]/90 border-[var(--border-soft)]")}>
                <div className={cn("p-5 border-b flex flex-col md:flex-row gap-4", "border-[var(--border-soft)] bg-[var(--bg-surface)]")}>
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search room, property..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn("w-full border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm", "bg-[var(--input-bg)] border-[var(--border-soft)] text-[var(--text-primary)]")}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                            <Filter size={18} className="text-slate-500" />
                            <select 
                                value={filterPg}
                                onChange={(e) => setFilterPg(e.target.value)}
                                className={cn("border rounded-2xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm min-w-[180px]", isDark ? "bg-slate-800/50 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                            >
                                <option value="">All Properties</option>
                                {pgs.map(pg => (
                                    <option key={pg.id} value={pg.id}>
                                        {pg.name} {pg.status === 'INACTIVE' ? '(Archived)' : ''}
                                    </option>
                                ))}
                            </select>
                            {(filterPg || searchTerm) && (
                                <button 
                                    onClick={() => { setFilterPg(""); setSearchTerm(""); }}
                                    className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                    title="Clear All Filters"
                                >
                                    <X size={18} />
                                </button>
                            )}
                            {pgs.length === 0 && !loading && (
                                <div className="flex items-center gap-2 px-2 animate-bounce">
                                    <AlertCircle size={14} className="text-rose-500" />
                                    <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">No Properties Mapped</span>
                                </div>
                            )}
                    </div>
                </div>

                
                <RoomListComponents 
                    filteredRooms={filteredRooms}
                    pgs={pgs}
                    isDark={isDark}
                    getRoomConfig={getRoomConfig}
                    handleStatusChange={handleStatusChange}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    resetForm={resetForm}
                    setShowModal={setShowModal}
                    setFilterPg={setFilterPg}
                />
</div>
        </>
      ) : (
        <BedsManagement 
            isDark={isDark} 
            pgs={pgs} 
            showArchived={showArchived}
            filterPg={filterPg}
            setFilterPg={setFilterPg}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
        />
      )}

      
      <RoomFormModal 
          showModal={showModal}
          setShowModal={setShowModal}
          isDark={isDark}
          formData={formData}
          formErrors={formErrors}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          editingRoom={editingRoom}
          pgs={pgs}
          floorOptions={floorOptions}
          setHighlightPg={setHighlightPg}
          setHighlightFloor={setHighlightFloor}
          highlightPg={highlightPg}
          highlightFloor={highlightFloor}
          getRoomConfig={getRoomConfig}
          handlePGSelection={handlePGSelection}
      />
      <AnimatePresence>
        {showModal && Object.keys(formErrors).length > 0 && (
            <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="fixed top-24 right-8 z-[200] w-80"
            >
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[24px] shadow-2xl flex gap-4 items-start border-l-4 border-l-rose-500">
                    <div className="bg-rose-500/10 p-2.5 rounded-2xl shrink-0">
                        <AlertCircle size={20} className="text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">Form Incomplete</p>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
                            We found {Object.keys(formErrors).length} issues. Please review the highlighted fields to proceed.
                        </p>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={statusConfirm.isOpen && !statusConfirm.blocked}
        onClose={() => setStatusConfirm({ isOpen: false, room: null, newStatus: "", isLoading: false, blocked: false })}
        onConfirm={confirmStatusChange}
        title={statusConfirm.isWarning ? "Occupancy Warning" : "Update Room Status?"}
        message={statusConfirm.isWarning
                ? statusConfirm.warning
                : statusConfirm.displayStatus 
                    ? `Are you sure you want to set Room ${statusConfirm.room?.room_number || statusConfirm.room?.roomNumber} to ${statusConfirm.displayStatus}?` 
                    : `Are you sure you want to change Room ${statusConfirm.room?.room_number || statusConfirm.room?.roomNumber} to ${statusConfirm.newStatus}?`}
        confirmText={statusConfirm.isWarning ? "Confirm Anyway" : "Update Status"}
        cancelText="Cancel"
        isLoading={statusConfirm.isLoading}
        type={statusConfirm.isWarning ? 'warning' : (statusConfirm.newStatus === 'AVAILABLE' || statusConfirm.displayStatus === 'ACTIVE' ? 'success' : 'warning')}
      />

      <ConfirmationModal 
        isOpen={deleteConfirm.isOpen && !deleteConfirm.blocked}
        onClose={() => setDeleteConfirm({ isOpen: false, roomId: null, isLoading: false, blocked: false })}
        onConfirm={confirmDelete}
        title="Delete Room?"
        message="Are you sure you want to delete this room? This will also delete all beds in this room. This action is irreversible."
        confirmText="Delete Room"
        cancelText="Cancel"
        isLoading={deleteConfirm.isLoading}
        type="danger"
      />
    </div>
  );
};

export default Rooms;
