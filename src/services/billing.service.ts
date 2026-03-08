import apiClient from "./apiClient";

/**
 * BILLING_ENGINE_V2 Service Layer
 * Single Source of Truth for all billing operations.
 * Uses existing backend REST endpoints.
 */
export const billingService = {
    /**
     * Fetch current outstanding balance for a tenant.
     * Calls GET /api/tenants/{tenantId} and uses the balance field.
     */
    getOutstandingBalance: async (tenantId: string): Promise<number> => {
        try {
            const tenant: any = await apiClient.get(`tenants/${tenantId}`);
            return tenant?.balance || 0;
        } catch (e) {
            return 0;
        }
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
        return apiClient.rpc('allocate_payment', {
            p_payment_id: paymentId,
            p_tenant_id: tenantId,
        });
    },

    /**
     * Fetch all invoices for a tenant using the existing /invoices endpoint with filter
     */
    getInvoices: async (tenantId: string) => {
        return apiClient.get(`invoices/`, { tenant_id: tenantId });
    },

    /**
     * Fetch total remaining credit for a tenant.
     * Note: Credits endpoint /api/tenant_credits/ is not available.
     */
    getCredits: async (_tenantId: string) => {
        return { amount: 0, items: [] };
    },

    /**
     * Create a manual invoice (used during onboarding for monthly tenants)
     */
    createInvoice: async (data: any) => {
        return apiClient.post('invoices/', data);
    }
};
