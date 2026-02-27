import { supabase } from "./supabaseClient";

export const bedAPI = {
    getByRoomId: async (roomId: string) => {
        const { data, error } = await supabase
            .from("beds")
            .select("*")
            .eq("room_id", roomId)
            .order("bed_number");
        if (error) throw error;
        return data;
    },

    update: async (id: string, payload: any) => {
        const { data, error } = await supabase.from("beds").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return data;
    },

    getBedCountByStatus: async (roomId: string, status?: string) => {
        let query = supabase.from("beds").select("id", { count: "exact", head: true }).eq("room_id", roomId);
        if (status) query = query.eq("status", status);
        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    }
};
