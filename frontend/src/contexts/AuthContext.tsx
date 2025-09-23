// Authentication Context for global state management

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, AuthContextType, LoginData, AuthUser } from '../api/types/auth';
import { login as apiLogin, validateToken, logout as apiLogout } from '../api/clients/authApi';
import { getToken, getUser, clearAuthData } from '../utils/tokenStorage';

// Initial authentication state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true, // Start with loading true to check existing session
  error: null,
};

// Authentication action types
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: AuthUser; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESTORE_SESSION'; payload: { user: AuthUser; token: string } };

// Authentication reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    
    case 'RESTORE_SESSION':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    
    default:
      return state;
  }
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, dispatch] = useReducer(authReducer, initialAuthState);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const existingToken = getToken();
        const existingUser = getUser();

        if (existingToken && existingUser) {
          // Validate token with backend
          try {
            const validationResult = await validateToken();
            
            if (validationResult.valid) {
              // Session is valid, restore it
              dispatch({
                type: 'RESTORE_SESSION',
                payload: {
                  user: {
                    user_id: validationResult.user_id,
                    username: validationResult.username,
                    role: validationResult.role,
                  },
                  token: existingToken,
                },
              });
            } else {
              // Token is invalid, clear storage
              clearAuthData();
              dispatch({ type: 'SET_LOADING', payload: false });
            }
          } catch (error) {
            // Token validation failed, clear storage
            clearAuthData();
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          // No existing session
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkExistingSession();
  }, []);

  // Login function
  const login = async (credentials: LoginData): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const loginResponse = await apiLogin(credentials);
      
      const user: AuthUser = {
        user_id: loginResponse.user_id,
        username: loginResponse.username,
        role: loginResponse.role,
      };

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user,
          token: loginResponse.token,
        },
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please try again.';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw error; // Re-throw so components can handle it
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Call backend logout (optional, for token blacklisting)
      await apiLogout();
    } catch (error) {
      console.warn('Backend logout failed:', error);
    } finally {
      // Always clear local data
      clearAuthData();
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Context value
  const contextValue: AuthContextType = {
    authState,
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Export the context for advanced use cases
export { AuthContext };