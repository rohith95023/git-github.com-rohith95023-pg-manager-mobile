import apiClient, { authClient } from "./apiClient";

// Export authClient as authAPI for compatibility
export const authAPI = authClient;

// PG APIs — backend: /api/pgs/
export const pgAPI = {
    getAll: () => apiClient.get('pgs/'),
    getActive: () => apiClient.get('pgs/active'),
    getArchived: () => apiClient.get('pgs/archived'),
    getById: (id: string) => apiClient.getById('pgs', id),
    create: (data: any) => apiClient.post('pgs/', data),
    update: (id: string, data: any) => apiClient.request({
        method: 'put',
        url: `/api/pgs/${id}`,
        data,
    }, `UPDATE pgs/${id}`),
    archive: async (id: string, nameSuffix: string) => {
        return apiClient.request({
            method: 'post',
            url: `/api/pgs/${id}/archive`,
            data: { name_suffix: nameSuffix },
        }, `ARCHIVE pg/${id}`);
    },
    restore: async (id: string) => {
        return apiClient.request({
            method: 'post',
            url: `/api/pgs/${id}/restore`,
            data: {},
        }, `RESTORE pg/${id}`);
    },
    hardDelete: async (id: string) => {
        return apiClient.request({
            method: 'delete',
            url: `/api/pgs/${id}/hard-delete`,
        }, `HARD_DELETE pg/${id}`);
    },
    getAllWithStats: async (status: "ACTIVE" | "INACTIVE" = "ACTIVE") => {
        return apiClient.get('pgs/', { status });
    },
};

// Room APIs — backend: /api/rooms/
export const roomAPI: any = {
    getAll: () => apiClient.get('rooms/'),
    getById: (id: string) => apiClient.getById('rooms', id),
    // Actual backend path: /api/rooms/pg/{pg_id}
    getByPgId: (pgId: string) => apiClient.get(`rooms/pg/${pgId}`),
    getActiveByPgId: (pgId: string) => apiClient.get(`rooms/pg/${pgId}/active`),
    create: async (roomData: any) => {
        return apiClient.post('rooms/', roomData);
    },
    update: async (id: string, data: any) => {
        return apiClient.request({
            method: 'put',
            url: `/api/rooms/${id}`,
            data,
        }, `UPDATE rooms/${id}`);
    },
    delete: async (id: string) => {
        return apiClient.request({
            method: 'delete',
            url: `/api/rooms/${id}`,
        }, `DELETE rooms/${id}`);
    },
    recalculateOccupancy: async (roomId: string) => {
        return apiClient.request({
            method: 'post',
            url: `/api/rooms/${roomId}/recalculate`,
            data: {},
        }, `RECALCULATE rooms/${roomId}`);
    },
    getArchived: () => apiClient.get('rooms/archived'),
    archive: async (id: string) => {
        return apiClient.request({
            method: 'post',
            url: `/api/rooms/${id}/archive`,
            data: {},
        }, `ARCHIVE rooms/${id}`);
    },
    restore: async (id: string) => {
        return apiClient.request({
            method: 'post',
            url: `/api/rooms/${id}/restore`,
            data: {},
        }, `RESTORE rooms/${id}`);
    },
    getByPgIdAll: (pgId: string) => apiClient.get(`rooms/pg/${pgId}`),
};

// Bed APIs — backend: /api/beds/
export const bedAPI = {
    getAll: () => apiClient.get('beds/'),
    getById: (id: string) => apiClient.getById('beds', id),
    // Actual backend path: /api/beds/room/{room_id}
    getByRoomId: (roomId: string) => apiClient.get(`beds/room/${roomId}`),
    search: async (params: any) => {
        return apiClient.get('beds/', params);
    },
    update: async (id: string, data: any) => {
        return apiClient.request({
            method: 'put',
            url: `/api/beds/${id}`,
            data,
        }, `UPDATE beds/${id}`);
    },
    delete: async (id: string) => {
        return apiClient.request({
            method: 'delete',
            url: `/api/beds/${id}`,
        }, `DELETE beds/${id}`);
    },
    getStats: (params: any = {}) => apiClient.get('beds/stats', params),
    getAvailableByPg: (pgId: string) => apiClient.get(`beds/pg/${pgId}`, { status: 'AVAILABLE' }),
    getArchived: () => apiClient.get('beds/archived'),
    getByPgId: (pgId: string) => apiClient.get(`beds/pg/${pgId}`),
    archive: async (id: string) => {
        return apiClient.request({
            method: 'post',
            url: `/api/beds/${id}/archive`,
            data: {},
        }, `ARCHIVE beds/${id}`);
    },
    restore: async (id: string) => {
        return apiClient.request({
            method: 'post',
            url: `/api/beds/${id}/restore`,
            data: {},
        }, `RESTORE beds/${id}`);
    },
};

