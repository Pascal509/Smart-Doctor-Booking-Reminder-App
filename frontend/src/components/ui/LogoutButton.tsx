import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { logoutUser } from '../../api/clients/authApi';

interface LogoutButtonProps {
  variant?: 'primary' | 'secondary' | 'standalone';
  onLogoutComplete?: () => void;
}

/**
 * LogoutButton component that demonstrates both AuthContext and standalone logout usage
 * 
 * @param variant - Button styling variant
 * @param onLogoutComplete - Callback function called after successful logout
 */
export const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  variant = 'primary', 
  onLogoutComplete 
}) => {
  const { logout: contextLogout, authState } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string>('');

  // Handle logout using AuthContext (recommended approach)
  const handleContextLogout = async () => {
    setIsLoggingOut(true);
    setError('');

    try {
      await contextLogout();
      onLogoutComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle logout using standalone logoutUser function
  const handleStandaloneLogout = async () => {
    setIsLoggingOut(true);
    setError('');

    try {
      await logoutUser();
      onLogoutComplete?.();
      // Note: When using standalone logout, you may need to manually refresh
      // the page or redirect to update the UI since AuthContext won't be updated
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Don't render if user is not authenticated
  if (!authState.isAuthenticated) {
    return null;
  }

  const getButtonStyles = () => {
    const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`;
      case 'secondary':
        return `${baseStyles} bg-gray-200 text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`;
      case 'standalone':
        return `${baseStyles} bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`;
      default:
        return baseStyles;
    }
  };

  return (
    <div className="space-y-2">
      {variant === 'standalone' ? (
        <button
          onClick={handleStandaloneLogout}
          disabled={isLoggingOut}
          className={getButtonStyles()}
          title="Logout using standalone logoutUser function"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout (Standalone)'}
        </button>
      ) : (
        <button
          onClick={handleContextLogout}
          disabled={isLoggingOut}
          className={getButtonStyles()}
          title="Logout using AuthContext"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      )}
      
      {error && (
        <div className="text-red-600 text-sm mt-1">
          {error}
        </div>
      )}
      
      {authState.user && (
        <div className="text-sm text-gray-600">
          Logged in as: {authState.user.username} ({authState.user.role})
        </div>
      )}
    </div>
  );
};

export default LogoutButton;