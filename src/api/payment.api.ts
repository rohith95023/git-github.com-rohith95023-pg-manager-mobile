import { supabase } from "./supabaseClient";

export const paymentAPI = {
    create: async (payload: any) => {
        const { data, error } = await supabase.from("payments").insert([payload]).select().single();
        if (error) throw error;
        return data;
    }
};
