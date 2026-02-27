import { useState } from "react";
import { pgAPI } from "../services/api";
import { supabase } from "../lib/supabaseClient";

export const usePGModals = (pgs: any[], rooms: any[], fetchData: () => void, showToast: (msg: string, type?: string) => void, setLoading: (b: boolean) => void) => {
  const [statusConfirm, setStatusConfirm] = useState<{ isOpen: boolean; pg: any; newStatus: any; isLoading: boolean; blocked?: boolean; blockReason?: string }>({ isOpen: false, pg: null, newStatus: "", isLoading: false, blocked: false });
  const [archiveConfirm, setArchiveConfirm] = useState<{ isOpen: boolean; pgId: any; isLoading: boolean; blocked: boolean; blockReason?: string }>({ isOpen: false, pgId: null, isLoading: false, blocked: false });
  const [restoreConfirm, setRestoreConfirm] = useState<{ isOpen: boolean; pg: any; isLoading: boolean }>({ isOpen: false, pg: null, isLoading: false });
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState({
    isOpen: false,
    pg: null as any,
    isLoading: false,
    inputValue: "",
    confirmCode: "",
    error: ""
  });

  const handleDelete = async (id: any) => {
    const property = pgs.find(p => p.id === id);
    if (!property) return;

    // If property is already archived, trigger permanent delete instead
    const isArchived = property.status === "INACTIVE" || property.name?.includes(" (Archived - ");
    if (isArchived) {
      handlePermanentDelete(id);
      return;
    }

    try {
      setLoading(true);
      const { count, error } = await supabase
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("pg_id", id)
        .eq("status", "ACTIVE");

      if (error) throw error;

      if (count && count > 0) {
        setArchiveConfirm({
          isOpen: true,
          pgId: id,
          blocked: true,
          blockReason: `Cannot archive PG while ${count} active tenant(s) are assigned. Please move them out first.`,
          isLoading: false
        });
        return;
      }

      setArchiveConfirm({
        isOpen: true,
        pgId: id,
        blocked: false,
        isLoading: false
      });
    } catch (error: any) {
      console.error("Archive check error:", error);
      showToast("Error checking tenants: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (id: any) => {
    const property = pgs.find(p => p.id === id);
    const restoredNameCandidate = property.name.split(" (Archived - ")[0];

    // Check for name conflict before restoring
    const conflict = pgs.find(p => p.status !== 'DELETED' && p.name.toLowerCase() === restoredNameCandidate.toLowerCase());
    if (conflict) {
      showToast(`Cannot restore: An active property named "${restoredNameCandidate}" already exists.`, "error");
      return;
    }

    setRestoreConfirm({
      isOpen: true,
      pg: property,
      isLoading: false
    });
  };

  const confirmRestore = async () => {
    const { pg } = restoreConfirm;
    setRestoreConfirm(prev => ({ ...prev, isLoading: true }));
    try {
      await pgAPI.restore(pg.id);
      showToast("Property restored successfully");
      await fetchData();
    } catch (error: any) {
      showToast("Error restoring PG: " + error.message, "error");
    } finally {
      setRestoreConfirm({ isOpen: false, pg: null, isLoading: false });
    }
  };

  const confirmArchive = async () => {
    const { pgId } = archiveConfirm;
    setArchiveConfirm(prev => ({ ...prev, isLoading: true }));
    try {
      const today = new Date().toISOString().split('T')[0];
      await pgAPI.archive(pgId, today);
      showToast("Property archived successfully");
      await fetchData();
    } catch (error: any) {
      showToast("Error archiving PG: " + error.message, "error");
    } finally {
      setArchiveConfirm({ isOpen: false, pgId: null, isLoading: false, blocked: false });
    }
  };

  const handlePermanentDelete = (id: any) => {
    const property = pgs.find(p => p.id === id);
    // Use the clean name without the "(Archived - ...)" part
    const cleanName = property.name.split(" (Archived")[0];
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

    setHardDeleteConfirm({
      isOpen: true,
      pg: property,
      isLoading: false,
      inputValue: "",
      confirmCode: `${cleanName} ${randomCode}`,
      error: ""
    });
  };

  const confirmHardDelete = async () => {
    const { pg, inputValue, confirmCode } = hardDeleteConfirm;

    if (inputValue.trim().toUpperCase() !== confirmCode.toUpperCase()) {
      setHardDeleteConfirm(prev => ({ ...prev, error: "Confirmation code does not match" }));
      return;
    }

    setHardDeleteConfirm(prev => ({ ...prev, isLoading: true, error: "" }));
    try {
      await pgAPI.hardDelete(pg.id);
      showToast("Property permanently deleted");
      await fetchData();
    } catch (error: any) {
      console.error("Hard delete error:", error);
      showToast("Error permanently deleting: " + error.message, "error");
    } finally {
      setHardDeleteConfirm({ isOpen: false, pg: null, isLoading: false, inputValue: "", confirmCode: "", error: "" });
    }
  };

  const handleStatusChange = (pg: any, newStatus: any) => {
    // Stop event propagation to prevent any parent click handlers
    if (pg && newStatus) {
      // Validation: Cannot activate without room configuration
      if (newStatus === "ACTIVE") {
        const pgRooms = rooms.filter(r => (r.pg_id || r.pgId) === pg.id);
        if (pgRooms.length === 0) {
          showToast("Cannot activate property without rooms. Configure rooms first.", "error");
          return;
        }
      }

      if (newStatus === "INACTIVE" || newStatus === "MAINTENANCE") {
        const pgRooms = rooms.filter(r => (r.pg_id || r.pgId) === pg.id);
        const hasOccupants = pgRooms.some(r => (r.current_occupancy || r.currentOccupancy || 0) > 0);

        if (hasOccupants) {
          setStatusConfirm({
            isOpen: true,
            pg,
            newStatus,
            blocked: true,
            blockReason: `Cannot set property to ${newStatus} while there are active tenants. Please vacate all rooms first.`,
            isLoading: false
          });
          return;
        }
      }

      setStatusConfirm({
        isOpen: true,
        pg,
        newStatus,
        isLoading: false,
        blocked: false
      });
    }
  };

  const confirmStatusChange = async () => {
    const { pg, newStatus } = statusConfirm;
    setStatusConfirm(prev => ({ ...prev, isLoading: true }));
    try {
      await pgAPI.update(pg.id, { status: newStatus });
      showToast(`Property status updated to ${newStatus}`);
      await fetchData();
    } catch (error: any) {
      showToast("Error toggling status: " + error.message, "error");
    } finally {
      setStatusConfirm({ isOpen: false, pg: null, newStatus: "", isLoading: false, blocked: false });
    }
  };


  return {
    statusConfirm, setStatusConfirm,
    archiveConfirm, setArchiveConfirm,
    restoreConfirm, setRestoreConfirm,
    hardDeleteConfirm, setHardDeleteConfirm,
    handleDelete, handleRestore, confirmRestore, confirmArchive,
    handlePermanentDelete, confirmHardDelete, handleStatusChange, confirmStatusChange
  };
};
