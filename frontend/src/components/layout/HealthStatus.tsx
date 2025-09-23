import React, { useState, useEffect, useCallback } from 'react';
import { checkHealth, HealthCheckResult, startPeriodicHealthCheck } from '../../api/health/healthCheck';

interface HealthStatusProps {
  /** Whether to show detailed health information */
  detailed?: boolean;
  /** Whether to automatically refresh health status */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds (default: 30000ms = 30s) */
  refreshInterval?: number;
  /** Custom CSS classes */
  className?: string;
  /** Whether to show as a compact inline status */
  compact?: boolean;
}

/**
 * HealthStatus component for displaying API health status
 * Can be used in footer, debugging panels, or anywhere health monitoring is needed
 */
const HealthStatus: React.FC<HealthStatusProps> = ({
  detailed = false,
  autoRefresh = false,
  refreshInterval = 30000,
  className = '',
  compact = false
}) => {
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const performHealthCheck = useCallback(async () => {
    setLoading(true);
    try {
      const result = await checkHealth();
      setHealthResult(result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial health check
    performHealthCheck();

    // Set up periodic health checks if autoRefresh is enabled
    if (autoRefresh) {
      const stopPeriodicCheck = startPeriodicHealthCheck(refreshInterval, (result) => {
        setHealthResult(result);
        setLastChecked(new Date());
      });

      return stopPeriodicCheck;
    }
  }, [autoRefresh, refreshInterval, performHealthCheck]);

  const getStatusIcon = () => {
    if (loading) return '⏳';
    return healthResult?.isHealthy ? '✅' : '❌';
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    return healthResult?.isHealthy ? 'API Healthy' : 'API Unhealthy';
  };

  const getStatusColor = () => {
    if (loading) return 'text-yellow-600';
    return healthResult?.isHealthy ? 'text-green-600' : 'text-red-600';
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 text-sm ${className}`}>
        <span className={getStatusColor()}>{getStatusIcon()}</span>
        <span className={`${getStatusColor()} font-medium`}>
          {getStatusText()}
        </span>
        {healthResult && (
          <span className="text-gray-500 text-xs">
            ({healthResult.responseTime}ms)
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
          API Health Status
        </h3>
        <button
          onClick={performHealthCheck}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {healthResult && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Response Time:</span>
              <span className="font-mono text-sm">{healthResult.responseTime}ms</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Checked:</span>
              <span className="text-sm">
                {lastChecked?.toLocaleTimeString() || 'Never'}
              </span>
            </div>

            {healthResult.error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <span className="text-red-800 text-sm font-medium">Error:</span>
                <p className="text-red-700 text-sm mt-1">{healthResult.error}</p>
              </div>
            )}

            {detailed && healthResult.response && (
              <div className="mt-4 border-t pt-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Detailed Information</h4>
                <div className="space-y-1 text-sm">
                  {healthResult.response.uptime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span>{Math.floor(healthResult.response.uptime / 3600)}h {Math.floor((healthResult.response.uptime % 3600) / 60)}m</span>
                    </div>
                  )}
                  
                  {healthResult.response.version && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version:</span>
                      <span className="font-mono">{healthResult.response.version}</span>
                    </div>
                  )}
                  
                  {healthResult.response.database && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Database:</span>
                      <span className={healthResult.response.database.status === 'connected' ? 'text-green-600' : 'text-red-600'}>
                        {healthResult.response.database.status}
                        {healthResult.response.database.responseTime && ` (${healthResult.response.database.responseTime}ms)`}
                      </span>
                    </div>
                  )}
                  
                  {healthResult.response.services && Object.keys(healthResult.response.services).length > 0 && (
                    <div className="mt-2">
                      <span className="text-gray-600 block mb-1">Services:</span>
                      <div className="pl-2 space-y-1">
                        {Object.entries(healthResult.response.services).map(([service, status]) => (
                          <div key={service} className="flex justify-between text-xs">
                            <span>{service}:</span>
                            <span className={status === 'up' ? 'text-green-600' : 'text-red-600'}>
                              {status}
                            </span>
                          </div>
                        ))}
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
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            Auto-refreshing every {Math.floor(refreshInterval / 1000)}s
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthStatus;