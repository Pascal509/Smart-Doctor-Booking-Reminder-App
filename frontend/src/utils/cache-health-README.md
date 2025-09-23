# Cache Health Check Utilities

This module provides TypeScript utilities for monitoring Redis cache connection status in the Smart Doctor Booking application.

## Files

### `cacheHealthCheck.ts`
Core utility functions for cache health monitoring.

### `../components/CacheStatus.tsx`
React component for displaying cache status.

## Functions

### `checkCacheHealth()`
Checks the Redis cache connection status via the `/api/v1/cache/health` endpoint.

**Returns:** `Promise<CacheHealthResult>`

```typescript
const result = await checkCacheHealth();
console.log(result.status); // 'connected' | 'disconnected' | 'error'
```

### `startPeriodicCacheCheck(callback, interval)`
Starts periodic cache health monitoring.

**Parameters:**
- `callback: (result: CacheHealthResult) => void` - Function called with each check result
- `interval: number` - Check interval in milliseconds (default: 30000)

**Returns:** `() => void` - Cleanup function to stop monitoring

```typescript
const stopMonitoring = startPeriodicCacheCheck(
  (result) => console.log('Cache status:', result.status),
  60000 // Check every minute
);

// Later, stop monitoring
stopMonitoring();
```

### `formatCacheStatus(result)`
Formats cache health result for display.

**Parameters:**
- `result: CacheHealthResult` - Health check result

**Returns:** `string` - Formatted status message

## Interfaces

### `CacheHealthResponse`
```typescript
interface CacheHealthResponse {
  status: 'connected' | 'disconnected';
  redis: {
    connected: boolean;
    host?: string;
    port?: number;
    database?: number;
  };
  timestamp: string;
  responseTime?: number;
}
```

### `CacheHealthResult`
```typescript
interface CacheHealthResult {
  status: 'connected' | 'disconnected' | 'error';
  data?: CacheHealthResponse;
  error?: string;
  timestamp: Date;
}
```

## Components

### `CacheStatus`
React component for displaying cache connection status.

**Props:**
- `detailed?: boolean` - Show detailed information (default: false)
- `autoRefresh?: boolean` - Enable automatic refresh (default: false)
- `refreshInterval?: number` - Refresh interval in ms (default: 30000)
- `compact?: boolean` - Use compact display mode (default: false)

**Usage:**
```tsx
// Compact status in footer
<CacheStatus compact={true} autoRefresh={true} refreshInterval={60000} />

// Detailed status in debug panel
<CacheStatus detailed={true} />
```

## Integration Examples

### Footer Integration
```tsx
import CacheStatus from './components/CacheStatus';

// In footer component
<div className="flex items-center space-x-2">
  <span className="text-gray-500">Cache:</span>
  <CacheStatus compact={true} autoRefresh={true} refreshInterval={60000} />
</div>
```

### Debug Panel Integration
```tsx
import { checkCacheHealth } from '../utils/cacheHealthCheck';

const runCacheTest = async () => {
  const result = await checkCacheHealth();
  console.log('Cache health:', result);
};
```

## API Endpoint Requirements

The cache health check expects a `GET /api/v1/cache/health` endpoint that returns:

```json
{
  "status": "connected",
  "redis": {
    "connected": true,
    "host": "localhost",
    "port": 6379,
    "database": 0
  },
  "timestamp": "2024-01-20T10:30:00.000Z",
  "responseTime": 15
}
```

## Error Handling

- Network errors return `status: 'error'` with error message
- Invalid responses are logged and return error status
- Component handles loading and error states gracefully
- Automatic retry on periodic checks

## Development vs Production

- **Development:** Full error details and debug information
- **Production:** Simplified error messages for security
- **Compact mode:** Minimal UI footprint for production footer
- **Detailed mode:** Full information for debugging

## Status Indicators

- 🟢 **Connected:** Redis cache is accessible and responding
- 🔴 **Disconnected:** Redis cache is not accessible
- ⚠️ **Error:** Network or API error occurred
- ⏳ **Loading:** Health check in progress

## Performance Considerations

- Uses `fetch` with timeout for reliability
- Debounced refresh to prevent excessive requests
- Cleanup functions prevent memory leaks
- Efficient re-rendering with React hooks