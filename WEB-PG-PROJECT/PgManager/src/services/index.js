/**
 * API Services Index
 * 
 * Centralized export of all API services and utilities.
 * This provides a single entry point for all backend communications.
 * 
 * Usage:
 * import { api, authClient, subscribeToTable } from '@/services';
 * import { pgAPI, roomAPI, tenantAPI, paymentAPI } from '@/services/api';
 */

// Re-export API client and utilities
export { default as apiClient, authClient, subscribeToTable, APIError } from './apiClient';

// Re-export all API modules
export * from './api';

// Default export for convenience
import api from './api';
export default api;
