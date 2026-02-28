import { supabase } from "../lib/supabaseClient";
import { Database } from "../types/supabase";
import { PostgrestResponse, PostgrestSingleResponse } from "@supabase/supabase-js";

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

/**
 * Normalize Supabase response to consistent format
 */
const normalizeResponse = <T>(response: PostgrestResponse<T> | PostgrestSingleResponse<T>, label: string): T | { data: T; count: number } => {
    const { data, error, count, status } = response as any;

    if (error) {
        const errorCode = error.code || 'UNKNOWN_ERROR';
        const errorMessage = error.message || 'An unknown error occurred';
        const errorDetails = error.details || error.hint;

        console.error(`[${label}] Error:`, errorMessage, errorDetails || '');

        throw new APIError(
            errorMessage,
            status || 500,
            errorCode,
            errorDetails
        );
    }

    if (count !== null && count !== undefined) {
        return { data, count };
    }

    return data;
};

/**
 * Handle network errors
 */
const handleNetworkError = (error: any, label: string) => {
    console.error(`[${label}] Network Error:`, error.message);

    if (error.message.includes('fetch')) {
        throw new APIError(
            'Network error. Please check your internet connection.',
            0,
            'NETWORK_ERROR',
            error.message
        );
    }

    throw error;
};

/**
 * API Client Configuration
 */
const config = {
    timeout: 30000,
    retryAttempts: 2,
    retryDelay: 1000,
};

/**
 * Log activity to the master recovery vault
 */
const logActivity = async (table: string, operation: string, data: any, entityId: string | null = null) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("master_activity_logs").insert([{
            owner_id: user.id,
            entity_type: table.toUpperCase(),
            operation_type: operation,
            entity_id: entityId,
            form_data: data
        }]);
    } catch (e) {
        console.warn("[LogActivity] Failed to backup form data:", e);
    }
};

/**
 * Core Request Wrapper
 */
const performRequest = async <T>(requestFn: () => Promise<any>, label = "API Request", options: any = {}): Promise<T> => {
    const { retry = true, timeout = config.timeout } = options;
    let attempts = 0;
    const maxAttempts = retry ? config.retryAttempts : 1;

    while (attempts < maxAttempts) {
        try {
            attempts++;

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            );

            const response = await Promise.race([
                requestFn(),
                timeoutPromise
            ]);

            return normalizeResponse(response, label) as T;

        } catch (error: any) {
            const isLastAttempt = attempts >= maxAttempts;

            if (error.name === 'APIError' &&
                ['AUTH_ERROR', 'VALIDATION_ERROR', 'CLIENT_ERROR'].includes(error.code)) {
                throw error;
            }

            if (isLastAttempt) {
                return handleNetworkError(error, label);
            }

            await new Promise(resolve =>
                setTimeout(resolve, config.retryDelay * attempts)
            );

            console.warn(`[${label}] Retrying... (attempt ${attempts + 1}/${maxAttempts})`);
        }
    }
    throw new Error('Request failed after max attempts');
};

/**
 * Main API Client - Hardened for Production
 */
const apiClient = {
    request: performRequest,

    get: async <T>(table: keyof Database['public']['Tables'], selectOrQueryFn?: string | ((query: any) => any), queryFn?: (query: any) => any): Promise<T> => {
        let select = "*";
        let finalQueryFn = queryFn;

        if (typeof selectOrQueryFn === 'function') {
            finalQueryFn = selectOrQueryFn;
        } else if (typeof selectOrQueryFn === 'string') {
            select = selectOrQueryFn;
        }

        return performRequest(async () => {
            let query = supabase.from(table).select(select);

            // 🔥 PRODUCTION HARDENING: Uncomment after running SQL migration
            // query = query.neq("is_deleted", true);

            if (finalQueryFn) query = finalQueryFn(query);
            return await query;
        }, `GET ${table}`);
    },

    getView: async <T>(view: keyof Database['public']['Views'], select = "*"): Promise<T> => {
        return performRequest(async () => {
            return await supabase.from(view).select(select);
        }, `GET_VIEW ${view}`);
    },

    getById: async <T>(table: keyof Database['public']['Tables'], id: string | number, select = "*"): Promise<T> => {
        return performRequest(async () => {
            return await supabase.from(table).select(select).eq("id", id).single();
        }, `GET_BY_ID ${table}`);
    },

    post: async <T>(table: keyof Database['public']['Tables'], payload: any): Promise<T> => {
        return performRequest(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const enhancedPayload = { ...payload };

            // Production Hardening: Auto-inject audit fields (Uncomment after DB migration)
            /*
            if (user) {
                if (!enhancedPayload.owner_id) enhancedPayload.owner_id = user.id;
                enhancedPayload.updated_by = user.id;
            }
            */

            const response = await supabase.from(table).insert(enhancedPayload).select().single();
            if (response.data) {
                logActivity(table, 'INSERT', enhancedPayload, (response.data as any).id);
            }
            return response;
        }, `POST ${table}`);
    },

    update: async <T>(table: keyof Database['public']['Tables'], id: string | number, payload: any): Promise<T> => {
        return performRequest(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const enhancedPayload = { ...payload };

            // Production Hardening: Auto-inject audit fields (Uncomment after DB migration)
            /*
            if (user) {
                enhancedPayload.updated_by = user.id;
            }
            */

            const response = await supabase.from(table).update(enhancedPayload).eq("id", id).select().single();
            if (response.data) {
                logActivity(table, 'UPDATE', enhancedPayload, id.toString());
            }
            return response;
        }, `UPDATE ${table}`);
    },

    delete: async (table: keyof Database['public']['Tables'], id: string | number): Promise<any> => {
        return performRequest(async () => {
            // 🔥 PRODUCTION HARDENING: Uncomment after running SQL migration to enable soft-delete
            // const response = await supabase.from(table).update({ is_deleted: true, status: "DELETED" }).eq("id", id);
            // logActivity(table, 'DELETE_SOFT', { id }, id.toString());
            // return response;

            logActivity(table, 'DELETE_HARD', { id }, id.toString());
            return await supabase.from(table).delete().eq("id", id);
        }, `DELETE ${table}`);
    },

    rpc: async <T>(functionName: keyof Database['public']['Functions'], params: any = {}): Promise<T> => {
        return performRequest(async () => {
            return await supabase.rpc(functionName, params);
        }, `RPC ${functionName}`);
    }
};

/**
 * Authentication utilities
 */
export const authClient = {
    signIn: async (email: string, password: string) => {
        return performRequest(async () => {
            return await supabase.auth.signInWithPassword({ email, password });
        }, 'AUTH signIn');
    },

    signUp: async (email: string, password: string, metadata = {}) => {
        return performRequest(async () => {
            return await supabase.auth.signUp({
                email,
                password,
                options: { data: metadata }
            });
        }, 'AUTH signUp');
    },

    signOut: async () => {
        return performRequest(async () => {
            return await supabase.auth.signOut();
        }, 'AUTH signOut');
    },

    getUser: async () => {
        return performRequest(async () => {
            return await supabase.auth.getUser();
        }, 'AUTH getUser');
    },
};

export default apiClient;
