import apiClient from '../clients/apiClient';

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime?: number;
  version?: string;
  database?: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
  services?: {
    [key: string]: 'up' | 'down';
  };
}

/**
 * Health check result with additional metadata
 */
export interface HealthCheckResult {
  isHealthy: boolean;
  response?: HealthCheckResponse;
  error?: string;
  responseTime: number;
  timestamp: Date;
}

/**
 * Utility function to check the health of the backend API
 * Calls GET /health endpoint and returns health status information
 * 
 * @returns Promise<HealthCheckResult> - Health check result with status and metadata
 * 
 * @example
 * ```typescript
 * const healthResult = await checkHealth();
 * if (healthResult.isHealthy) {
 *   console.log('API is healthy:', healthResult.response);
 * } else {
 *   console.error('API health check failed:', healthResult.error);
 * }
 * ```
 */
export const checkHealth = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  const timestamp = new Date();

  try {
    const response = await apiClient.get<HealthCheckResponse>('/health');
    const responseTime = Date.now() - startTime;

    return {
      isHealthy: response.status === 'healthy',
      response,
      responseTime,
      timestamp
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Extract meaningful error message
    let errorMessage = 'Health check failed';
    
    if (error.response) {
      // Server responded with error status
      errorMessage = `API returned ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'No response from API server';
    } else {
      // Something else happened
      errorMessage = error.message || 'Unknown error occurred';
    }

    return {
      isHealthy: false,
      error: errorMessage,
      responseTime,
      timestamp
    };
  }
};

/**
 * Utility function to perform periodic health checks
 * Useful for continuous monitoring in development or debugging panels
 * 
 * @param intervalMs - Interval in milliseconds between health checks (default: 30000ms = 30s)
 * @param onHealthChange - Callback function called when health status changes
 * @returns Function to stop the periodic health checks
 * 
 * @example
 * ```typescript
 * const stopHealthCheck = startPeriodicHealthCheck(10000, (result) => {
 *   console.log('Health status:', result.isHealthy ? 'Healthy' : 'Unhealthy');
 * });
 * 
 * // Stop monitoring after some time
 * setTimeout(() => stopHealthCheck(), 60000);
 * ```
 */
export const startPeriodicHealthCheck = (
  intervalMs: number = 30000,
  onHealthChange?: (result: HealthCheckResult) => void
): (() => void) => {
  let lastHealthStatus: boolean | null = null;
  
  const performCheck = async () => {
    try {
      const result = await checkHealth();
      
      // Call callback if health status changed or if it's the first check
      if (onHealthChange && (lastHealthStatus === null || lastHealthStatus !== result.isHealthy)) {
        onHealthChange(result);
      }
      
      lastHealthStatus = result.isHealthy;
    } catch (error) {
      console.error('Periodic health check error:', error);
    }
  };

  // Perform initial check
  performCheck();
  
  // Set up interval
  const intervalId = setInterval(performCheck, intervalMs);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Format health check result for display purposes
 * Useful for debugging panels or status displays
 * 
 * @param result - Health check result to format
 * @returns Formatted string representation of the health status
 */
export const formatHealthStatus = (result: HealthCheckResult): string => {
  const status = result.isHealthy ? '✅ Healthy' : '❌ Unhealthy';
  const responseTime = `${result.responseTime}ms`;
  const timestamp = result.timestamp.toLocaleTimeString();
  
  if (result.isHealthy && result.response) {
    const uptime = result.response.uptime ? ` | Uptime: ${Math.floor(result.response.uptime / 3600)}h` : '';
    const version = result.response.version ? ` | v${result.response.version}` : '';
    return `${status} | Response: ${responseTime} | ${timestamp}${uptime}${version}`;
  } else {
    return `${status} | Response: ${responseTime} | ${timestamp} | Error: ${result.error}`;
  }
};