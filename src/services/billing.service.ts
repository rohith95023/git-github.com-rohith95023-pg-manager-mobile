import apiClient, { authClient } from "./apiClient";

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
        const user = await authClient.getUser();
        if (!user) throw new Error("Unauthorized");
        return apiClient.rpc<number>('get_outstanding_balance', {
            p_tenant_id: tenantId,
            p_owner_id: user.id
        });
    },

    /**
     * Batch generate monthly invoices for all active residents
     */
    generateMonthlyInvoices: async (ownerId: string) => {
        return apiClient.rpc('generate_monthly_invoices', {
            p_owner_id: ownerId,
            p_test_date: null
        });
    },

    /**
     * Allocate a specific payment to unpaid invoices using FIFO logic
     */
    allocatePayment: async (paymentId: string, tenantId: string, _amount: number) => {
        const user = await authClient.getUser();
        if (!user) throw new Error("Unauthorized");

        return apiClient.rpc('allocate_payment', {
            p_payment_id: paymentId,
            p_tenant_id: tenantId,
            p_owner_id: user.id
        });
    },

    /**
     * Fetch all invoices for a tenant ordered by period start
     */
    getInvoices: async (tenantId: string) => {
        return apiClient.get(`tenants/${tenantId}/invoices`);
    },

    /**
     * Fetch remaining credit for a tenant
     */
    getCredits: async (tenantId: string) => {
        return apiClient.get(`tenants/${tenantId}/credits`);
    },

    /**
     * Create a manual invoice (used during onboarding for monthly tenants)
     */
    createInvoice: async (data: any) => {
        return apiClient.post('invoices', data);
    }
};
