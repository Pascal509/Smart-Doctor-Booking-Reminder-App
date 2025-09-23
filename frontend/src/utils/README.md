# Health Check Utilities

This directory contains TypeScript utilities for monitoring the health of the backend API.

## Files

### `healthCheck.ts`
Core utility functions for checking API health status.

#### Functions

##### `checkHealth(): Promise<HealthCheckResult>`
Performs a single health check against the `/health` endpoint.

```typescript
import { checkHealth } from '../utils/healthCheck';

const result = await checkHealth();
if (result.isHealthy) {
  console.log('API is healthy:', result.response);
} else {
  console.error('API health check failed:', result.error);
}
```

##### `startPeriodicHealthCheck(intervalMs, onHealthChange): () => void`
Starts periodic health monitoring with callback on status changes.

```typescript
import { startPeriodicHealthCheck } from '../utils/healthCheck';

const stopMonitoring = startPeriodicHealthCheck(30000, (result) => {
  console.log('Health status changed:', result.isHealthy);
});

// Stop monitoring when needed
stopMonitoring();
```

##### `formatHealthStatus(result): string`
Formats health check results for display purposes.

```typescript
import { checkHealth, formatHealthStatus } from '../utils/healthCheck';

const result = await checkHealth();
const formatted = formatHealthStatus(result);
console.log(formatted); // "✅ Healthy | Response: 45ms | 2:30:15 PM"
```

#### Interfaces

##### `HealthCheckResponse`
Expected response structure from the `/health` endpoint:

```typescript
interface HealthCheckResponse {
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
```

##### `HealthCheckResult`
Result object returned by health check functions:

```typescript
interface HealthCheckResult {
  isHealthy: boolean;
  response?: HealthCheckResponse;
  error?: string;
  responseTime: number;
  timestamp: Date;
}
```

## Components

### `HealthStatus.tsx`
React component for displaying API health status.

#### Props

- `detailed?: boolean` - Show detailed health information
- `autoRefresh?: boolean` - Automatically refresh health status
- `refreshInterval?: number` - Refresh interval in milliseconds (default: 30000)
- `className?: string` - Custom CSS classes
- `compact?: boolean` - Show as compact inline status

#### Usage Examples

##### Compact Footer Display
```tsx
<HealthStatus compact={true} autoRefresh={true} refreshInterval={60000} />
```

##### Detailed Debug Panel
```tsx
<HealthStatus 
  detailed={true} 
  autoRefresh={true} 
  refreshInterval={30000}
/>
```

### `DebugPanel.tsx`
Developer debug panel with health monitoring and testing capabilities.

#### Props

- `initiallyVisible?: boolean` - Whether panel is initially visible
- `className?: string` - Custom CSS classes

#### Features

- Toggle visibility with floating button
- Real-time health status monitoring
- Manual health check testing
- Test result logging with timestamps
- Environment and build information
- Console-style output display

#### Usage

```tsx
{/* Only show in development */}
{process.env.NODE_ENV === 'development' && (
  <DebugPanel initiallyVisible={false} />
)}
```

## Integration

### Footer Integration
The health status is automatically displayed in the application footer:

```tsx
// In App.tsx footer
<div className="flex items-center space-x-4 text-sm">
  <span className="text-gray-500">API Status:</span>
  <HealthStatus compact={true} autoRefresh={true} refreshInterval={60000} />
</div>
```

### Debug Panel Integration
The debug panel is available in development mode:

```tsx
// In App.tsx
{process.env.NODE_ENV === 'development' && (
  <DebugPanel initiallyVisible={false} />
)}
```

## API Endpoint Requirements

The health check utilities expect a `GET /health` endpoint that returns:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T14:30:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "responseTime": 15
  },
  "services": {
    "redis": "up",
    "email": "up"
  }
}
```

### Minimum Required Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

## Error Handling

The utilities handle various error scenarios:

- **Network errors**: No response from server
- **HTTP errors**: Server returns error status codes
- **Timeout errors**: Request takes too long
- **Invalid responses**: Malformed JSON or missing required fields

All errors are captured and returned in the `HealthCheckResult.error` field.

## Development Tips

1. **Use the debug panel** during development to monitor API health in real-time
2. **Check the footer** for quick health status without opening dev tools
3. **Customize refresh intervals** based on your needs (shorter for active development)
4. **Monitor response times** to identify performance issues
5. **Use periodic monitoring** for long-running development sessions

## Production Considerations

- The debug panel is automatically hidden in production builds
- Footer health status can be disabled by removing the component
- Consider longer refresh intervals in production to reduce API load
- Health check failures should be logged for monitoring purposes