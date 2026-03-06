import { supabase } from "./supabaseClient";

export const paymentAPI = {
    create: async (payload: any) => {
        const { data, error } = await supabase.from("payments").insert([payload]).select().single();
        if (error) throw error;

        // Automagically allocate the payment to outstanding invoices
        if (data && (data.type === 'RENT' || data.type === 'MAINTENANCE') && (data.status === 'COMPLETED' || data.status === 'PAID')) {
            try {
                const { error: allocError } = await supabase.rpc('allocate_payment', {
                    p_tenant_id: data.tenant_id,
                    p_owner_id: data.owner_id,
                    p_payment_id: data.id
                });

                if (allocError) {
                    console.error("Payment created but allocation failed:", allocError);
                }
            } catch (rpcError) {
                console.error("RPC Error during allocation:", rpcError);
            }
        }

        return data;
    }
};
