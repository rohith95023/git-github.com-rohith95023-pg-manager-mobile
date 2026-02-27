/**
 * Enhanced API Client Implementation
 * 
 * A centralized API utility layer that handles all backend calls with:
 * - Global error handling
 * - Request/Response logging
 * - Response normalization
 * - Authentication handling
 * - Retry logic
 * - Timeout handling
 */

import { supabase } from "../lib/supabaseClient";

/**
 * API Error class for structured error handling
 */
export class APIError extends Error {
  constructor(message, status, code, details = null) {
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
 * Returns data directly for backward compatibility with existing API functions
 */
const normalizeResponse = (response, label) => {
  const { data, error, count, status, statusText } = response;
  
  if (error) {
    // Parse Supabase error
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

  // Return data directly for backward compatibility
  // If count is present, return both for pagination
  if (count !== null && count !== undefined) {
      return { data, count };
  }

  return data;
};

/**
 * Handle network errors
 */
const handleNetworkError = (error, label) => {
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
  timeout: 30000, // 30 seconds
  retryAttempts: 2,
  retryDelay: 1000,
};

/**
 * Log activity to the master recovery vault
 */
const logActivity = async (table, operation, data, entityId = null) => {
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
 * Main API Client
 */
const apiClient = {
  /**
   * Generic request handler with retry logic
   * @param {Function} requestFn - Function that returns a Supabase promise
   * @param {string} label - Label for logging
   * @param {Object} options - Request options (retry, timeout)
   */
  request: async (requestFn, label = "API Request", options = {}) => {
    const { retry = true, timeout = config.timeout } = options;
    let attempts = 0;
    const maxAttempts = retry ? config.retryAttempts : 1;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );

        // Race between request and timeout
        const response = await Promise.race([
          requestFn(),
          timeoutPromise
        ]);

        return normalizeResponse(response, label);
        
      } catch (error) {
        const isLastAttempt = attempts >= maxAttempts;
        
        // Don't retry on certain errors
        if (error.name === 'APIError' && 
            ['AUTH_ERROR', 'VALIDATION_ERROR', 'CLIENT_ERROR'].includes(error.code)) {
          throw error;
        }

        // Retry on timeout or network errors
        if (isLastAttempt) {
          return handleNetworkError(error, label);
        }

        // Wait before retry
        await new Promise(resolve => 
          setTimeout(resolve, config.retryDelay * attempts)
        );
        
        console.warn(`[${label}] Retrying... (attempt ${attempts + 1}/${maxAttempts})`);
      }
    }
  },

  get: (table, selectOrQueryFn, queryFn) => {
    let select = "*";
    let finalQueryFn = queryFn;

    if (typeof selectOrQueryFn === 'function') {
        finalQueryFn = selectOrQueryFn;
    } else if (typeof selectOrQueryFn === 'string') {
        select = selectOrQueryFn;
    }

    return apiClient.request(async () => {
      let query = supabase.from(table).select(select);
      if (finalQueryFn) query = finalQueryFn(query);
      return await query;
    }, `GET ${table}`);
  },

  /**
   * GET by ID - Fetch single record
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @param {string} select - Columns to select (default: *)
   */
  getById: (table, id, select = "*") => {
    return apiClient.request(async () => {
      return await supabase.from(table).select(select).eq("id", id).single();
    }, `GET_BY_ID ${table}`);
  },

  /**
   * POST request - Create new record
   * @param {string} table - Table name
   * @param {Object} payload - Data to insert
   */
  post: (table, payload) => {
    return apiClient.request(async () => {
      const response = await supabase.from(table).insert(payload).select().single();
      if (response.data) {
          logActivity(table, 'INSERT', payload, response.data.id);
      }
      return response;
    }, `POST ${table}`);
  },

  /**
   * POST multiple - Insert multiple records
   * @param {string} table - Table name
   * @param {Array} payload - Array of data to insert
   */
  postMany: (table, payload) => {
    return apiClient.request(async () => {
      return await supabase.from(table).insert(payload).select();
    }, `POST_MANY ${table}`);
  },

  /**
   * PUT/PATCH request - Update record
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @param {Object} payload - Data to update
   */
  update: (table, id, payload) => {
    return apiClient.request(async () => {
      const response = await supabase.from(table).update(payload).eq("id", id).select().single();
      if (response.data) {
          logActivity(table, 'UPDATE', payload, id);
      }
      return response;
    }, `UPDATE ${table}`);
  },

  /**
   * Upsert - Insert or update record
   * @param {string} table - Table name
   * @param {Object} payload - Data to upsert
   * @param {string} conflictKey - Conflict resolution key (default: id)
   */
  upsert: (table, payload, conflictKey = 'id') => {
    return apiClient.request(async () => {
      return await supabase.from(table).upsert(payload, { onConflict: conflictKey }).select();
    }, `UPSERT ${table}`);
  },

  /**
   * DELETE request - Remove record
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   */
  delete: (table, id) => {
    return apiClient.request(async () => {
      return await supabase.from(table).delete().eq("id", id);
    }, `DELETE ${table}`);
  },

  /**
   * Delete multiple - Remove multiple records
   * @param {string} table - Table name
   * @param {Array} ids - Array of IDs to delete
   */
  deleteMany: (table, ids) => {
    return apiClient.request(async () => {
      return await supabase.from(table).delete().in("id", ids);
    }, `DELETE_MANY ${table}`);
  },

  /**
   * Batch operations - Execute multiple operations
   * @param {Array} operations - Array of operation objects
   */
  batch: async (operations) => {
    const results = await Promise.allSettled(
      operations.map(op => {
        const { type, table, payload, id } = op;
        switch (type) {
          case 'create':
            return apiClient.post(table, payload);
          case 'update':
            return apiClient.update(table, id, payload);
          case 'delete':
            return apiClient.delete(table, id);
          default:
            throw new Error(`Unknown operation type: ${type}`);
        }
      })
    );

    return results.map((result, index) => ({
      operation: operations[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  },

  /**
   * Count records in a table
   * @param {string} table - Table name
   * @param {Function} queryFn - Optional query filter
   */
  count: (table, queryFn) => {
    return apiClient.request(async () => {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      if (queryFn) query = queryFn(query);
      return await query;
    }, `COUNT ${table}`);
  },

  /**
   * RPC call - Execute stored procedure
   * @param {string} functionName - Function name
   * @param {Object} params - Function parameters
   */
  rpc: (functionName, params = {}) => {
    return apiClient.request(async () => {
      return await supabase.rpc(functionName, params);
    }, `RPC ${functionName}`);
  }
};

/**
 * Authentication utilities
 */
export const authClient = {
  /**
   * Sign in with email and password
   */
  signIn: async (email, password) => {
    return apiClient.request(async () => {
      return await supabase.auth.signInWithPassword({ email, password });
    }, 'AUTH signIn');
  },

  /**
   * Sign up with email and password
   */
  signUp: async (email, password, metadata = {}) => {
    return apiClient.request(async () => {
      return await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: metadata }
      });
    }, 'AUTH signUp');
  },

  /**
   * Sign out
   */
  signOut: async () => {
    return apiClient.request(async () => {
      return await supabase.auth.signOut();
    }, 'AUTH signOut');
  },

  /**
   * Get current user
   */
  getUser: async () => {
    return apiClient.request(async () => {
      return await supabase.auth.getUser();
    }, 'AUTH getUser');
  },

  /**
   * Refresh session
   */
  refreshSession: async () => {
    return apiClient.request(async () => {
      return await supabase.auth.refreshSession();
    }, 'AUTH refreshSession');
  },

  /**
   * Reset password
   */
  resetPassword: async (email) => {
    return apiClient.request(async () => {
      return await supabase.auth.resetPasswordForEmail(email);
    }, 'AUTH resetPassword');
  },

  /**
   * Update password
   */
  updatePassword: async (password) => {
    return apiClient.request(async () => {
      return await supabase.auth.updateUser({ password });
    }, 'AUTH updatePassword');
  }
};

/**
 * Realtime subscription helper
 */
export const subscribeToTable = (table, callback, event = '*') => {
  const channel = supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', { 
      event, 
      schema: 'public', 
      table 
    }, callback)
    .subscribe();

  return () => supabase.removeChannel(channel);
};

export default apiClient;
