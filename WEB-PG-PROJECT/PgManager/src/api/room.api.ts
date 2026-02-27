import { supabase } from "./supabaseClient";

export const roomAPI = {
    getAll: async () => {
        const { data, error } = await supabase.from("rooms").select("*, pgs(status, name)");
        if (error) throw error;
        return data;
    },

    getById: async (id: string) => {
        const { data, error } = await supabase.from("rooms").select("*").eq("id", id).single();
        if (error) throw error;
        return data;
    },

    getByPgId: async (pgId: string) => {
        const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .eq("pg_id", pgId)
            .order("floor")
            .order("room_number");
        if (error) throw error;
        return data;
    },

    getActiveByPgId: async (pgId: string) => {
        const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .eq("pg_id", pgId)
            .in("status", ["AVAILABLE", "PARTIAL", "FULL"])
            .order("floor")
            .order("room_number");
        if (error) throw error;
        return data;
    },

    create: async (payload: any) => {
        const { data, error } = await supabase.from("rooms").insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    update: async (id: string, payload: any) => {
        const { data, error } = await supabase.from("rooms").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return data;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from("rooms").delete().eq("id", id);
        if (error) throw error;
        return { success: true };
    },

    updateOccupancy: async (roomId: string, occupiedCount: number, status: string) => {
        const { error } = await supabase
            .from("rooms")
            .update({ current_occupancy: occupiedCount, status: status })
            .eq("id", roomId);
        if (error) throw error;
        return { success: true };
    }
};
