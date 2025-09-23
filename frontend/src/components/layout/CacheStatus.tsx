import React, { useState, useEffect } from 'react';
import { checkCacheHealth, CacheHealthResult, startPeriodicCacheHealthCheck } from '../../api/health/cacheHealthCheck';

interface CacheStatusProps {
  /** Whether to show detailed cache information */
  detailed?: boolean;
  /** Whether to automatically refresh cache status */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds (default: 30000ms = 30s) */
  refreshInterval?: number;
  /** Custom CSS classes */
  className?: string;
  /** Whether to show as a compact inline status */
  compact?: boolean;
}

/**
 * CacheStatus component for displaying Redis cache connection status
 * Can be used in status bars, debugging panels, or anywhere cache monitoring is needed
 */
const CacheStatus: React.FC<CacheStatusProps> = ({
  detailed = false,
  autoRefresh = false,
  refreshInterval = 30000,
  className = '',
  compact = false
}) => {
  const [cacheResult, setCacheResult] = useState<CacheHealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const performCacheCheck = async () => {
    setLoading(true);
    try {
      const result = await checkCacheHealth();
      setCacheResult(result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Cache health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial cache health check
    performCacheCheck();

    // Set up periodic cache health checks if autoRefresh is enabled
    if (autoRefresh) {
      const stopPeriodicCheck = startPeriodicCacheHealthCheck(refreshInterval, (result) => {
        setCacheResult(result);
        setLastChecked(new Date());
      });

      return stopPeriodicCheck;
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusIcon = () => {
    if (loading) return '⏳';
    return cacheResult?.isConnected ? '🟢' : '🔴';
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    return cacheResult?.isConnected ? 'Cache Connected' : 'Cache Disconnected';
  };

  const getStatusColor = () => {
    if (loading) return 'text-yellow-600';
    return cacheResult?.isConnected ? 'text-green-600' : 'text-red-600';
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 text-sm ${className}`}>
        <span className={getStatusColor()}>{getStatusIcon()}</span>
        <span className={`${getStatusColor()} font-medium`}>
          {getStatusText()}
        </span>
        {cacheResult && (
          <span className="text-gray-500 text-xs">
            ({cacheResult.responseTime}ms)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>{getStatusIcon()}</span>
          Redis Cache Status
        </h3>
        <button
          onClick={performCacheCheck}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Connection:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {cacheResult && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Response Time:</span>
              <span className="font-mono text-sm">{cacheResult.responseTime}ms</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Checked:</span>
              <span className="text-sm">
                {lastChecked?.toLocaleTimeString() || 'Never'}
              </span>
            </div>

            {cacheResult.error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <span className="text-red-800 text-sm font-medium">Error:</span>
                <p className="text-red-700 text-sm mt-1">{cacheResult.error}</p>
              </div>
            )}

            {detailed && cacheResult.response && (
              <div className="mt-4 border-t pt-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Cache Details</h4>
                <div className="space-y-1 text-sm">
                  {cacheResult.response.cacheType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-mono">{cacheResult.response.cacheType}</span>
                    </div>
                  )}
                  
                  {cacheResult.response.version && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version:</span>
                      <span className="font-mono">{cacheResult.response.version}</span>
                    </div>
                  )}
                  
                  {cacheResult.response.memory && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Memory Usage:</span>
                        <span>{cacheResult.response.memory.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            cacheResult.response.memory.percentage > 80 
                              ? 'bg-red-500' 
                              : cacheResult.response.memory.percentage > 60 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${cacheResult.response.memory.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Used: {(cacheResult.response.memory.used / 1024 / 1024).toFixed(1)}MB</span>
                        <span>Total: {(cacheResult.response.memory.total / 1024 / 1024).toFixed(1)}MB</span>
                      </div>
                    </div>
                  )}
                  
                  {cacheResult.response.connections && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Connections:</span>
                      <span>{cacheResult.response.connections.active}/{cacheResult.response.connections.total}</span>
                    </div>
                  )}
                  
                  {cacheResult.response.stats && (
                    <div className="mt-2">
                      <span className="text-gray-600 block mb-1">Cache Statistics:</span>
                      <div className="pl-2 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Hit Rate:</span>
                          <span className={`font-medium ${
                            cacheResult.response.stats.hitRate > 0.8 
                              ? 'text-green-600' 
                              : cacheResult.response.stats.hitRate > 0.5 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                          }`}>
                            {(cacheResult.response.stats.hitRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hits:</span>
                          <span>{cacheResult.response.stats.hits.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Misses:</span>
                          <span>{cacheResult.response.stats.misses.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {autoRefresh && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              cacheResult?.isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            Auto-refreshing every {Math.floor(refreshInterval / 1000)}s
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheStatus;