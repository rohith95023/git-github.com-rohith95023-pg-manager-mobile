import apiClient from "./apiClient";
import { supabase } from "../lib/supabaseClient";

// Auth APIs (Mostly handled by AuthContext, but bridging here if needed)
export const authAPI = {
  login: async (credentials) => {
    // Direct call as auth is special and often handled by context directly
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    return data;
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { message: "Logged out successfully" };
  },
};

// PG APIs
export const pgAPI = {
  getAll: () => apiClient.get("pgs", "*, profiles!owner_id(full_name)", (query) => 
    query.neq("status", "DELETED")
         .neq("status", "INACTIVE")
  ),
  getActive: () => apiClient.get("pgs", (query) => query.eq("status", "ACTIVE").order("created_at", { ascending: false })),
  getArchived: () => apiClient.get("pgs", (query) => query.select("*, profiles!owner_id(full_name)").eq("status", "INACTIVE")),
  getById: (id) => apiClient.getById("pgs", id, `*, rooms(*)`),
  create: (data) => apiClient.post("pgs", data),
  update: (id, data) => apiClient.update("pgs", id, data),
  archive: async (id, nameSuffix) => {
    // 1. Get current data to get name
    const { data: pg } = await supabase.from("pgs").select("name").eq("id", id).single();
    if (!pg) throw new Error("Property not found");

    const archivedName = `${pg.name} (Archived - ${nameSuffix})`;
    
    // 2. Perform updates via RPC for atomicity and cascading status handling
    const { error } = await supabase.rpc('archive_pg_cascade', {
        p_pg_id: id,
        p_archived_name: archivedName
    });

    if (error) throw error;
    return { success: true };
  },
  restore: async (id) => {
    // 1. Get current data
    const { data: pg } = await supabase.from("pgs").select("name").eq("id", id).single();
    if (!pg) throw new Error("Property not found");

    // Remove suffix: " (Archived - YYYY-MM-DD)"
    const restoredName = pg.name.split(" (Archived - ")[0];

    // 2. Update PG status and Restore room/bed statuses via RPC
    const { error } = await supabase.rpc('restore_pg_cascade', {
        p_pg_id: id,
        p_restored_name: restoredName
    });

    if (error) throw error;
    return { success: true, name: restoredName };
  },
  hardDelete: async (id) => {
    // Perform cascading hard delete via RPC to preserve financials while purging inventory
    const { error } = await supabase.rpc('hard_delete_pg_cascade', {
        p_pg_id: id
    });
    
    if (error) throw error;
    return { success: true };
  },
};

// Floor APIs
export const floorAPI = {
  getAll: () => apiClient.get("floors", "*, pgs(name)"),
  getByPgId: (pgId) => apiClient.get("floors", "*", (query) => query.eq("pg_id", pgId).order("floor_number")),
  create: (data) => apiClient.post("floors", data),
  update: (id, data) => apiClient.update("floors", id, data),
  delete: (id) => apiClient.delete("floors", id),
};

// Room APIs
export const roomAPI = {
  getAll: () => apiClient.get("rooms", "*, pgs(status, name, security_deposit)"),
  getById: (id) => apiClient.getById("rooms", id),
  getByPgId: (pgId) => apiClient.get("rooms", "*", (query) => query.eq("pg_id", pgId).order("floor").order("room_number")),
  getActiveByPgId: (pgId) => apiClient.get("rooms", "*", (query) => query.eq("pg_id", pgId).in("status", ["AVAILABLE", "PARTIAL", "FULL"]).order("floor").order("room_number")),
  create: async (roomData) => {
    // This is handled via supabase directly to support auto-bed generation in the UI or here
    const { data: room, error } = await supabase.from("rooms").insert([roomData]).select("*, pgs(status, name, security_deposit)").single();
    if (error) throw error;

    // Auto-create beds based on capacity
    const beds = Array.from({ length: room.capacity }, (_, i) => ({
      room_id: room.id,
      bed_number: `Bed-${i + 1}`,
      status: "AVAILABLE",
      tenant_id: null
    }));

    const { error: bedError } = await supabase.from("beds").insert(beds);
    if (bedError) {
        // Rollback room creation if beds fail (if possible, or just log)
        console.error("Failed to create beds:", bedError);
        throw bedError;
    }

    return room;
  },
  update: async (id, data) => {
    if (data.capacity !== undefined) {
      const { data: currentBeds, error: fetchError } = await supabase
        .from("beds")
        .select("*")
        .eq("room_id", id)
        .order("bed_number");
        
      if (fetchError) throw fetchError;
      
      const currentCount = currentBeds.length;
      
      if (data.capacity > currentCount) {
        const bedsToAdd = data.capacity - currentCount;
        let maxBedIndex = 0;
        currentBeds.forEach(bed => {
           const match = bed.bed_number.match(/Bed-(\d+)/);
           if (match && parseInt(match[1]) > maxBedIndex) {
               maxBedIndex = parseInt(match[1]);
           }
        });
        
        const newBeds = Array.from({ length: bedsToAdd }, (_, i) => ({
          room_id: id,
          bed_number: `Bed-${maxBedIndex + i + 1}`,
          status: data.status === "MAINTENANCE" || data.status === "INACTIVE" ? "MAINTENANCE" : "AVAILABLE",
          tenant_id: null
        }));
        
        const { error: bedInsertError } = await supabase.from("beds").insert(newBeds);
        if (bedInsertError) throw bedInsertError;
      } else if (data.capacity < currentCount) {
        const bedsToRemove = currentCount - data.capacity;
        
        const emptyBeds = currentBeds
            .filter(b => b.status !== "OCCUPIED")
            .sort((a, b) => {
                const matchA = a.bed_number.match(/Bed-(\d+)/);
                const matchB = b.bed_number.match(/Bed-(\d+)/);
                const numA = matchA ? parseInt(matchA[1]) : 0;
                const numB = matchB ? parseInt(matchB[1]) : 0;
                return numB - numA;
            });
            
        if (emptyBeds.length < bedsToRemove) {
            throw new Error(`Cannot reduce capacity to ${data.capacity}. Room has ${currentCount - emptyBeds.length} occupied beds. Please vacate them first.`);
        }
        
        const bedIdsToDelete = emptyBeds.slice(0, bedsToRemove).map(b => b.id);
        const { error: bedDeleteError } = await supabase.from("beds").delete().in("id", bedIdsToDelete);
        if (bedDeleteError) throw bedDeleteError;
      }
    }
    
    const result = await apiClient.update("rooms", id, data);
    await roomAPI.recalculateOccupancy(id);
    return result;
  },
  delete: async (id) => {
    // 1. Unassign any tenants currently in this room (set to INACTIVE/Unassigned)
    const { error: tenantError } = await supabase
        .from("tenants")
        .update({ bed_id: null, room_id: null, status: "INACTIVE" })
        .eq("room_id", id);
        
    if (tenantError) {
        console.error("Error unassigning tenants during room delete:", tenantError);
        // Continue anyway if possible, or throw? better to throw if data integrity is key
    }

    // 2. Nullify references in Financial and Booking records to allow deletion without losing history
    await Promise.allSettled([
        supabase.from("payments").update({ bed_id: null, room_id: null }).eq("room_id", id),
        supabase.from("bookings").update({ bed_id: null, room_id: null }).eq("room_id", id)
    ]);

    // 3. Delete all beds associated with this room
    const { error: bedDeleteError } = await supabase
        .from("beds")
        .delete()
        .eq("room_id", id);

    if (bedDeleteError) {
         console.error("Error deleting beds:", bedDeleteError);
         throw bedDeleteError;
    }

    // 4. Finally delete the room
    return apiClient.delete("rooms", id);
  },



};

// Bed APIs
export const bedAPI = {
  getAll: () => apiClient.get("beds", "*, rooms(status, room_number, pg_id, floor, capacity, current_occupancy, pgs(status, name)), tenants:tenant_id(full_name)"),
  getById: (id) => apiClient.getById("beds", id),
  getByRoomId: (roomId) => apiClient.get("beds", "*", (query) => query.eq("room_id", roomId).order("bed_number")),
  getAvailableBedsByRoomId: (roomId) => apiClient.get("beds", "*", (query) => query.eq("room_id", roomId).eq("status", "AVAILABLE").order("bed_number")),
  create: (data) => apiClient.post("beds", data),
  update: async (id, data) => {
    // Let the database or frontend handle status-tenant consistency
    const updatedBed = await apiClient.update("beds", id, data);
    console.log("[API] bedAPI.update success:", updatedBed);
    
    if (updatedBed && (Object.prototype.hasOwnProperty.call(data, "tenant_id") || Object.prototype.hasOwnProperty.call(data, "status"))) {
        try {
            const rId = updatedBed.room_id || data.room_id;
            if (rId) {
                await roomAPI.recalculateOccupancy(rId);
            }
        } catch (occError) {
            console.warn("Occupancy recalculation failed:", occError);
        }
    }
    
    return updatedBed;
  },
  delete: async (id) => {
    // Get room_id before deleting
    const { data: bed } = await supabase.from("beds").select("room_id").eq("id", id).single();
    
    // Nullify references in Financial and Booking records
    await Promise.allSettled([
        supabase.from("payments").update({ bed_id: null }).eq("bed_id", id),
        supabase.from("bookings").update({ bed_id: null }).eq("bed_id", id),
        supabase.from("tenants").update({ bed_id: null }).eq("bed_id", id)
    ]);

    const result = await apiClient.delete("beds", id);
    if (bed) await roomAPI.recalculateOccupancy(bed.room_id);
    return result;
  },
};

