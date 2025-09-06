import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';

const API_BASE_URL = '/api';

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request counter for loading states
let activeRequests = 0;
const loadingCallbacks: Set<(loading: boolean) => void> = new Set();

export const subscribeToLoadingState = (callback: (loading: boolean) => void) => {
  loadingCallbacks.add(callback);
  return () => loadingCallbacks.delete(callback);
};

const updateLoadingState = () => {
  const isLoading = activeRequests > 0;
  loadingCallbacks.forEach(callback => callback(isLoading));
};

// Request interceptor to add auth token and track loading
api.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = Math.random().toString(36).substring(2, 15);

    // Track loading state
    activeRequests++;
    updateLoadingState();

    return config;
  },
  (error) => {
    activeRequests--;
    updateLoadingState();
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and loading
api.interceptors.response.use(
  (response) => {
    activeRequests--;
    updateLoadingState();
    return response;
  },
  async (error: AxiosError) => {
    activeRequests--;
    updateLoadingState();

    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Handle network errors with retry logic
    if (!error.response && error.code === 'ECONNABORTED') {
      // Timeout error
      error.message = 'Request timed out. Please check your connection and try again.';
    } else if (!error.response) {
      // Network error
      error.message = 'Network error. Please check your connection and try again.';
    }

    return Promise.reject(error);
  }
);

// Enhanced error handling with user-friendly messages
export const handleApiError = (error: any): string => {
  // Handle validation errors with detailed messages
  if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
    const details = error.response.data.error.details;
    if (details && Array.isArray(details) && details.length > 0) {
      return details.map((detail: any) => detail.message).join(', ');
    }
    return 'Please check your input and try again.';
  }

  // Handle specific error codes
  if (error.response?.data?.error?.code) {
    const errorCode = error.response.data.error.code;
    const userFriendlyMessages: Record<string, string> = {
      'UNAUTHORIZED': 'Please log in to continue.',
      'FORBIDDEN': 'You don\'t have permission to perform this action.',
      'NOT_FOUND': 'The requested resource was not found.',
      'CONFLICT': 'This action conflicts with existing data.',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
      'SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again later.',
      'GATEWAY_TIMEOUT': 'Request timed out. Please try again.',
      'DATABASE_ERROR': 'A database error occurred. Please try again.',
      'PAYMENT_FAILED': 'Payment processing failed. Please check your payment details.',
      'INSUFFICIENT_INVENTORY': 'Not enough items in stock.',
      'INVALID_CREDENTIALS': 'Invalid email or password.',
      'EMAIL_ALREADY_EXISTS': 'An account with this email already exists.',
      'TOKEN_EXPIRED': 'Your session has expired. Please log in again.'
    };

    if (userFriendlyMessages[errorCode]) {
      return userFriendlyMessages[errorCode];
    }
  }

  // Handle HTTP status codes
  if (error.response?.status) {
    const statusMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Authentication required. Please log in.',
      403: 'Access denied.',
      404: 'Resource not found.',
      409: 'Conflict with existing data.',
      422: 'Invalid data provided.',
      429: 'Too many requests. Please try again later.',
      500: 'Server error. Please try again later.',
      502: 'Service unavailable. Please try again later.',
      503: 'Service temporarily unavailable.',
      504: 'Request timeout. Please try again.'
    };

    if (statusMessages[error.response.status]) {
      return statusMessages[error.response.status];
    }
  }

  // Fallback to API error message or generic message
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  if (error.message) {
    // Make network errors more user-friendly
    if (error.message.includes('Network Error')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

// Retry wrapper for API calls
export const withRetry = async <T>(
  apiCall: () => Promise<AxiosResponse<T>>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<AxiosResponse<T>> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx) except for 408, 429
      if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        if (error.response.status !== 408 && error.response.status !== 429) {
          throw error;
        }
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      const waitTime = delay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
};

export const createApiResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// Recommendation API functions
export const recommendationApi = {
  getRecommendations: async (userId: string, limit: number = 10) => {
    try {
      const response = await api.get(`/recommendations/${userId}?limit=${limit}`);
      return response.data;
    } catch (error: any) {
      console.warn('Recommendation service unavailable, using fallback:', error.message);
      
      // Fallback: Get popular products from product service
      try {
        const fallbackResponse = await api.get(`/products?limit=${limit}&sort=popular`);
        if (fallbackResponse.data.success && fallbackResponse.data.data?.products) {
          const products = fallbackResponse.data.data.products;
          return {
            success: true,
            data: products.map((product: any) => ({
              productId: product._id,
              product: product,
              score: 0.5,
              reason: 'Popular'
            })),
            user_id: userId,
            count: products.length
          };
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      
      // Final fallback: empty recommendations
      return {
        success: true,
        data: [],
        user_id: userId,
        count: 0
      };
    }
  },

  trackInteraction: async (interaction: {
    userId: string;
    productId: string;
    interactionType: 'view' | 'cart_add' | 'purchase';
    sessionId?: string;
  }) => {
    try {
      const response = await api.post('/interactions', interaction);
      return response.data;
    } catch (error: any) {
      console.warn('Failed to track interaction:', error.message);
      // Fail silently for tracking errors - don't disrupt user experience
      return { success: false };
    }
  }
};