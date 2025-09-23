// Authentication-related TypeScript types and interfaces

/**
 * Login credentials interface for the login form
 */
export interface LoginData {
  username: string;
  password: string;
}

/**
 * User information returned from the backend after successful authentication
 */
export interface AuthUser {
  user_id: number;
  username: string;
  role: string;
}

/**
 * Complete authentication state for the application
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Login response from the backend API
 */
export interface LoginResponse {
  token: string;
  user_id: number;
  username: string;
  role: string;
  message: string;
}

/**
 * Authentication context type for React Context
 */
export interface AuthContextType {
  // State
  authState: AuthState;
  
  // Actions
  login: (credentials: LoginData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

/**
 * API Error response structure
 */
export interface AuthApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Token validation response from backend
 */
export interface TokenValidationResponse {
  valid: boolean;
  user_id: number;
  username: string;
  role: string;
  message: string;
}