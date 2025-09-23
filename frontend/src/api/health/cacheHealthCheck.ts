import apiClient from '../clients/apiClient';

/**
 * Cache health check response interface
 */
export interface CacheHealthResponse {
  status: 'connected' | 'disconnected';
  timestamp: string;
  responseTime?: number;
  cacheType?: string;
  version?: string;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  connections?: {
    active: number;
    total: number;
  };
  stats?: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

/**
 * Cache health check result with additional metadata
 */
export interface CacheHealthResult {
  isConnected: boolean;
  response?: CacheHealthResponse;
  error?: string;
  responseTime: number;
  timestamp: Date;
}

/**
 * Utility function to check the health of the Redis cache
 * Calls GET /api/v1/cache/health endpoint and returns cache status information
 * 
 * @returns Promise<CacheHealthResult> - Cache health check result with status and metadata
 * 
 * @example
 * ```typescript
 * const cacheResult = await checkCacheHealth();
 * if (cacheResult.isConnected) {
 *   console.log('Cache is connected:', cacheResult.response);
 * } else {
 *   console.error('Cache health check failed:', cacheResult.error);
 * }
 * ```
 */
export const checkCacheHealth = async (): Promise<CacheHealthResult> => {
  const startTime = Date.now();
  const timestamp = new Date();

  try {
    const response = await apiClient.get<CacheHealthResponse>('/api/v1/cache/health');
    const responseTime = Date.now() - startTime;

    return {
      isConnected: response.status === 'connected',
      response,
      responseTime,
      timestamp
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Extract meaningful error message
    let errorMessage = 'Cache health check failed';
    
    if (error.response) {
      // Server responded with error status
      errorMessage = `Cache API returned ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'No response from cache health endpoint';
    } else {
      // Something else happened
      errorMessage = error.message || 'Unknown cache health check error';
    }

    return {
      isConnected: false,
      error: errorMessage,
      responseTime,
      timestamp
    };
  }
};

/**
 * Utility function to perform periodic cache health checks
 * Useful for continuous monitoring of cache status
 * 
 * @param intervalMs - Interval in milliseconds between health checks (default: 30000ms = 30s)
 * @param onStatusChange - Callback function called when cache status changes
 * @returns Function to stop the periodic health checks
 * 
 * @example
 * ```typescript
 * const stopCacheCheck = startPeriodicCacheHealthCheck(15000, (result) => {
 *   console.log('Cache status:', result.isConnected ? 'Connected' : 'Disconnected');
 * });
 * 
 * // Stop monitoring after some time
 * setTimeout(() => stopCacheCheck(), 60000);
 * ```
 */
export const startPeriodicCacheHealthCheck = (
  intervalMs: number = 30000,
  onStatusChange?: (result: CacheHealthResult) => void
): (() => void) => {
  let lastConnectionStatus: boolean | null = null;
  
  const performCheck = async () => {
    try {
      const result = await checkCacheHealth();
      
      // Call callback if connection status changed or if it's the first check
      if (onStatusChange && (lastConnectionStatus === null || lastConnectionStatus !== result.isConnected)) {
        onStatusChange(result);
      }
      
      lastConnectionStatus = result.isConnected;
    } catch (error) {
      console.error('Periodic cache health check error:', error);
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
 * Format cache health check result for display purposes
 * Useful for status displays or debugging panels
 * 
 * @param result - Cache health check result to format
 * @returns Formatted string representation of the cache status
 */
export const formatCacheStatus = (result: CacheHealthResult): string => {
  const status = result.isConnected ? '🟢 Connected' : '🔴 Disconnected';
  const responseTime = `${result.responseTime}ms`;
  const timestamp = result.timestamp.toLocaleTimeString();
  
  if (result.isConnected && result.response) {
    const memory = result.response.memory ? ` | Memory: ${result.response.memory.percentage}%` : '';
    const hitRate = result.response.stats ? ` | Hit Rate: ${(result.response.stats.hitRate * 100).toFixed(1)}%` : '';
    return `${status} | Response: ${responseTime} | ${timestamp}${memory}${hitRate}`;
  } else {
    return `${status} | Response: ${responseTime} | ${timestamp} | Error: ${result.error}`;
  }
};