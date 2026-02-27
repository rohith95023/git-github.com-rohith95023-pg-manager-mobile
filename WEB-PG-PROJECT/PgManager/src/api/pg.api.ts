import { supabase } from "./supabaseClient";

export const pgAPI = {
    getAll: async () => {
        const { data, error } = await supabase
            .from("pgs")
            .select("*, profiles!owner_id(full_name)")
            .neq("status", "DELETED")
            .neq("status", "INACTIVE");
        if (error) throw error;
        return data;
    },

    getActive: async () => {
        const { data, error } = await supabase
            .from("pgs")
            .select("*")
            .eq("status", "ACTIVE")
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
    },

    getArchived: async () => {
        const { data, error } = await supabase
            .from("pgs")
            .select("*, profiles!owner_id(full_name)")
            .eq("status", "INACTIVE");
        if (error) throw error;
        return data;
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from("pgs")
            .select("*, rooms(*)")
            .eq("id", id)
            .single();
        if (error) throw error;
        return data;
    },

    create: async (payload: any) => {
        const { data, error } = await supabase.from("pgs").insert(payload).select().single();
        if (error) throw error;
        return data;
    },

    update: async (id: string, payload: any) => {
        const { data, error } = await supabase.from("pgs").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return data;
    },

    archive: async (id: string, nameSuffix: string) => {
        const { data: pg, error: fetchError } = await supabase.from("pgs").select("name").eq("id", id).single();
        if (fetchError || !pg) throw new Error("Property not found");

        const archivedName = `${pg.name} (Archived - ${nameSuffix})`;

        const { error } = await supabase.rpc("archive_pg_cascade", {
            p_pg_id: id,
            p_archived_name: archivedName
        });

        if (error) throw error;
        return { success: true };
    },

    restore: async (id: string) => {
        const { data: pg, error: fetchError } = await supabase.from("pgs").select("name").eq("id", id).single();
        if (fetchError || !pg) throw new Error("Property not found");

        const restoredName = pg.name.split(" (Archived - ")[0];

        const { error } = await supabase.rpc("restore_pg_cascade", {
            p_pg_id: id,
            p_restored_name: restoredName
        });

        if (error) throw error;
        return { success: true, name: restoredName };
    },

    hardDelete: async (id: string) => {
        const { error } = await supabase.rpc("hard_delete_pg_cascade", { p_pg_id: id });
        if (error) throw error;
        return { success: true };
    }
};
