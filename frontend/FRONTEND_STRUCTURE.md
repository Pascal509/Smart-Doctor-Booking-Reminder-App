# Frontend Project Structure

This document outlines the reorganized frontend project structure for the Smart Doctor Booking Reminder App.

## Directory Structure

```
src/
├── api/                    # API layer
│   ├── clients/           # API client modules
│   │   ├── apiClient.ts   # Base API client
│   │   ├── authApi.ts     # Authentication API
│   │   ├── doctorApi.ts   # Doctor management API
│   │   ├── appointmentApi.ts # Appointment API
│   │   └── specialtyApi.ts   # Specialty API
│   ├── health/            # Health check utilities
│   │   ├── healthCheck.ts # System health monitoring
│   │   └── cacheHealthCheck.ts # Cache health monitoring
│   └── types/             # API type definitions
│       ├── api.ts         # Main API types
│       └── auth.ts        # Authentication types
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   │   ├── DoctorCard.tsx
│   │   ├── TimeSlotPicker.tsx
│   │   ├── LoginForm.tsx
│   │   └── LogoutButton.tsx
│   ├── features/         # Feature-specific components
│   │   ├── AppointmentScheduler.tsx
│   │   ├── AppointmentList.tsx
│   │   ├── AppointmentHistory.tsx
│   │   ├── BookingFlow.tsx
│   │   ├── DoctorsList.tsx
│   │   ├── DoctorProfile.tsx
│   │   ├── NewDoctorForm.tsx
│   │   └── SymptomSearchForm.tsx
│   ├── layout/           # Layout and system components
│   │   ├── HealthStatus.tsx
│   │   ├── CacheStatus.tsx
│   │   └── DebugPanel.tsx
│   └── TimeSlotPickerDemo.tsx # Demo component (root level)
├── contexts/             # React contexts
│   └── AuthContext.tsx
├── hooks/               # Custom React hooks
│   ├── useAuthStatus.ts
│   ├── useDoctorAvailability.ts
│   ├── useDoctors.ts
│   ├── useDoctorList.ts
│   ├── useDoctor.ts
│   └── usePatientAppointments.ts
├── services/            # Legacy service layer (to be deprecated)
├── types/              # Legacy type definitions (to be deprecated)
└── utils/              # Utility functions
    ├── tokenStorage.ts
    └── other utilities...
```

## Organization Principles

### API Layer (`/api`)
- **clients/**: Contains all API client modules that handle HTTP requests
- **health/**: Health monitoring utilities moved from utils
- **types/**: Centralized type definitions for API responses and requests

### Components (`/components`)
- **ui/**: Reusable, generic UI components that can be used across features
- **features/**: Business logic components specific to application features
- **layout/**: Components related to page layout, system status, and debugging

### Benefits of This Structure

1. **Clear Separation of Concerns**: API logic, UI components, and business logic are clearly separated
2. **Improved Maintainability**: Related files are grouped together
3. **Better Scalability**: Easy to add new features without cluttering directories
4. **Enhanced Developer Experience**: Intuitive file organization makes navigation easier
5. **Type Safety**: Centralized type definitions reduce duplication

### Migration Notes

- All import statements have been updated to reflect the new structure
- Legacy `/services` and `/types` directories are maintained for backward compatibility
- Health check utilities moved from `/utils` to `/api/health`
- API clients consolidated in `/api/clients`

### Import Patterns

```typescript
// API imports
import { Doctor } from '../api/types/api';
import { getDoctorById } from '../api/clients/doctorApi';

// Component imports
import { DoctorCard } from '../ui/DoctorCard';           // UI component
import { BookingFlow } from '../features/BookingFlow';   // Feature component
import { HealthStatus } from '../layout/HealthStatus';   // Layout component

// Hook imports
import { useDoctors } from '../hooks/useDoctors';

// Context imports
import { useAuth } from '../contexts/AuthContext';
```

This structure provides a solid foundation for future development and makes the codebase more maintainable and scalable.