// Add recalculateOccupancy to roomAPI (extending it)
roomAPI.recalculateOccupancy = async (roomId) => {
    if (!roomId) return;
    
    // 1. Get total beds (capacity)
    const { count: capacity, error: capError } = await supabase
        .from("beds")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId);

    if (capError) throw capError;

    // 2. Get occupied beds
    const { count: occupied, error: occError } = await supabase
        .from("beds")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("status", "OCCUPIED");

    if (occError) throw occError;

    // 3. Get maintenance beds
    const { count: maintenance, error: maintError } = await supabase
        .from("beds")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("status", "MAINTENANCE");

    if (maintError) throw maintError;
    
    const finalCapacity = capacity || 0;
    const finalOccupied = occupied || 0;
    const finalMaintenance = maintenance || 0;

    // Check current status to preserve administrative states
    const { data: room } = await supabase
        .from("rooms")
        .select("status, room_number")
        .eq("id", roomId)
        .single();

    let status = "AVAILABLE";
    const unavailableCount = finalOccupied + finalMaintenance;
    
    if (unavailableCount >= finalCapacity && finalCapacity > 0) {
        status = "FULL";
    } else if (finalOccupied > 0) {
        status = "PARTIAL";
    }

    // Preserve administrative states
    if (room && (room.status === "MAINTENANCE" || room.status === "INACTIVE")) {
        status = room.status;
    }

    console.log(`[Recalculate] Room ${room?.room_number}: Cap=${finalCapacity}, Occ=${finalOccupied}, Maint=${finalMaintenance} -> NewStatus=${status}`);

    const { error: updateError } = await supabase
        .from("rooms")
        .update({ 
            current_occupancy: finalOccupied, 
            status: status 
        })
        .eq("id", roomId);
        
    if (updateError) throw updateError;
    return { success: true };
};

