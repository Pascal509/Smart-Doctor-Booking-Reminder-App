import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken, clearAuthData } from '../../utils/tokenStorage';

/**
 * Configuration options for the API client
 */
interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Custom error class for API client errors
 */
export class ApiClientError extends Error {
  public status?: number;
  public code?: string;
  public response?: any;

  constructor(message: string, status?: number, code?: string, response?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.response = response;
  }
}

/**
 * Secure API Client utility that automatically handles JWT token injection
 * and provides a consistent interface for all API calls
 */
class SecureApiClient {
  private axiosInstance: AxiosInstance;
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - automatically inject JWT token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(new ApiClientError('Request setup failed', undefined, 'REQUEST_SETUP_ERROR', error));
      }
    );

    // Response interceptor - handle common errors and token expiration
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Clear invalid token
          clearAuthData();
          
          // Redirect to login or emit event for global handling
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:token-expired'));
          }
          
          return Promise.reject(new ApiClientError(
            'Authentication failed - token expired or invalid',
            401,
            'TOKEN_EXPIRED',
            error.response?.data
          ));
        }

        // Handle other HTTP errors
        const status = error.response?.status;
        const errorData = error.response?.data as any;
        const message = errorData?.message || (error as any).message || 'An error occurred';
        
        return Promise.reject(new ApiClientError(
          message,
          status,
          error.code,
          errorData
        ));
      }
    );
  }

  /**
   * Retry mechanism for failed requests
   */
  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    attempt: number = 1
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt < this.config.retryAttempts && this.shouldRetry(error as ApiClientError)) {
        await this.delay(this.config.retryDelay * attempt);
        return this.retryRequest(requestFn, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetry(error: ApiClientError): boolean {
    // Retry on network errors or 5xx server errors, but not on 4xx client errors
    return !error.status || (error.status >= 500 && error.status < 600);
  }

  /**
   * Delay utility for retry mechanism
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.axiosInstance.get<T>(url, config));
    return response.data;
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.axiosInstance.post<T>(url, data, config));
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.axiosInstance.put<T>(url, data, config));
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.axiosInstance.patch<T>(url, data, config));
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.axiosInstance.delete<T>(url, config));
    return response.data;
  }

  /**
   * Get the underlying axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Update the base URL
   */
  setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  /**
   * Set custom headers
   */
  setHeaders(headers: Record<string, string>): void {
    Object.assign(this.axiosInstance.defaults.headers, headers);
  }

  /**
   * Clear all custom headers except Content-Type and Authorization
   */
  clearCustomHeaders(): void {
    // Reset to default headers
    this.axiosInstance.defaults.headers.common = {
      'Content-Type': 'application/json',
    };
  }
}

// Create and export a singleton instance
const apiClient = new SecureApiClient();

export default apiClient;

// Export the class for custom instances if needed
export { SecureApiClient };

// Export convenience methods for direct usage
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => apiClient.delete<T>(url, config),
};

/**
 * Usage Examples:
 * 
 * // Using the singleton instance
 * import apiClient from './utils/apiClient';
 * const doctors = await apiClient.get('/api/v1/doctors');
 * 
 * // Using convenience methods
 * import { api } from './utils/apiClient';
 * const appointment = await api.post('/api/v1/appointments', appointmentData);
 * 
 * // Creating a custom instance
 * import { SecureApiClient } from './utils/apiClient';
 * const customClient = new SecureApiClient({ baseURL: 'https://api.example.com' });
 * 
 * // Handling token expiration events
 * window.addEventListener('auth:token-expired', () => {
 *   // Redirect to login or show login modal
 *   window.location.href = '/login';
 * });
 */