// Tenant APIs — backend: /api/tenants/
export const tenantAPI = {
    getAll: () => apiClient.get('tenants/'),
    getActive: () => apiClient.get('tenants/active'),
    getDaily: () => apiClient.get('tenants/daily'),
    getById: (id: string) => apiClient.getById('tenants', id),
    create: async (data: any) => {
        return apiClient.post('tenants/', data);
    },
    update: async (id: string, data: any) => {
        return apiClient.request({
            method: 'put',
            url: `/api/tenants/${id}`,
            data,
        }, `UPDATE tenants/${id}`);
    },
    archive: async (id: string) => {
        return apiClient.request({
            method: 'post',
            url: `/api/tenants/${id}/archive`,
            data: {},
        }, `ARCHIVE tenant/${id}`);
    },
    search: async (params: any) => {
        return apiClient.get('tenants/search', params);
    },
    checkDuplicateId: async (idType: string, idNumber: string, excludeId?: string) => {
        return apiClient.get('tenants/check-duplicate', { type: idType, number: idNumber, ...(excludeId ? { exclude_id: excludeId } : {}) });
    },
    getArchived: () => apiClient.get('tenants/', { archived: true }),
};

// Payment APIs — backend: /api/payments/
export const paymentAPI = {
    getAll: () => apiClient.get('payments/'),
    getById: (id: string) => apiClient.getById('payments', id),
    create: (data: any) => apiClient.post('payments/', data),
    update: (id: string, data: any) => apiClient.request({
        method: 'put',
        url: `/api/payments/${id}`,
        data,
    }, `UPDATE payments/${id}`),
    delete: (id: string) => apiClient.request({
        method: 'delete',
        url: `/api/payments/${id}`,
    }, `DELETE payments/${id}`),
};

// Expense APIs — backend: /api/expenses/
export const expenseAPI = {
    getAll: () => apiClient.get('expenses'),
    create: (data: any) => apiClient.post('expenses', data),
    update: (id: string, data: any) => apiClient.request({
        method: 'put',
        url: `/api/expenses/${id}`,
        data,
    }, `UPDATE expenses/${id}`),
    delete: (id: string) => apiClient.request({
        method: 'delete',
        url: `/api/expenses/${id}`,
    }, `DELETE expenses/${id}`),
    search: async (params: any) => {
        return apiClient.get('expenses', params);
    },
    getStats: (params: any = {}) => apiClient.get('expenses/stats', params),
    getCategories: () => apiClient.get('expenses/categories'),
};

// Dashboard Stats — backend: /api/dashboard/
export const statsAPI = {
    getDashboardStats: async () => {
        return apiClient.get('dashboard/stats');
    },
    getDashboardKpis: async () => {
        return apiClient.get('dashboard/kpis');
    },
    generateMonthlyInvoices: async () => {
        return apiClient.post('dashboard/generate-invoices', {});
    },
    getDrilldownDetails: async (title: string) => {
        return apiClient.get('dashboard/details', { title });
    },
};

// Profit & Loss APIs — backend: /api/pnl/
export const pnlAPI = {
    getSummary: () => apiClient.get('pnl/summary'),
    getCategoryStats: () => apiClient.get('pnl/categories'),
};

// Bookings/Reservation APIs — backend: /api/bookings/
export const reservationAPI = {
    getAll: () => apiClient.get('bookings/'),
    getById: (id: string) => apiClient.getById('bookings', id),
    create: (data: any) => apiClient.post('bookings/', data),
    update: (id: string, data: any) => apiClient.request({
        method: 'put',
        url: `/api/bookings/${id}`,
        data,
    }, `UPDATE bookings/${id}`),
    delete: (id: string) => apiClient.request({
        method: 'delete',
        url: `/api/bookings/${id}`,
    }, `DELETE bookings/${id}`),
};

// Invoice APIs — backend: /api/invoices/
export const invoiceAPI = {
    getAll: () => apiClient.get('invoices/'),
    getById: (id: string) => apiClient.getById('invoices', id),
    update: (id: string, data: any) => apiClient.request({
        method: 'put',
        url: `/api/invoices/`,
        data: { id, ...data },
    }, `UPDATE invoices/${id}`),
};

// Ledger APIs — backend: /api/payments/ledger
export const ledgerAPI = {
    getAll: () => apiClient.get('payments/ledger'),
    getByTenantId: (tenantId: string) => apiClient.get('payments/ledger', { tenant_id: tenantId }),
};

// Profiles API — backend: /api/profiles/
export const profileAPI = {
    getMe: () => apiClient.get('profiles/me'),
    updateMe: (data: any) => apiClient.request({
        method: 'put',
        url: '/api/profiles/me',
        data,
    }, 'UPDATE profiles/me'),
};

// Maintenance APIs — backend: /api/maintenance/
export const maintenanceAPI = {
    getAll: () => apiClient.get('maintenance/'),
    getById: (id: string) => apiClient.getById('maintenance', id),
    getByEntityId: (entityId: string) => apiClient.get(`maintenance/entity/${entityId}`),
    create: (data: any) => apiClient.post('maintenance/', data),
    update: (id: string, data: any) => apiClient.request({
        method: 'put',
        url: `/api/maintenance/${id}`,
        data,
    }, `UPDATE maintenance/${id}`),
    delete: (id: string) => apiClient.request({
        method: 'delete',
        url: `/api/maintenance/${id}`,
    }, `DELETE maintenance/${id}`),
};

// Financial APIs — backend: /api/financial/
export const financialAPI = {
    getGroupedLedger: () => apiClient.get('financial/grouped-ledger'),
};

