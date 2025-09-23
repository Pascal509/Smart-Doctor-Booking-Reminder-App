import React, { useState } from 'react';
import HealthStatus from './HealthStatus';
import CacheStatus from './CacheStatus';
import { checkHealth, formatHealthStatus } from '../../api/health/healthCheck';
import { checkCacheHealth, formatCacheStatus } from '../../api/health/cacheHealthCheck';

interface DebugPanelProps {
  /** Whether the debug panel is initially visible */
  initiallyVisible?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * DebugPanel component for developers to monitor API health and test functionality
 * Can be toggled on/off and provides detailed health information
 */
const DebugPanel: React.FC<DebugPanelProps> = ({
  initiallyVisible = false,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(initiallyVisible);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const runHealthTest = async () => {
    setTesting(true);
    const results: string[] = [];
    
    try {
      results.push(`[${new Date().toLocaleTimeString()}] Starting comprehensive health check...`);
      
      // API Health Check
      results.push(`[${new Date().toLocaleTimeString()}] Testing API health...`);
      const healthResult = await checkHealth();
      const formattedStatus = formatHealthStatus(healthResult);
      results.push(`[${new Date().toLocaleTimeString()}] API: ${formattedStatus}`);
      
      // Cache Health Check
      results.push(`[${new Date().toLocaleTimeString()}] Testing cache health...`);
      const cacheResult = await checkCacheHealth();
      const formattedCacheStatus = formatCacheStatus(cacheResult);
      results.push(`[${new Date().toLocaleTimeString()}] Cache: ${formattedCacheStatus}`);
      
      // Summary
      const apiStatus = healthResult.isHealthy ? '✅' : '❌';
      const cacheStatus = cacheResult.isConnected ? '✅' : '❌';
      results.push(`[${new Date().toLocaleTimeString()}] Summary: API ${apiStatus} | Cache ${cacheStatus}`);
      
      if (healthResult.isHealthy && cacheResult.isConnected) {
        results.push(`[${new Date().toLocaleTimeString()}] 🎉 All systems operational`);
      } else {
        const issues = [];
        if (!healthResult.isHealthy) issues.push(`API: ${healthResult.error}`);
        if (!cacheResult.isConnected) issues.push(`Cache: ${cacheResult.error}`);
        results.push(`[${new Date().toLocaleTimeString()}] ⚠️ Issues detected: ${issues.join(', ')}`);
      }
    } catch (error) {
      results.push(`[${new Date().toLocaleTimeString()}] 💥 Test error: ${error}`);
    }
    
    setTestResults(prev => [...results, ...prev]);
    setTesting(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={toggleVisibility}
        className="mb-2 px-3 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-sm font-medium"
        title="Toggle Debug Panel"
      >
        {isVisible ? '🔧 Hide Debug' : '🔧 Debug'}
      </button>

      {/* Debug Panel */}
      {isVisible && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-sm">🔧 Developer Debug Panel</h3>
            <button
              onClick={toggleVisibility}
              className="text-gray-300 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* API Health Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">API Health Status</h4>
              <HealthStatus 
                detailed={false} 
                autoRefresh={true} 
                refreshInterval={30000}
                className="text-xs"
              />
            </div>

            {/* Cache Status */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Redis Cache Status</h4>
              <CacheStatus 
                detailed={false} 
                autoRefresh={true} 
                refreshInterval={30000}
                className="text-xs"
              />
            </div>

            {/* Test Controls */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">System Health Test</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={runHealthTest}
                    disabled={testing}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {testing ? 'Testing...' : 'Run Test'}
                  </button>
                  <button
                    onClick={clearResults}
                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Test Results */}
              <div className="bg-gray-900 text-green-400 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
                {testResults.length === 0 ? (
                  <div className="text-gray-500">No test results yet. Click "Run Test" to start.</div>
                ) : (
                  testResults.map((result, index) => (
                    <div key={index} className="mb-1 whitespace-pre-wrap break-words">
                      {result}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="border-t pt-4 text-xs text-gray-600">
              <div className="space-y-1">
                <div>Environment: {process.env.NODE_ENV}</div>
                <div>Build: {process.env.REACT_APP_VERSION || 'dev'}</div>
                <div>Timestamp: {new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;