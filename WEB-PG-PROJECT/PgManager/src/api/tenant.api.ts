import { supabase } from "./supabaseClient";

export const tenantAPI = {
    createIdentity: async (payload: any) => {
        const { data, error } = await supabase.from("tenants").insert([payload]).select().single();
        if (error) throw error;

        // Auto-generate initial invoice for Monthly tenants to support the new billing system
        if (data && data.stay_type === 'MONTHLY') {
            const initialRent = Number(data.rent_per_month || data.custom_rent || 0);
            const maintType = data.maintenance_type;
            const maintenance = (maintType === 'one_time' || maintType === 'monthly') ? Number(data.maintenance_amount || 0) : 0;
            const totalInvoiceAmount = initialRent + maintenance;

            // Calculate 1 month interval for the first invoice period
            const startDate = new Date(data.move_in_date);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);

            // Handle edge cases where next month has fewer days (e.g. Jan 31 -> Feb 28)
            if (endDate.getDate() !== startDate.getDate()) {
                endDate.setDate(0);
            } else {
                endDate.setDate(endDate.getDate() - 1);
            }

            const insertPayloads = [{
                tenant_id: data.id,
                owner_id: data.owner_id,
                type: 'RENT',
                total_amount: totalInvoiceAmount,
                paid_amount: 0,
                status: 'UNPAID',
                billing_period_start: data.move_in_date,
                billing_period_end: endDate.toISOString().split('T')[0]
            }];

            if (Number(data.security_deposit || 0) > 0) {
                insertPayloads.push({
                    tenant_id: data.id,
                    owner_id: data.owner_id,
                    type: 'DEPOSIT',
                    total_amount: Number(data.security_deposit),
                    paid_amount: 0,
                    status: 'UNPAID',
                    billing_period_start: data.move_in_date,
                    billing_period_end: endDate.toISOString().split('T')[0]
                });
            }

            const { error: invoiceError } = await supabase.from("invoices").insert(insertPayloads);

            if (invoiceError) {
                console.error("Failed to generate initial invoices:", invoiceError);
            }
        }

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
