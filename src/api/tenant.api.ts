import { supabase } from "./supabaseClient";

export const tenantAPI = {
    createIdentity: async (payload: any) => {
        const { data, error } = await supabase.from("tenants").insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    updateIdentity: async (id: string, payload: any) => {
        const { data, error } = await supabase.from("tenants").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return data;
    },

    deleteIdentity: async (id: string) => {
        const { error } = await supabase.from("tenants").delete().eq("id", id);
        if (error) throw error;
        return { success: true };
    },

    createDailyDetails: async (payload: any) => {
        const { data, error } = await supabase.from("daily_stay_details").insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    updateDailyDetails: async (tenantId: string, payload: any) => {
        const { data, error } = await supabase.from("daily_stay_details").update(payload).eq("tenant_id", tenantId).select().single();
        if (error) throw error;
        return data;
    },

    checkDuplicateId: async (idType: string, idNumber: string, excludeTenantId?: string) => {
        let query = supabase.from("tenants").select("id").eq("id_type", idType).eq("id_number", idNumber);
        if (excludeTenantId) {
            query = query.neq("id", excludeTenantId);
        }
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        return data;
    }
};
