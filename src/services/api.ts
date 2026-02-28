import apiClient from "./apiClient";
import { supabase } from "../lib/supabaseClient";
import { Database } from "../types/supabase";

type Tables = Database['public']['Tables'];

// PG APIs
export const pgAPI = {
    getAll: () => apiClient.get('pgs', "*, profiles!owner_id(full_name)", (query: any) =>
        query.neq("status", "DELETED")
            .neq("status", "INACTIVE")
    ),
    getActive: () => apiClient.get('pgs', (query: any) => query.eq("status", "ACTIVE").order("created_at", { ascending: false })),
    getArchived: () => apiClient.get('pgs', (query: any) => query.select("*, profiles!owner_id(full_name)").eq("status", "INACTIVE")),
    getById: (id: string) => apiClient.getById('pgs', id, `*, rooms(*)`),
    create: (data: any) => apiClient.post('pgs', data),
    update: (id: string, data: any) => apiClient.update('pgs', id, data),
    archive: async (id: string, nameSuffix: string) => {
        const { data: pg } = await supabase.from("pgs").select("name").eq("id", id).single();
        if (!pg) throw new Error("Property not found");
        const archivedName = `${pg.name} (Archived - ${nameSuffix})`;
        const { error } = await supabase.rpc('archive_pg_cascade', {
            p_pg_id: id,
            p_archived_name: archivedName
        });
        if (error) throw error;
        return { success: true };
    },
    restore: async (id: string) => {
        const { data: pg } = await supabase.from("pgs").select("name").eq("id", id).single();
        if (!pg) throw new Error("Property not found");
        const restoredName = pg.name.split(" (Archived - ")[0];
        const { error } = await supabase.rpc('restore_pg_cascade', {
            p_pg_id: id,
            p_restored_name: restoredName
        });
        if (error) throw error;
        return { success: true, name: restoredName };
    },
    hardDelete: async (id: string) => {
        const { error } = await supabase.rpc('hard_delete_pg_cascade', {
            p_pg_id: id
        });
        if (error) throw error;
        return { success: true };
    },
    getAllWithStats: (status: "ACTIVE" | "INACTIVE" = "ACTIVE") =>
        apiClient.get('pgs', `*, 
                rooms:rooms(count), 
                beds:beds(count), 
                occupied_beds:beds(count).filter(status.eq.OCCUPIED)`,
            (query: any) => query.eq("status", status).order("created_at", { ascending: false })
        ),
};

// Floor APIs
export const floorAPI = {
    getAll: () => apiClient.get('floors', "*, pgs(name)"),
    getByPgId: (pgId: string) => apiClient.get('floors', "*", (query: any) => query.eq("pg_id", pgId).order("floor_number")),
    create: (data: any) => apiClient.post('floors', data),
    update: (id: string, data: any) => apiClient.update('floors', id, data),
    delete: (id: string) => apiClient.delete('floors', id),
};

// Room APIs
export const roomAPI: any = {
    getAll: () => apiClient.get('rooms', "*, pgs(status, name, security_deposit)"),
    getById: (id: string) => apiClient.getById('rooms', id),
    getByPgId: (pgId: string) => apiClient.get('rooms', "*", (query: any) => query.eq("pg_id", pgId).order("floor").order("room_number")),
    getActiveByPgId: (pgId: string) => apiClient.get('rooms', "*", (query: any) => query.eq("pg_id", pgId).in("status", ["AVAILABLE", "PARTIAL", "FULL"]).order("floor").order("room_number")),
    create: async (roomData: any) => {
        const { data: room, error } = await supabase.from("rooms").insert([roomData]).select("*, pgs(status, name, security_deposit)").single();
        if (error) throw error;
        const beds = Array.from({ length: room.capacity }, (_, i) => ({
            room_id: room.id,
            bed_number: `Bed-${i + 1}`,
            status: "AVAILABLE",
            tenant_id: null
        }));
        const { error: bedError } = await supabase.from("beds").insert(beds);
        if (bedError) throw bedError;
        return room;
    },
    update: async (id: string, data: any) => {
        if (data.capacity !== undefined) {
            const { data: currentBeds, error: fetchError } = await supabase.from("beds").select("*").eq("room_id", id).order("bed_number");
            if (fetchError) throw fetchError;
            const currentCount = currentBeds.length;
            if (data.capacity > currentCount) {
                const bedsToAdd = data.capacity - currentCount;
                let maxBedIndex = 0;
                currentBeds.forEach(bed => {
                    const match = bed.bed_number.match(/Bed-(\d+)/);
                    if (match && parseInt(match[1]) > maxBedIndex) maxBedIndex = parseInt(match[1]);
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
                const emptyBeds = currentBeds.filter(b => b.status !== "OCCUPIED").sort((a, b) => {
                    const numA = parseInt(a.bed_number.match(/Bed-(\d+)/)?.[1] || "0");
                    const numB = parseInt(b.bed_number.match(/Bed-(\d+)/)?.[1] || "0");
                    return numB - numA;
                });
                if (emptyBeds.length < bedsToRemove) throw new Error(`Cannot reduce capacity. Room has occupied beds.`);
                const bedIdsToDelete = emptyBeds.slice(0, bedsToRemove).map(b => b.id);
                const { error: bedDeleteError } = await supabase.from("beds").delete().in("id", bedIdsToDelete);
                if (bedDeleteError) throw bedDeleteError;
            }
        }
        const result = await apiClient.update('rooms', id, data);
        await roomAPI.recalculateOccupancy(id);
        return result;
    },
    delete: async (id: string) => {
        await supabase.from("tenants").update({ bed_id: null, room_id: null, status: "INACTIVE" }).eq("room_id", id);
        await Promise.allSettled([
            supabase.from("payments").update({ bed_id: null, room_id: null }).eq("room_id", id),
            supabase.from("bookings").update({ bed_id: null, room_id: null }).eq("room_id", id)
        ]);
        await supabase.from("beds").delete().eq("room_id", id);
        return apiClient.delete('rooms', id);
    },
    recalculateOccupancy: async (roomId: string) => {
        if (!roomId) return;
        const { count: capacity } = await supabase.from("beds").select("id", { count: "exact", head: true }).eq("room_id", roomId);
        const { count: occupied } = await supabase.from("beds").select("id", { count: "exact", head: true }).eq("room_id", roomId).eq("status", "OCCUPIED");
        const { count: maintenance } = await supabase.from("beds").select("id", { count: "exact", head: true }).eq("room_id", roomId).eq("status", "MAINTENANCE");
        const { data: room } = await supabase.from("rooms").select("status, room_number").eq("id", roomId).single();
        let status = "AVAILABLE";
        const unavailableCount = (occupied || 0) + (maintenance || 0);
        if (unavailableCount >= (capacity || 0) && (capacity || 0) > 0) status = "FULL";
        else if ((occupied || 0) > 0) status = "PARTIAL";
        if (room && (room.status === "MAINTENANCE" || room.status === "INACTIVE")) status = room.status;
        await supabase.from("rooms").update({ current_occupancy: occupied || 0, status: status }).eq("id", roomId);
        return { success: true };
    }
};

// Bed APIs
export const bedAPI = {
    getAll: () => apiClient.get('beds', "*, rooms(status, room_number, pg_id, floor, capacity, current_occupancy, pgs(status, name)), tenants:tenant_id(full_name)"),
    getById: (id: string) => apiClient.getById('beds', id),
    getByRoomId: (roomId: string) => apiClient.get('beds', "*", (query: any) => query.eq("room_id", roomId).order("bed_number")),
    update: async (id: string, data: any) => {
        const updatedBed: any = await apiClient.update('beds', id, data);
        if (updatedBed && (data.tenant_id !== undefined || data.status !== undefined)) {
            const rId = updatedBed.room_id || data.room_id;
            if (rId) await roomAPI.recalculateOccupancy(rId);
        }
        return updatedBed;
    },
    delete: async (id: string) => {
        const { data: bed } = await supabase.from("beds").select("room_id").eq("id", id).single();
        await Promise.allSettled([
            supabase.from("payments").update({ bed_id: null }).eq("bed_id", id),
            supabase.from("bookings").update({ bed_id: null }).eq("bed_id", id),
            supabase.from("tenants").update({ bed_id: null }).eq("bed_id", id)
        ]);
        const result = await apiClient.delete('beds', id);
        if (bed) await roomAPI.recalculateOccupancy(bed.room_id);
        return result;
    },
};

// Tenant APIs
export const tenantAPI = {
    getAll: () => apiClient.get('tenants', (query: any) => query.select(`*, rooms!room_id(room_number), pgs!pg_id(name), beds!bed_id(bed_number)`)),
    getActive: () => apiClient.get('tenants', (query: any) => query.in("status", ["ACTIVE", "UPCOMING", "OVERDUE"]).select(`*, daily_stay_details(*), rooms!room_id(room_number, rent), pgs!pg_id(name), beds!bed_id(bed_number)`)),
    getById: (id: string) => apiClient.getById('tenants', id),
    create: async (data: any) => {
        const { vacate_date, total_rent, paid_amount, balance_amount, balance, ...tenantIdentity } = data;
        const insertData = {
            ...tenantIdentity,
            balance: balance !== undefined ? balance : (data.stay_type === 'DAILY' ? (balance_amount || total_rent || 0) : 0)
        };
        const { data: tenant, error: tenantError } = await supabase.from("tenants").insert([insertData]).select().single();
        if (tenantError) throw tenantError;
        if (data.stay_type === 'DAILY') {
            const { error: dailyError } = await supabase.from("daily_stay_details").insert([{
                tenant_id: tenant.id,
                move_in_date: data.move_in_date,
                vacate_date,
                rent_per_day: data.rent_per_day || 0,
                total_rent: total_rent || 0,
                paid_amount: paid_amount || 0,
                balance_amount: balance_amount || total_rent || 0,
                maintenance_amount: data.maintenance_amount || 0,
                maintenance_type: data.maintenance_type || null
            }]);
            if (dailyError) {
                await supabase.from("tenants").delete().eq("id", tenant.id);
                throw dailyError;
            }
        }
        return tenant;
    },
    update: async (id: string, data: any) => {
        const identityUpdates = { ...data };
        ['paid_amount', 'total_rent', 'balance_amount'].forEach(f => delete identityUpdates[f]);
        if (Object.keys(identityUpdates).length > 0) {
            await supabase.from("tenants").update(identityUpdates).eq("id", id);
        }
        const dailyFields = ['move_in_date', 'vacate_date', 'rent_per_day', 'paid_amount', 'total_rent', 'balance_amount', 'maintenance_amount', 'maintenance_type', 'maintenance_paid'];
        const dailyUpdates: any = {};
        dailyFields.forEach(f => { if (data[f] !== undefined) dailyUpdates[f] = data[f]; });
        if (Object.keys(dailyUpdates).length > 0) {
            await supabase.from("daily_stay_details").update(dailyUpdates).eq("tenant_id", id);
        }
        return { id, ...data };
    },
    archive: async (id: string) => {
        const { data: tenant } = await supabase.from("tenants").select("bed_id, room_id").eq("id", id).single();
        if (tenant?.bed_id) {
            await supabase.from("beds").update({ tenant_id: null, status: "AVAILABLE" }).eq("id", tenant.bed_id);
            if (tenant.room_id) await roomAPI.recalculateOccupancy(tenant.room_id);
        }
        return supabase.from("tenants").update({ status: "DELETED" }).eq("id", id);
    },
    search: async (params: any) => {
        const { page = 1, limit = 10, search = "", status = "ALL", pgId = "", floor = "", roomId = "", sortBy = "move_in_date", sortOrder = "desc" } = params;
        return apiClient.request(async () => {
            let selectStr = `*, daily_stay_details(*), rooms!room_id(room_number, floor, rent, deposit), pgs!pg_id(name), beds!bed_id(bed_number)`;
            if ((floor && floor !== "ALL") || (roomId && roomId !== "ALL")) {
                selectStr = `*, daily_stay_details(*), rooms!inner!room_id(room_number, floor, rent, deposit), pgs!pg_id(name), beds!bed_id(bed_number)`;
            }
            let query = supabase.from("tenants").select(selectStr, { count: "exact" });
            if (status !== "ALL") query = query.eq("status", status.toUpperCase());
            else query = query.neq("status", "DELETED");
            if (pgId && pgId !== "ALL") query = query.eq("pg_id", pgId);
            if (floor && floor !== "ALL") query = query.eq("rooms.floor", floor);
            if (roomId && roomId !== "ALL") query = query.eq("room_id", roomId);
            if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
            query = query.order(sortBy, { ascending: sortOrder === "asc" });
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            return await query.range(from, to).order("created_at", { ascending: false });
        }, "Search Tenants");
    },
};

// Payment APIs
export const paymentAPI = {
    getAll: () => apiClient.get('payments', `*, pgs!pg_id(name), tenants!tenant_id(full_name, status, move_in_date, rooms!room_id(room_number, floor), pgs!pg_id(name), beds!bed_id(bed_number)), bookings!reservation_id(status, tenants!tenant_id(full_name), rooms!room_id(room_number), pgs!pg_id(name))`, (query: any) => query.order("payment_date", { ascending: false })),
    getById: (id: string) => apiClient.getById('payments', id, `*, tenants(full_name), bookings(id)`),
    create: (data: any) => apiClient.post('payments', data),
    update: (id: string, data: any) => apiClient.update('payments', id, data),
    delete: (id: string) => apiClient.delete('payments', id),
};

// Expense APIs
export const expenseAPI = {
    getAll: () => apiClient.get('expenses', "*, pgs(name)", (query: any) => query.order("date", { ascending: false })),
    create: (data: any) => apiClient.post('expenses', data),
    update: (id: string, data: any) => apiClient.update('expenses', id, data),
    delete: (id: string) => apiClient.delete('expenses', id),
    search: async (params: any) => {
        const { page = 1, limit = 10, search = "", category = "ALL", pgId = "", sortBy = "date", sortOrder = "desc" } = params;
        return apiClient.request(async () => {
            let query = supabase.from("expenses").select("*, pgs(name)", { count: "exact" });
            if (category && category !== "ALL") query = query.eq("category", category.toUpperCase());
            if (pgId && pgId !== "ALL") query = query.eq("pg_id", pgId);
            if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,vendor_name.ilike.%${search}%`);
            query = query.order(sortBy, { ascending: sortOrder === "asc" });
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            return await query.range(from, to).order("created_at", { ascending: false });
        }, "Search Expenses");
    },
};

// Dashboard Stats
export const statsAPI = {
    getDashboardStats: async () => {
        return apiClient.request(async () => {
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const results = await Promise.all([
                supabase.from("pgs").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
                supabase.from("rooms").select("*", { count: "exact", head: true }).in("status", ["AVAILABLE", "PARTIAL", "FULL"]),
                supabase.from("tenants").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
                supabase.from("beds").select("*", { count: "exact", head: true }).neq("status", "INACTIVE"),
                supabase.from("beds").select("*", { count: "exact", head: true }).eq("status", "OCCUPIED"),
                supabase.from("beds").select("*", { count: "exact", head: true }).eq("status", "AVAILABLE"),
                supabase.from("payments").select("amount, payment_date, created_at, status"),
                supabase.from("expenses").select("amount, date, created_at"),
                supabase.from("tenants").select("balance").eq("status", "ACTIVE"),
                supabase.from("daily_stay_details").select("balance_amount"),
                supabase.from("tenants").select(`*, pgs!pg_id(name), rooms!room_id(room_number)`).order("created_at", { ascending: false }).limit(5),
            ]);

            const [
                pgs, rooms, tenants, totalBeds, occupiedBeds, availableBeds,
                payments, expenses, tenantBalances, dailyBalances, recentResidents
            ] = results;

            const allPayments = payments?.data || [];
            const allExpenses = expenses?.data || [];

            const totalRevenue = allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            const monthlyRevenue = allPayments
                .filter(p => (p.payment_date || p.created_at) >= firstDayOfMonth)
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            const monthlyExpenses = allExpenses
                .filter(e => (e.date || e.created_at) >= firstDayOfMonth)
                .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            const pendingDues = (tenantBalances?.data || []).reduce((sum, t) => sum + (Number(t.balance) || 0), 0) +
                (dailyBalances?.data || []).reduce((sum, d) => sum + (Number(d.balance_amount) || 0), 0);

            return {
                data: {
                    totalPGs: pgs?.count || 0,
                    activeRooms: rooms?.count || 0,
                    totalTenants: tenants?.count || 0,
                    totalBeds: totalBeds?.count || 0,
                    occupiedBeds: occupiedBeds?.count || 0,
                    availableBeds: availableBeds?.count || 0,
                    occupancyRate: (totalBeds?.count && occupiedBeds?.count) ? Math.round((occupiedBeds.count / totalBeds.count) * 100) : 0,
                    totalRevenue,
                    monthlyRevenue,
                    netProfit: monthlyRevenue - monthlyExpenses,
                    pendingDues,
                    recentResidents: recentResidents?.data || [],
                }
            };
        }, "GET Dashboard Stats");
    }
};

// Profit & Loss APIs
export const pnlAPI = {
    getSummary: () => apiClient.getView('profit_summary' as any, `*`),
    getCategoryStats: () => apiClient.get('expenses', `category, amount, date`),
};
