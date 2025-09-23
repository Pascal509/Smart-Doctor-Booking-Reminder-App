import { useState, useEffect } from 'react';
import { validateToken } from '../api/clients/authApi';
import { getToken } from '../utils/tokenStorage';

/**
 * Authentication status interface
 */
interface AuthStatus {
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Custom hook to validate stored authentication token
 * Calls GET /api/v1/auth/validate to check if the current token is valid
 * 
 * @returns {AuthStatus} Object containing authentication status and loading state
 * 
 * Usage:
 * ```tsx
 * const { isAuthenticated, isLoading } = useAuthStatus();
 * 
 * if (isLoading) {
 *   return <div>Loading...</div>;
 * }
 * 
 * if (!isAuthenticated) {
 *   return <LoginForm />;
 * }
 * 
 * return <AuthenticatedContent />;
 * ```
 */
export const useAuthStatus = (): AuthStatus => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const validateAuthStatus = async () => {
      try {
        // Check if token exists in storage
        const token = getToken();
        
        if (!token) {
          // No token found, user is not authenticated
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Token exists, validate it with the backend
        const validationResult = await validateToken();
        
        if (validationResult.valid) {
          // Token is valid
          setIsAuthenticated(true);
        } else {
          // Token is invalid
          setIsAuthenticated(false);
        }
        
      } catch (error) {
        // Validation failed (network error, invalid token, etc.)
        console.warn('Token validation failed:', error);
        setIsAuthenticated(false);
      } finally {
        // Always set loading to false when validation is complete
        setIsLoading(false);
      }
    };

    // Run validation on mount and when dependencies change
    validateAuthStatus();
  }, []); // Empty dependency array - only run on mount

  return {
    isAuthenticated,
    isLoading,
  };
};

export default useAuthStatus;