import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// BASE URL without /api/ - paths will include /api/ prefix explicitly (matching web project pattern)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.softsynergysystems.com';

/**
 * API Error class for structured error handling
 */
export class APIError extends Error {
    status: number;
    code: string;
    details: any;
    timestamp: string;

    constructor(message: string, status: number, code: string, details: any = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

// Create axios instance
const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for auth
instance.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Handle network and API errors
 */
const handleError = (error: any, label: string) => {
    if (error.response) {
        // The request was made and the server responded with a status code
        const data = error.response.data;
        const errorMessage = data.message || data.error || data.detail || 'An unknown error occurred';
        const errorCode = data.code || `HTTP_${error.response.status}`;

        console.error(`[${label}] API Error:`, errorMessage, '| Status:', error.response.status);

        throw new APIError(
            errorMessage,
            error.response.status,
            errorCode,
            data.details
        );
    } else if (error.request) {
        // The request was made but no response was received
        console.error(`[${label}] Network Error: No response received`);
        throw new APIError(
            'Network error. Please check your internet connection.',
            0,
            'NETWORK_ERROR',
            error.message
        );
    } else {
        // Something happened in setting up the request
        console.error(`[${label}] Request Error:`, error.message);
        throw error;
    }
};

/**
 * Main API Client
 * All paths must include /api/ prefix to match backend routes
 */
const apiClient = {
    request: async <T>(config: any, label = "API Request"): Promise<T> => {
        try {
            const response = await instance.request(config);
            return response.data as T;
        } catch (error) {
            return handleError(error, label);
        }
    },

    get: async <T>(path: string, params: any = {}): Promise<T> => {
        return apiClient.request({
            method: 'get',
            url: `/api/${path}`,
            params,
        }, `GET ${path}`);
    },

    getById: async <T>(path: string, id: string | number): Promise<T> => {
        return apiClient.request({
            method: 'get',
            url: `/api/${path}/${id}`,
        }, `GET_BY_ID ${path}`);
    },

    post: async <T>(path: string, payload: any): Promise<T> => {
        return apiClient.request({
            method: 'post',
            url: `/api/${path}`,
            data: payload,
        }, `POST ${path}`);
    },

    update: async <T>(path: string, id: string | number, payload: any): Promise<T> => {
        return apiClient.request({
            method: 'patch',
            url: `/api/${path}/${id}`,
            data: payload,
        }, `UPDATE ${path}`);
    },

    delete: async (path: string, id: string | number): Promise<any> => {
        return apiClient.request({
            method: 'delete',
            url: `/api/${path}/${id}`,
        }, `DELETE ${path}`);
    },

    rpc: async <T>(functionName: string, params: any = {}): Promise<T> => {
        // RPC route is at /rpc/ (no /api/ prefix per OpenAPI spec)
        // Function names use underscores as-is — backend matches on exact fn_name
        return apiClient.request({
            method: 'post',
            url: `/api/rpc/${functionName}`,
            data: params,
        }, `RPC ${functionName}`);
    }
};

/**
 * Authentication utilities
 * Auth paths use /api/auth/ prefix
 */
export const authClient = {
    signIn: async (email: string, password: string) => {
        const response: any = await apiClient.request({
            method: 'post',
            url: '/api/auth/login',
            data: { email, password },
        }, 'POST auth/login');
        if (response.access_token) {
            await AsyncStorage.setItem('auth_token', response.access_token);
        }
        return response;
    },

    signUp: async (email: string, password: string, metadata: any = {}) => {
        return apiClient.request({
            method: 'post',
            url: '/api/auth/register',
            data: { email, password, ...metadata },
        }, 'POST auth/register');
    },

    signOut: async () => {
        await AsyncStorage.removeItem('auth_token');
        return { success: true };
    },

    getUser: async () => {
        return apiClient.request({
            method: 'get',
            url: '/api/auth/profile',
        }, 'GET auth/profile');
    },

    requestPasswordReset: async (email: string) => {
        return apiClient.request({
            method: 'post',
            url: '/api/auth/request-password-reset',
            data: { email },
        }, 'POST auth/request-password-reset');
    },

    verifyOtp: async (email: string, otp_code: string) => {
        return apiClient.request({
            method: 'post',
            url: '/api/auth/verify-otp',
            data: { email, otp_code },
        }, 'POST auth/verify-otp');
    },

    resetPassword: async (email: string, new_password: string) => {
        return apiClient.request({
            method: 'post',
            url: '/api/auth/reset-password',
            data: { email, new_password },
        }, 'POST auth/reset-password');
    },
};

export default apiClient;
