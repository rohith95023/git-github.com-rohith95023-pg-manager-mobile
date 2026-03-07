import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.softsynergysystems.com';

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
    const token = localStorage.getItem('auth_token');
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
const handleError = (error, label) => {
  if (error.response) {
    const data = error.response.data;
    const errorMessage = data.message || data.error || 'An unknown error occurred';
    const errorCode = data.code || `HTTP_${error.response.status}`;
    
    console.error(`[${label}] API Error:`, errorMessage, '| Status:', error.response.status);
    
    throw new APIError(
      errorMessage,
      error.response.status,
      errorCode,
      data.details
    );
  } else if (error.request) {
    console.error(`[${label}] Network Error: No response received`);
    throw new APIError(
      'Network error. Please check your internet connection.',
      0,
      'NETWORK_ERROR',
      error.message
    );
  } else {
    console.error(`[${label}] Request Error:`, error.message);
    throw error;
  }
};

/**
 * Main API Client
 */
const apiClient = {
  request: async (config, label = "API Request") => {
    try {
      const response = await instance.request(config);
      return response.data;
    } catch (error) {
      return handleError(error, label);
    }
  },

  get: async (path, params = {}) => {
    return apiClient.request({
      method: 'get',
      url: path,
      params,
    }, `GET ${path}`);
  },

  getById: async (path, id) => {
    return apiClient.request({
      method: 'get',
      url: `${path}/${id}`,
    }, `GET_BY_ID ${path}`);
  },

  post: async (path, payload) => {
    return apiClient.request({
      method: 'post',
      url: path,
      data: payload,
    }, `POST ${path}`);
  },

  update: async (path, id, payload) => {
    return apiClient.request({
      method: 'patch',
      url: `${path}/${id}`,
      data: payload,
    }, `UPDATE ${path}`);
  },

  delete: async (path, id) => {
    return apiClient.request({
      method: 'delete',
      url: `${path}/${id}`,
    }, `DELETE ${path}`);
  },

  rpc: async (functionName, params = {}) => {
    return apiClient.request({
      method: 'post',
      url: `/rpc/${functionName.replace(/_/g, '-')}`,
      data: params,
    }, `RPC ${functionName}`);
  }
};

/**
 * Authentication utilities
 */
export const authClient = {
  signIn: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.access_token) {
      localStorage.setItem('auth_token', response.access_token);
    }
    return response;
  },

  signUp: async (email, password, metadata = {}) => {
    return apiClient.post('/auth/register', { email, password, metadata });
  },

  signOut: async () => {
    localStorage.removeItem('auth_token');
    return { success: true };
  },

  getUser: async () => {
    return apiClient.get('/auth/me');
  },
};

export default apiClient;
