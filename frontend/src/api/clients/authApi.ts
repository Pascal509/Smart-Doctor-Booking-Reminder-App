// Authentication API client functions

import { LoginData, LoginResponse, TokenValidationResponse } from '../types/auth';
import { storeToken, storeUser, getAuthHeader, getToken } from '../../utils/tokenStorage';
import apiClient from './apiClient';

const AUTH_ENDPOINT = `/api/v1/auth`;

/**
 * Login function that calls POST /api/v1/auth/login
 * On success, stores the JWT token securely and returns user data
 * @param credentials - User login credentials
 * @returns Promise with user data
 * @throws Error with authentication failure details
 */
export const login = async (credentials: LoginData): Promise<LoginResponse> => {
  try {
    // Validate input
    if (!credentials.username || !credentials.password) {
      throw new Error('Username and password are required');
    }

    // Make API request to backend
    const response = await apiClient.post<LoginResponse>(
      `${AUTH_ENDPOINT}/login`,
      {
        username: credentials.username.trim(),
        password: credentials.password
      }
    );

    const loginData = response;

    // Validate response structure
    if (!loginData.token || !loginData.username) {
      throw new Error('Invalid response from server');
    }

    // Store token securely in sessionStorage
    storeToken(loginData.token);

    // Store user information
    const userData = {
      user_id: loginData.user_id,
      username: loginData.username,
      role: loginData.role
    };
    storeUser(userData);

    return loginData;

  } catch (error: any) {
    // Handle different types of errors
    if (error.status) {
      // Server responded with error status
      const errorMessage = error.response?.message || error.message || 'Authentication failed';
      throw new Error(errorMessage);
    } else {
      // Network error
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  }
};

/**
 * Validate the current JWT token with the backend
 * @returns Promise with validation result
 */
export const validateToken = async (): Promise<TokenValidationResponse> => {
  try {
    const authHeader = getAuthHeader();
    
    if (!authHeader) {
      throw new Error('No authentication token found');
    }

    const response = await apiClient.get<TokenValidationResponse>(
      `${AUTH_ENDPOINT}/validate`
    );

    return response;

  } catch (error: any) {
    if (error.status) {
      const message = error.response?.message || error.message || 'Token validation failed';
      
      throw new Error(message);
    } else {
      throw new Error('Network error during token validation');
    }
  }
};

/**
 * Logout function that calls the backend logout endpoint
 * @returns Promise that resolves when logout is complete
 */
export const logout = async (): Promise<void> => {
  try {
    const token = getToken();
    
    if (token) {
      // Call backend logout endpoint
      await apiClient.post(
        `${AUTH_ENDPOINT}/logout`,
        {}
      );
    }
  } catch (error) {
    // Log error but don't throw - logout should always succeed locally
    console.warn('Backend logout failed:', error);
  }
};

/**
 * Comprehensive logout function that handles both backend logout and local cleanup
 * This function calls POST /api/v1/auth/logout, clears stored JWT tokens, and can be used
 * independently or with AuthContext integration
 * 
 * @returns Promise that resolves when logout process is complete
 * @throws Error only for critical failures that prevent local cleanup
 * 
 * Usage:
 * ```typescript
 * // Standalone usage
 * await logoutUser();
 * 
 * // With AuthContext (recommended)
 * const { logout } = useAuth();
 * await logout(); // This internally calls logoutUser
 * ```
 */
export const logoutUser = async (): Promise<void> => {
  try {
    // Step 1: Call backend logout endpoint to invalidate token server-side
    await logout();
  } catch (error) {
    // Backend logout failed, but we should still clear local data
    console.warn('Backend logout failed, proceeding with local cleanup:', error);
  }
  
  // Step 2: Always clear local storage/session data regardless of backend response
  // Import clearAuthData here to avoid circular dependencies
  const { clearAuthData } = await import('../../utils/tokenStorage');
  clearAuthData();
  
  // Note: If using with AuthContext, the context's logout function will also
  // dispatch the LOGOUT action to update the global state
};

// Note: The createAuthenticatedAxios function has been replaced by the new
// secure API client utility (apiClient) which automatically handles
// JWT token injection and authentication errors.