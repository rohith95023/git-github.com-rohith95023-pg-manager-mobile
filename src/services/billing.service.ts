import apiClient from "./apiClient";
import { supabase } from "../lib/supabaseClient";

/**
 * BILLING_ENGINE_V2 Service Layer
 * Single Source of Truth for all billing operations.
 * NO local calculation logic allowed.
 */
export const billingService = {
    /**
     * Fetch current outstanding balance for a tenant via RPC
     */
    getOutstandingBalance: async (tenantId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");
        return apiClient.rpc<number>('get_outstanding_balance' as any, {
            p_tenant_id: tenantId,
            p_owner_id: user.id
        });
    },

    /**
     * Batch generate monthly invoices for all active residents
     */
    generateMonthlyInvoices: async (ownerId: string) => {
        return apiClient.rpc('generate_monthly_invoices' as any, {
            p_owner_id: ownerId,
            p_test_date: null // Added to resolve ambiguity PGRST203
        });
    },

    /**
     * Allocate a specific payment to unpaid invoices using FIFO logic
     */
    allocatePayment: async (paymentId: string, tenantId: string, _amount: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        // Match backend RPC name: allocate_payment
        return apiClient.rpc('allocate_payment' as any, {
            p_payment_id: paymentId,
            p_tenant_id: tenantId,
            p_owner_id: user.id
        });
    },

    /**
     * Fetch all invoices for a tenant ordered by period start
     */
    getInvoices: async (tenantId: string) => {
        return apiClient.get('invoices' as any, (query: any) =>
            query.eq('tenant_id', tenantId)
                .order('billing_period_start', { ascending: false })
        );
    },

    /**
     * Fetch remaining credit for a tenant
     */
    getCredits: async (tenantId: string) => {
        return apiClient.get('tenant_credits' as any, (query: any) =>
            query.eq('tenant_id', tenantId)
                .maybeSingle()
        );
    },

    /**
     * Create a manual invoice (used during onboarding for monthly tenants)
     */
    createInvoice: async (data: any) => {
        return apiClient.post('invoices' as any, data);
    }
};
