import apiClient, { authClient } from "./apiClient";

export const tenantService = {
    createTenant: async (formData, paidNow) => {
        const user = await authClient.getUser();

        const payload = {
            ...formData,
            owner_id: user?.id,
            initial_payment: paidNow
        };

        return apiClient.post('tenants/onboard', payload);
    },

    updateTenant: async (tenantId, formData, initialData, paidNow) => {
        const user = await authClient.getUser();

        const payload = {
            ...formData,
            owner_id: user?.id,
            update_payment: paidNow
        };

        return apiClient.update('tenants', tenantId, payload);
    }
};
