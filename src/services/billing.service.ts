import apiClient from "./apiClient";

/**
 * BILLING_ENGINE_V2 Service Layer
 * Single Source of Truth for all billing operations.
 * Uses existing backend REST endpoints.
 */
export const billingService = {
    /**
     * Fetch current outstanding balance for a tenant.
     * Calls GET /api/tenants/{tenantId}/balance
     */
    getOutstandingBalance: async (tenantId: string): Promise<number> => {
        try {
            const res: any = await apiClient.request({
                method: 'get',
                url: `/api/tenants/${tenantId}/balance`,
            }, `GET tenants/${tenantId}/balance`);
            // Backend returns { balance: number }
            return typeof res === 'number' ? res : (res?.balance ?? 0);
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
     * Fetch total remaining credit for a tenant
     */
    getCredits: async (tenantId: string) => {
        try {
            const res: any = await apiClient.get(`tenant_credits/`, { tenant_id: tenantId });
            const credits = Array.isArray(res) ? res : [];
            const total = credits.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
            return { amount: total, items: credits };
        } catch (e) {
            return { amount: 0, items: [] };
        }
    },

    /**
     * Create a manual invoice (used during onboarding for monthly tenants)
     */
    createInvoice: async (data: any) => {
        return apiClient.post('invoices/', data);
    }
};
