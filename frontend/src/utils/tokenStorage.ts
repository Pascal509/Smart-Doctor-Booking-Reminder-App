// Secure token storage utility using sessionStorage
// sessionStorage is more secure than localStorage as it's cleared when the tab is closed

const TOKEN_KEY = 'smart_doctor_auth_token';
const USER_KEY = 'smart_doctor_auth_user';

/**
 * Securely store the JWT token in sessionStorage
 * @param token - JWT token string
 */
export const storeToken = (token: string): void => {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store token:', error);
    throw new Error('Unable to store authentication token');
  }
};

/**
 * Retrieve the JWT token from sessionStorage
 * @returns JWT token string or null if not found
 */
export const getToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to retrieve token:', error);
    return null;
  }
};

/**
 * Store user information in sessionStorage
 * @param user - User object to store
 */
export const storeUser = (user: any): void => {
  try {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store user data:', error);
    throw new Error('Unable to store user information');
  }
};

/**
 * Retrieve user information from sessionStorage
 * @returns User object or null if not found
 */
export const getUser = (): any | null => {
  try {
    const userData = sessionStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to retrieve user data:', error);
    return null;
  }
};

/**
 * Remove the JWT token from sessionStorage
 */
export const removeToken = (): void => {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
};

/**
 * Remove user information from sessionStorage
 */
export const removeUser = (): void => {
  try {
    sessionStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to remove user data:', error);
  }
};

/**
 * Clear all authentication data from sessionStorage
 */
export const clearAuthData = (): void => {
  removeToken();
  removeUser();
};

/**
 * Check if a valid token exists in storage
 * @returns boolean indicating if token exists
 */
export const hasValidToken = (): boolean => {
  const token = getToken();
  return token !== null && token.length > 0;
};

/**
 * Get the Authorization header value for API requests
 * @returns Authorization header string or null
 */
export const getAuthHeader = (): string | null => {
  const token = getToken();
  return token ? `Bearer ${token}` : null;
};