// Tenant APIs
export const tenantAPI = {
  // Disambiguate relationships using !column_name syntax to handle potential circular references (beds <-> tenants)
  getAll: () => apiClient.get("tenants", (query) => query.select(`*, rooms!room_id(room_number), pgs!pg_id(name), beds!bed_id(bed_number)`)),
  getActive: () => apiClient.get("tenants", (query) => query.in("status", ["ACTIVE", "UPCOMING", "OVERDUE"]).select(`*, daily_stay_details(*), rooms!room_id(room_number, rent), pgs!pg_id(name), beds!bed_id(bed_number)`)),
  getById: (id) => apiClient.getById("tenants", id),
  create: async (data) => {
    // Separate Daily Stay fields from Tenant Identity fields
    const { 
        // move_in_date, // Keep in identity for sorting/migration compatibility
        vacate_date, 
        total_rent,
        paid_amount,
        balance_amount,
        ...tenantIdentity 
    } = data;

    // 1. Insert Tenant Identity (Status, PG, Room, move_in_date, maintenance fields, etc.)
    const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert([tenantIdentity])
        .select()
        .single();
    
    if (tenantError) throw tenantError;

    // 2. Insert Daily Stay Details if applicable
    if (data.stay_type === 'DAILY') {
        const { error: dailyError } = await supabase
            .from("daily_stay_details")
            .insert([{
                tenant_id: tenant.id,
                move_in_date: data.move_in_date,
                vacate_date: vacate_date,
                rent_per_day: data.rent_per_day || 0,
                total_rent: total_rent || 0,
                paid_amount: paid_amount || 0,
                balance_amount: balance_amount || total_rent || 0,
                maintenance_amount: data.maintenance_amount || 0,
                maintenance_type: data.maintenance_type || null
            }]);
        
        if (dailyError) {
            // Manual Rollback: Delete the created tenant to maintain consistency
            await supabase.from("tenants").delete().eq("id", tenant.id);
            throw dailyError;
        }
    }

    return tenant;
  },
  update: async (id, data) => {
    // 1. Update Identity Table (if non-daily fields present)
    const identityUpdates = { ...data };
    
    // Remove fields that only belong to daily_stay_details table
    const dailyExclusiveFields = ['paid_amount', 'total_rent', 'balance_amount'];
    dailyExclusiveFields.forEach(field => delete identityUpdates[field]);

    if (Object.keys(identityUpdates).length > 0) {
        const { error } = await supabase.from("tenants").update(identityUpdates).eq("id", id);
        if (error) throw error;
    }

    // 2. Update Daily Details Table (if daily fields present)
    const dailyFields = ['move_in_date', 'vacate_date', 'rent_per_day', 'paid_amount', 'total_rent', 'balance_amount', 'maintenance_amount', 'maintenance_type', 'maintenance_paid'];
    const hasDailyUpdates = dailyFields.some(field => Object.prototype.hasOwnProperty.call(data, field));
    
    if (hasDailyUpdates) {
        const dailyUpdates = {};
        dailyFields.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(data, field)) dailyUpdates[field] = data[field];
        });

        // Use tenant_id to find the record
        const { error } = await supabase.from("daily_stay_details").update(dailyUpdates).eq("tenant_id", id);
        if (error) throw error;
    }

    return { id, ...data };
  },
  delete: (id) => apiClient.delete("tenants", id),
  archive: async (id) => {
    // 1. Get tenant info to find bed
    const { data: tenant } = await supabase.from("tenants").select("bed_id, room_id").eq("id", id).single();
    
    // 2. Clear Bed assignment first (fixes foreign key issue)
    if (tenant?.bed_id) {
        await supabase.from("beds").update({ 
            tenant_id: null, 
            status: "AVAILABLE" 
        }).eq("id", tenant.bed_id);
        
        // Recalculate occupancy
        if (tenant.room_id) {
            await roomAPI.recalculateOccupancy(tenant.room_id);
        }
    }

    // 3. Mark tenant as DELETED
    return supabase.from("tenants").update({ status: "DELETED" }).eq("id", id);
  },
  getArchived: () => apiClient.get("tenants", (query) => query.eq("status", "DELETED").select(`*, rooms!room_id(room_number), pgs!pg_id(name), beds!bed_id(bed_number)`)),
  hardDelete: async (id) => {
     // 1. Clear any references in the beds table (Foreign Key Constraint)
     // Find any bed that has this tenant assigned and unassign it.
     const { error: bedError } = await supabase
        .from("beds")
        .update({ tenant_id: null, status: "AVAILABLE" })
        .eq("tenant_id", id);

     if (bedError) {
         console.error("Error clearing bed reference:", bedError);
         throw bedError; 
     }

     // 2. Also check if the tenant record has a bed_id and we should update that room occupancy?
     // We can just recalculate occupancy for the room they were in.
     const { data: tenant } = await supabase.from("tenants").select("room_id").eq("id", id).single();
     
     if (tenant?.room_id) {
        // We can allow this to run async or await it.
        await roomAPI.recalculateOccupancy(tenant.room_id);
     }

     // 3. Perform a "Hidden Soft Delete" instead of a Hard Delete.
     // This makes the resident disappear from the directory but preserves 
     // their financial and historical records in the database.
     return supabase.from("tenants").update({ 
         status: "DELETED",
         bed_id: null,
         room_id: null 
     }).eq("id", id);
  },
  search: async ({ 
    page = 1, 
    limit = 10, 
    search = "", 
    status = "ALL", 
    profession = "",
    pgId = "",
    floor = "",
    roomId = "",
    sortBy = "move_in_date",
    sortOrder = "desc"
  }) => {
    return apiClient.request(async () => {
        let selectStr = `*, daily_stay_details(*), rooms!room_id(room_number, floor, rent, deposit), pgs!pg_id(name), beds!bed_id(bed_number)`;
        
        // Use !inner join if filtering by floor or room to allow correct where clause filtering on joined table
        if ((floor && floor !== "ALL") || (roomId && roomId !== "ALL")) {
            selectStr = `*, daily_stay_details(*), rooms!inner!room_id(room_number, floor, rent, deposit), pgs!pg_id(name), beds!bed_id(bed_number)`;
        }

        let query = supabase
            .from("tenants")
            .select(selectStr, { count: "exact" });

        const normalizedStatus = (status || "ALL").toUpperCase();
        if (normalizedStatus !== "ALL") {
            query = query.eq("status", normalizedStatus);
        } else {
            query = query.neq("status", "DELETED");
        }
        
        if (profession && profession !== "ALL") {
            query = query.eq("profession", profession);
        }

        if (pgId && pgId !== "ALL") {
            query = query.eq("pg_id", pgId);
        }

        if (floor && floor !== "ALL") {
            query = query.eq("rooms.floor", floor);
        }

        if (roomId && roomId !== "ALL") {
            query = query.eq("room_id", roomId);
        }

        if (search) {
            // Broad Smart Search: Matches across name, phone, email, ID proof, profession
            query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,id_number.ilike.%${search}%,profession.ilike.%${search}%`);
        }

        // Apply Sorting
        if (sortBy === "pg_name") {
            query = query.order("name", { foreignTable: "pgs", ascending: sortOrder === "asc" });
        } else if (sortBy === "floor") {
            query = query.order("floor", { foreignTable: "rooms", ascending: sortOrder === "asc" });
        } else if (sortBy === "room") {
            query = query.order("room_number", { foreignTable: "rooms", ascending: sortOrder === "asc" });
        } else {
            query = query.order(sortBy, { ascending: sortOrder === "asc" });
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        return await query
            .order("created_at", { ascending: false })
            .range(from, to);
    }, "Search Tenants");
  },
  getDailyStayTenants: async ({ 
    search = "", 
    status = "ALL", 
    pgId = "",
    dateRange = null
  }) => {
    return apiClient.request(async () => {
        let query = supabase
            .from("tenants")
            .select(`
                *, 
                daily_stay_details(*),
                rooms:room_id(*), 
                pgs:pg_id(*), 
                beds:bed_id(*)
            `, { count: "exact" })
            .eq("stay_type", "DAILY");

        if (status && status !== "ALL") {
            query = query.eq("status", status);
        } else {
            // Exclude DELETED tenants when showing all statuses
            query = query.neq("status", "DELETED");
        }

        if (pgId && pgId !== "ALL") {
            query = query.eq("pg_id", pgId);
        }

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }
        
        if (dateRange?.start && dateRange?.end) {
             query = query.filter("daily_stay_details.move_in_date", "lte", dateRange.end)
                         .filter("daily_stay_details.vacate_date", "gte", dateRange.start);
        }

        return await query.order("created_at", { ascending: false });
    }, "Get Daily Stay Tenants");
  },
};

// Reservation APIs
export const reservationAPI = {
  getAll: () => apiClient.get("bookings", (query) => query.select(`
    *, 
    pgs(name), 
    rooms(room_number), 
    tenants(full_name) -- Fetch tenant name if linked
  `).order("requested_date", { ascending: false })),
  getById: (id) => apiClient.getById("bookings", id),
  getByRoomId: (roomId) => apiClient.get("bookings", (query) => query.eq("room_id", roomId).order("requested_date")),
  checkAvailability: (roomId, start, end) => apiClient.get("bookings", (query) => 
      query
        .eq("room_id", roomId)
        .neq("status", "CANCELLED")
        .or(`and(requested_date.lte.${end},requested_date.gte.${start})`)
  ),
  create: (data) => apiClient.post("bookings", data),
  update: (id, data) => apiClient.update("bookings", id, data),
  delete: (id) => apiClient.delete("bookings", id),
};

// Payment APIs
export const paymentAPI = {
  getAll: () => apiClient.get("payments", `
    *, 
    tenants!tenant_id(
        full_name, 
        status,
        move_in_date,
        rooms!room_id(room_number, floor), 
        pgs!pg_id(name),
        beds!bed_id(bed_number)
    ),
    bookings!reservation_id(
        status,
        tenants!tenant_id(full_name),
        rooms!room_id(room_number),
        pgs!pg_id(name)
    )
  `, (query) => query.order("payment_date", { ascending: false })),
  getById: (id) => apiClient.getById("payments", id, `*, tenants(full_name), bookings(id)`),
  getByTenantId: (tenantId) => apiClient.get("payments", "*", (query) => query.eq("tenant_id", tenantId).order("payment_date", { ascending: false })),
  getByReservationId: (reservationId) => apiClient.get("payments", "*", (query) => query.eq("reservation_id", reservationId).order("payment_date", { ascending: false })),
  create: (data) => apiClient.post("payments", data),
  update: (id, data) => apiClient.update("payments", id, data),
  delete: (id) => apiClient.delete("payments", id),
};

// Expense APIs
export const expenseAPI = {
  getAll: () => apiClient.get("expenses", "*, pgs(name)", (query) => query.order("date", { ascending: false })),
  getById: (id) => apiClient.getById("expenses", id),
  create: (data) => apiClient.post("expenses", data),
  update: (id, data) => apiClient.update("expenses", id, data),
  delete: (id) => apiClient.delete("expenses", id),
};

// Dashboard/Stats APIs
export const statsAPI = {
  getDashboardStats: async () => {
    return apiClient.request(async () => {
      const results = await Promise.all([
        supabase.from("pgs").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
        supabase.from("rooms").select("*", { count: "exact", head: true }).eq("status", "AVAILABLE"), // Simplified active rooms count
        supabase.from("tenants").select("*", { count: "exact", head: true }).in("status", ["ACTIVE", "INACTIVE"]),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("payments").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("beds").select("*", { count: "exact", head: true }).neq("status", "INACTIVE"),
        supabase.from("beds").select("*", { count: "exact", head: true }).eq("status", "OCCUPIED").neq("status", "INACTIVE"),
        supabase.from("beds").select("*", { count: "exact", head: true }).eq("status", "MAINTENANCE").neq("status", "INACTIVE"),
        supabase.from("rooms").select("*", { count: "exact", head: true }).eq("status", "MAINTENANCE"),
        supabase.from("rooms").select("*", { count: "exact", head: true }).in("status", ["AVAILABLE", "PARTIAL", "FULL"]),
        supabase.from("tenants")
          .select(`*, pgs!pg_id(name), rooms!room_id(room_number)`)
          .order("created_at", { ascending: false })
          .limit(5),
        // New Daily Stay Queries
        supabase.from("tenants").select("*", { count: "exact", head: true }).eq("stay_type", "DAILY").eq("status", "ACTIVE"),
        supabase.from("tenants").select("*", { count: "exact", head: true }).eq("stay_type", "MONTHLY").eq("status", "ACTIVE"),
        supabase.from("daily_stay_details").select("*", { count: "exact", head: true }).eq("vacate_date", new Date().toISOString().split('T')[0]),
        // Limit 5 for preview card
        supabase.from("daily_stay_details")
          .select("move_in_date, vacate_date, total_rent, balance_amount, tenants(id, full_name, status)")
          .order("move_in_date", { ascending: false })
          .limit(5),
        // Additional queries for outstanding balances
        supabase.from("tenants").select("balance").eq("status", "ACTIVE").eq("stay_type", "MONTHLY"),
        supabase.from("daily_stay_details").select("balance_amount, tenants!inner(status)").eq("tenants.status", "ACTIVE")
      ]);

      // Log errors if any but continue if partial data available
      results.forEach((r, idx) => {
        if (r.error) console.warn(`Dashboard partial fetch error (index ${idx}):`, r.error);
      });

      const parseMoney = (val) => {
        if (!val) return 0;
        const clean = String(val).replace(/[^0-9.-]+/g, "");
        return Number(clean) || 0;
      };

      const [
        pgs, rooms, tenants, bookings, payments, expenses, 
        totalBeds, occupiedBeds, maintenanceBeds, maintenanceRooms, activeRooms, recentResidents,
        dailyActive, monthlyActive, dailyCheckouts, recentDailyTenants,
        tenantBalances, dailyBalances
      ] = results;
  
      const allPayments = payments?.data || [];
      const allExpenses = expenses?.data || [];

      // Current Month Filtering
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const totalRevenue = allPayments.filter(p => {
          const s = (p.status || "").toUpperCase();
          return s === 'PAID' || s === 'COMPLETED';
      }).reduce((sum, p) => sum + parseMoney(p?.amount), 0);
      const monthlyRevenue = allPayments
        .filter(p => {
            const s = (p.status || "").toUpperCase();
            const isPaid = s === 'PAID' || s === 'COMPLETED';
            const d = new Date(p.payment_date || p.created_at);
            return isPaid && !isNaN(d.getTime()) && d >= firstDayOfMonth;
        })
        .reduce((sum, p) => sum + parseMoney(p?.amount), 0);

      const totalExpenses = allExpenses.reduce((sum, e) => sum + parseMoney(e?.amount), 0);
      const monthlyExpenses = allExpenses
        .filter(e => {
            const d = new Date(e.date || e.created_at);
            return !isNaN(d.getTime()) && d >= firstDayOfMonth;
        })
        .reduce((sum, e) => sum + parseMoney(e?.amount), 0);

      // Enhanced Calculation: Calculate Total Outstanding Dues across all residents
      // This logic must match TenantFinder and Payments pages for consistency
      const tenantsWithDues = tenantBalances?.data || [];
      const dailyDetailsWithDues = dailyBalances?.data || [];

      const monthlyDues = tenantsWithDues.reduce((sum, t) => sum + Number(t.balance || 0), 0);
      
      const dailyDues = dailyDetailsWithDues.reduce((sum, d) => {
          // Calculation matching TenantFinder: Total Rent (Days * RentPerDay + Maint) - Paid
          const start = new Date(d.move_in_date);
          const end = new Date(d.vacate_date);
          let diffDays = 1;
          if (end > start) diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          const totalRent = (diffDays * Number(d.rent_per_day || 0)) + Number(d.maintenance_amount || 0);
          const balance = Math.max(0, totalRent - Number(d.paid_amount || 0));
          return sum + balance;
      }, 0);

      const totalPendingDues = Math.round(monthlyDues + dailyDues);
  
      return {
        data: {
          totalPGs: pgs?.count || 0,
          totalRooms: rooms?.count || 0,
          activeRooms: activeRooms?.count || 0,
          maintenanceRooms: maintenanceRooms?.count || 0,
          totalTenants: tenants?.count || 0,
          pendingBookings: bookings?.count || 0,
          totalRevenue,
          monthlyRevenue,
          totalExpenses,
          monthlyExpenses,
          totalPendingDues,
          netProfit: monthlyRevenue - monthlyExpenses,
          totalBeds: totalBeds?.count || 0,
          occupiedBeds: occupiedBeds?.count || 0,
          maintenanceBeds: maintenanceBeds?.count || 0,
          recentResidents: recentResidents?.data || [],
          dailyActiveTenants: dailyActive?.count || 0,
          monthlyActiveTenants: monthlyActive?.count || 0,
          dailyCheckouts: dailyCheckouts?.count || 0,
          recentDailyTenants: (recentDailyTenants?.data || []).map(d => {
            const tenant = Array.isArray(d.tenants) ? d.tenants[0] : d.tenants;
            return {
              ...d,
              id: tenant?.id,
              full_name: tenant?.full_name,
              status: tenant?.status,
            };
          })
        }
      };
    }, "GET Dashboard Stats");
  },

  reconcileAllBalances: async () => {
    return apiClient.request(async () => {
        // 1. Fetch all active monthly tenants with their rent info
        const { data: tenants, error: fetchError } = await supabase
            .from("tenants")
            .select("id, full_name, move_in_date, created_at, rent_per_month, balance, maintenance_amount, maintenance_type, rooms:room_id(rent)")
            .eq("stay_type", "MONTHLY")
            .eq("status", "ACTIVE");
        
        if (fetchError) throw fetchError;
        if (!tenants || tenants.length === 0) return { success: true, count: 0 };

        // 2. Fetch all payments to calculate actual paid amounts
        const { data: allPayments, error: payError } = await supabase
            .from("payments")
            .select("tenant_id, amount");
        
        if (payError) throw payError;
        
        const paymentMap = (allPayments || []).reduce((acc, p) => {
            const cleanAmount = Number(String(p.amount).replace(/[^0-9.-]+/g, "")) || 0;
            acc[p.tenant_id] = (acc[p.tenant_id] || 0) + cleanAmount;
            return acc;
        }, {});

        const today = new Date();
        const updates = [];

        // 3. Compare system-calculated balance vs current DB balance
        for (const tenant of tenants) {
            const moveIn = new Date(tenant.move_in_date || tenant.created_at);
            if (isNaN(moveIn.getTime())) continue;

            const rent = Number(tenant.rent_per_month || tenant.rooms?.rent || 0);
            const maintenance = Number(tenant.maintenance_amount || 0);
            
            // Anniversary-based month calculation (Fairer rent cycle)
            let monthDiff = (today.getFullYear() - moveIn.getFullYear()) * 12 + (today.getMonth() - moveIn.getMonth());
            if (today.getDate() >= moveIn.getDate()) {
                monthDiff++;
            }
            monthDiff = Math.max(1, monthDiff);
            
            let expectedTotal = monthDiff * rent;
            
            // Apply Maintenance
            if (tenant.maintenance_type === 'monthly') {
                expectedTotal += (monthDiff * maintenance);
            } else if (tenant.maintenance_type === 'one_time') {
                expectedTotal += maintenance;
            }

            const paidTotal = paymentMap[tenant.id] || 0;
            const correctedBalance = Math.max(0, expectedTotal - paidTotal);

            // Only update if there is a discrepancy
            const currentBalance = Number(tenant.balance || 0);
            if (Math.abs(correctedBalance - currentBalance) > 1) {
                // Use the established update method for consistency and RLS handling
                updates.push(tenantAPI.update(tenant.id, { balance: correctedBalance }));
            }
        }

        // 4. Run updates in parallel
        if (updates.length > 0) {
            await Promise.all(updates);
        }

        return { success: true, updatedCount: updates.length };
    }, "Reconcile All Balances");
  }
};
// Profit & Loss APIs
export const pnlAPI = {
  getSummary: async () => {
    const [paymentsRes, expensesRes] = await Promise.all([
      supabase.from('payments').select('amount, payment_date, created_at, status, pg_id, pgs(name)'),
      supabase.from('expenses').select('amount, date, created_at, pg_id, pgs(name)')
    ]);

    if (paymentsRes.error) throw paymentsRes.error;
    if (expensesRes.error) throw expensesRes.error;

    const summaryMap = {};

    const getMonthKey = (dateString, fallbackString) => {
      const d = new Date(dateString || fallbackString);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    };

    const parseMoney = (val) => {
      if (!val) return 0;
      const clean = String(val).replace(/[^0-9.-]+/g, "");
      return Number(clean) || 0;
    };

    (paymentsRes.data || []).forEach(p => {
      const s = (p.status || "").toUpperCase();
      if (s !== 'PAID' && s !== 'COMPLETED') return;
      
      const monthKey = getMonthKey(p.payment_date, p.created_at);
      if (!monthKey) return;

      const pgId = p.pg_id || 'unassigned';
      const key = `${monthKey}_${pgId}`;

      if (!summaryMap[key]) {
        summaryMap[key] = {
          id: key, month: monthKey, pg_id: p.pg_id, pgs: p.pgs || { name: 'Global / Unassigned' },
          total_revenue: 0, total_expense: 0, net_profit: 0
        };
      }
      summaryMap[key].total_revenue += parseMoney(p.amount);
    });

    (expensesRes.data || []).forEach(e => {
      const monthKey = getMonthKey(e.date, e.created_at);
      if (!monthKey) return;

      const pgId = e.pg_id || 'unassigned';
      const key = `${monthKey}_${pgId}`;

      if (!summaryMap[key]) {
        summaryMap[key] = {
          id: key, month: monthKey, pg_id: e.pg_id, pgs: e.pgs || { name: 'Global / Unassigned' },
          total_revenue: 0, total_expense: 0, net_profit: 0
        };
      }
      summaryMap[key].total_expense += parseMoney(e.amount);
    });

    const summaryArray = Object.values(summaryMap).map(item => ({
      ...item, net_profit: item.total_revenue - item.total_expense
    }));
    summaryArray.sort((a, b) => new Date(b.month) - new Date(a.month));

    return { data: summaryArray };
  },
  getCategoryStats: async () => {
    const { data, error } = await supabase.from('expenses').select('category, amount, date, created_at');
    if (error) throw error;
    return { data };
  },
};

// Backup and Export APIs
export const backupAPI = {
  getSystemData: async () => {
    return apiClient.request(async () => {
        // Fetch only records that are currently "Visible" in the app
        // This excludes soft-deleted (status='DELETED') and archived records
        const [pgs, rooms, beds, tenants, payments, expenses, dailyDetails, bookings, floors] = await Promise.all([
            supabase.from("pgs").select("*").neq("status", "DELETED").neq("status", "INACTIVE"),
            supabase.from("rooms").select("*").neq("status", "DELETED"),
            supabase.from("beds").select("*").neq("status", "DELETED"),
            supabase.from("tenants").select("*").neq("status", "DELETED"),
            supabase.from("payments").select("*").neq("status", "DELETED"),
            supabase.from("expenses").select("*").neq("status", "DELETED"),
            supabase.from("daily_stay_details").select("*"),
            supabase.from("bookings").select("*").neq("status", "CANCELLED").neq("status", "REJECTED"),
            supabase.from("floors").select("*")
        ]);

        return {
            data: {
                pgs: pgs.data || [],
                rooms: rooms.data || [],
                beds: beds.data || [],
                tenants: tenants.data || [],
                payments: payments.data || [],
                expenses: expenses.data || [],
                dailyDetails: dailyDetails.data || [],
                bookings: bookings.data || [],
                floors: floors.data || [],
                snapshot_type: 'VISIBLE_APP_DATA_SYNC',
                timestamp: new Date().toISOString()
            }
        };
    }, "Get App-Visible System Data for export");
  },
  createSnapshot: async (data, filename, format) => {
    return apiClient.request(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required");

        const recordCount = Object.values(data).reduce((acc, curr) => {
            if (Array.isArray(curr)) return acc + curr.length;
            if (curr && typeof curr === 'object') return acc + 1; // For dashboardStats
            return acc;
        }, 0);

        return await supabase
            .from("system_data_snapshots")
            .insert([{
                owner_id: user.id,
                snapshot_data: data,
                filename,
                format,
                record_count: recordCount
            }])
            .select()
            .single();
    }, "Create System Snapshot");
  }
};

export default {
  authAPI,
  pgAPI,
  floorAPI,
  roomAPI,
  bedAPI,
  tenantAPI,
  reservationAPI,
  paymentAPI,
  expenseAPI,
  pnlAPI,
  statsAPI,
  backupAPI,
};
