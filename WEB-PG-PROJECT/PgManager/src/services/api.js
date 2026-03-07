import apiClient, { authClient } from "./apiClient";

// Auth APIs
export const authAPI = {
  login: async (credentials) => {
    return authClient.signIn(credentials.email, credentials.password);
  },
  logout: async () => {
    return authClient.signOut();
  },
};

// PG APIs
export const pgAPI = {
  getAll: () => apiClient.get("pgs"),
  getActive: () => apiClient.get("pgs", { status: 'ACTIVE' }),
  getArchived: () => apiClient.get("pgs", { status: 'INACTIVE' }),
  getById: (id) => apiClient.getById("pgs", id),
  create: (data) => apiClient.post("pgs", data),
  update: (id, data) => apiClient.update("pgs", id, data),
  archive: async (id, nameSuffix) => {
    return apiClient.rpc('archive_pg_cascade', {
        p_pg_id: id,
        p_archived_name_suffix: nameSuffix
    });
  },
  restore: async (id) => {
    return apiClient.rpc('restore_pg_cascade', {
        p_pg_id: id
    });
  },
  hardDelete: async (id) => {
    return apiClient.delete("pgs", id);
  },
};

// Room APIs
export const roomAPI = {
  getAll: () => apiClient.get("rooms"),
  getById: (id) => apiClient.getById("rooms", id),
  getByPgId: (pgId) => apiClient.get(`pgs/${pgId}/rooms`),
  getActiveByPgId: (pgId) => apiClient.get(`pgs/${pgId}/rooms`, { status: 'ACTIVE' }),
  create: async (roomData) => {
    return apiClient.post("rooms", roomData);
  },
  update: async (id, data) => {
    return apiClient.update("rooms", id, data);
  },
  delete: async (id) => {
    return apiClient.delete("rooms", id);
  },
  recalculateOccupancy: async (roomId) => {
    return apiClient.rpc('recalculate_occupancy', { p_room_id: roomId });
  }
};

// Bed APIs
export const bedAPI = {
  getAll: () => apiClient.get("beds"),
  getById: (id) => apiClient.getById("beds", id),
  getByRoomId: (roomId) => apiClient.get(`rooms/${roomId}/beds`),
  getAvailableBedsByRoomId: (roomId) => apiClient.get(`rooms/${roomId}/beds`, { status: 'AVAILABLE' }),
  create: (data) => apiClient.post("beds", data),
  update: async (id, data) => {
    return apiClient.update("beds", id, data);
  },
  delete: async (id) => {
    return apiClient.delete("beds", id);
  },
};

// Tenant APIs
export const tenantAPI = {
  getAll: () => apiClient.get("tenants"),
  getActive: () => apiClient.get("tenants", { status: 'ACTIVE' }),
  getById: (id) => apiClient.getById("tenants", id),
  create: async (data) => {
    return apiClient.post("tenants", data);
  },
  update: async (id, data) => {
    return apiClient.update("tenants", id, data);
  },
  delete: (id) => apiClient.delete("tenants", id),
  archive: async (id) => {
    return apiClient.update("tenants", id, { status: 'DELETED' });
  },
  getArchived: () => apiClient.get("tenants", { status: 'DELETED' }),
  hardDelete: async (id) => {
     return apiClient.delete("tenants", id);
  },
  search: async (params) => {
    return apiClient.get("tenants/search", params);
  },
  getDailyStayTenants: async (params) => {
    return apiClient.get("tenants/daily", params);
  },
  getOutstandingBalance: (tenantId) => apiClient.get(`tenants/${tenantId}/balance`),
};

// Reservation APIs
export const reservationAPI = {
  getAll: () => apiClient.get("bookings"),
  getById: (id) => apiClient.getById("bookings", id),
  getByRoomId: (roomId) => apiClient.get(`rooms/${roomId}/bookings`),
  checkAvailability: (roomId, start, end) => apiClient.get(`rooms/${roomId}/availability`, { start, end }),
  create: (data) => apiClient.post("bookings", data),
  update: (id, data) => apiClient.update("bookings", id, data),
  delete: (id) => apiClient.delete("bookings", id),
};

// Payment APIs
export const paymentAPI = {
  getAll: () => apiClient.get("payments"),
  getById: (id) => apiClient.getById("payments", id),
  getByTenantId: (tenantId) => apiClient.get(`tenants/${tenantId}/payments`),
  getByReservationId: (reservationId) => apiClient.get(`bookings/${reservationId}/payments`),
  create: (data) => apiClient.post("payments", data),
  update: (id, data) => apiClient.update("payments", id, data),
  delete: (id) => apiClient.delete("payments", id),
};

// Expense APIs
export const expenseAPI = {
  getAll: () => apiClient.get("expenses"),
  getById: (id) => apiClient.getById("expenses", id),
  create: (data) => apiClient.post("expenses", data),
  update: (id, data) => apiClient.update("expenses", id, data),
  delete: (id) => apiClient.delete("expenses", id),
};

// Dashboard/Stats APIs
export const statsAPI = {
  getDashboardStats: async () => {
    return apiClient.get("stats/dashboard");
  },
};
