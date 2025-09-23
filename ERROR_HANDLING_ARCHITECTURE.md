# Error Handling Architecture Recommendations

## Overview
This document provides architectural recommendations for implementing centralized error handling in the Smart Doctor Booking Reminder App.

## Current State Analysis
The application currently has scattered error handling patterns with inconsistencies across different layers.

## Recommended Architecture

### 1. Centralized Error Types

```go
// errors/types.go
package errors

import (
    "fmt"
    "net/http"
)

// ErrorType represents different categories of errors
type ErrorType string

const (
    ValidationError   ErrorType = "VALIDATION_ERROR"
    DatabaseError     ErrorType = "DATABASE_ERROR"
    AuthenticationError ErrorType = "AUTHENTICATION_ERROR"
    AuthorizationError ErrorType = "AUTHORIZATION_ERROR"
    BusinessLogicError ErrorType = "BUSINESS_LOGIC_ERROR"
    ExternalServiceError ErrorType = "EXTERNAL_SERVICE_ERROR"
    InternalError     ErrorType = "INTERNAL_ERROR"
)

// AppError represents a structured application error
type AppError struct {
    Type        ErrorType `json:"type"`
    Code        string    `json:"code"`
    Message     string    `json:"message"`
    Details     string    `json:"details,omitempty"`
    HTTPStatus  int       `json:"-"`
    Cause       error     `json:"-"`
}

func (e *AppError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("%s: %s (caused by: %v)", e.Code, e.Message, e.Cause)
    }
    return fmt.Sprintf("%s: %s", e.Code, e.Message)
}
```

### 2. Error Factory Functions

```go
// errors/factory.go
package errors

func NewValidationError(code, message string, cause error) *AppError {
    return &AppError{
        Type:       ValidationError,
        Code:       code,
        Message:    message,
        HTTPStatus: http.StatusBadRequest,
        Cause:      cause,
    }
}

func NewDatabaseError(code, message string, cause error) *AppError {
    return &AppError{
        Type:       DatabaseError,
        Code:       code,
        Message:    message,
        HTTPStatus: http.StatusInternalServerError,
        Cause:      cause,
    }
}

func NewAuthenticationError(code, message string) *AppError {
    return &AppError{
        Type:       AuthenticationError,
        Code:       code,
        Message:    message,
        HTTPStatus: http.StatusUnauthorized,
    }
}

func NewBusinessLogicError(code, message string, cause error) *AppError {
    return &AppError{
        Type:       BusinessLogicError,
        Code:       code,
        Message:    message,
        HTTPStatus: http.StatusUnprocessableEntity,
        Cause:      cause,
    }
}
```

### 3. Centralized Error Handler Middleware

```go
// middleware/error_handler.go
package middleware

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "smart-doctor-booking-app/errors"
    "smart-doctor-booking-app/utils"
)

func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()

        // Handle any errors that occurred during request processing
        if len(c.Errors) > 0 {
            err := c.Errors.Last().Err
            
            var appErr *errors.AppError
            var ok bool
            
            if appErr, ok = err.(*errors.AppError); !ok {
                // Convert unknown errors to internal errors
                appErr = &errors.AppError{
                    Type:       errors.InternalError,
                    Code:       "INTERNAL_ERROR",
                    Message:    "An internal error occurred",
                    HTTPStatus: http.StatusInternalServerError,
                    Cause:      err,
                }
            }

            // Log the error
            utils.LogError(appErr.Cause, appErr.Message, map[string]interface{}{
                "error_type": appErr.Type,
                "error_code": appErr.Code,
                "path":       c.Request.URL.Path,
                "method":     c.Request.Method,
            })

            // Return appropriate HTTP response
            c.JSON(appErr.HTTPStatus, gin.H{
                "error": gin.H{
                    "type":    appErr.Type,
                    "code":    appErr.Code,
                    "message": appErr.Message,
                    "details": appErr.Details,
                },
            })
            
            c.Abort()
        }
    }
}
```

### 4. Repository Layer Error Handling

```go
// Example: repository/appointment_repository.go
func (r *appointmentRepository) GetAppointmentByID(id uint) (*models.Appointment, error) {
    var appointment models.Appointment
    
    if err := r.db.First(&appointment, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, errors.NewValidationError(
                "APPOINTMENT_NOT_FOUND",
                "Appointment not found",
                err,
            )
        }
        return nil, errors.NewDatabaseError(
            "APPOINTMENT_QUERY_FAILED",
            "Failed to retrieve appointment",
            err,
        )
    }
    
    return &appointment, nil
}
```

### 5. Service Layer Error Handling

```go
// Example: services/scheduling_service.go
func (s *schedulingService) BookAppointment(request *BookingRequest) (*models.Appointment, error) {
    // Validate request
    if err := s.validateBookingRequest(request); err != nil {
        return nil, err // Already an AppError
    }
    
    // Check availability
    available, err := s.appointmentRepo.CheckTimeSlotAvailability(
        request.DoctorID, request.StartTime, request.EndTime,
    )
    if err != nil {
        return nil, err // Repository returns AppError
    }
    
    if !available {
        return nil, errors.NewBusinessLogicError(
            "TIME_SLOT_UNAVAILABLE",
            "The requested time slot is not available",
            nil,
        )
    }
    
    // Continue with booking logic...
}
```

### 6. Handler Layer Error Handling

```go
// Example: handlers/appointment_handler.go
func (h *AppointmentHandler) BookAppointment(c *gin.Context) {
    var req BookingRequest
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.Error(errors.NewValidationError(
            "INVALID_REQUEST_PAYLOAD",
            "Invalid request payload",
            err,
        ))
        return
    }
    
    appointment, err := h.schedulingService.BookAppointment(&req)
    if err != nil {
        c.Error(err) // Service returns AppError
        return
    }
    
    c.JSON(http.StatusCreated, appointment)
}
```

## Implementation Plan

### Phase 1: Foundation
1. Create the `errors` package with types and factory functions
2. Implement centralized error handler middleware
3. Update main router to use error handler middleware

### Phase 2: Repository Layer
1. Update all repository methods to return structured errors
2. Replace panic usage with proper error returns
3. Add comprehensive error logging

### Phase 3: Service Layer
1. Update service methods to handle and propagate structured errors
2. Add business logic validation with appropriate error types
3. Implement proper error wrapping and context

### Phase 4: Handler Layer
1. Update all handlers to use the new error handling pattern
2. Remove duplicate error response structures
3. Ensure consistent error responses across all endpoints

### Phase 5: Testing and Monitoring
1. Add comprehensive error handling tests
2. Implement error metrics and monitoring
3. Add error rate alerting

## Benefits

1. **Consistency**: Uniform error handling across all layers
2. **Maintainability**: Centralized error logic reduces code duplication
3. **Debugging**: Structured errors with proper context and tracing
4. **API Consistency**: Standardized error response format
5. **Monitoring**: Better error tracking and alerting capabilities
6. **Security**: Controlled error information exposure

## Migration Strategy

1. Implement the error handling infrastructure
2. Gradually migrate existing code layer by layer
3. Maintain backward compatibility during transition
4. Add comprehensive tests for error scenarios
5. Monitor error rates and patterns post-migration

## Error Response Format

```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "code": "APPOINTMENT_NOT_FOUND",
    "message": "Appointment not found",
    "details": "No appointment exists with ID 123"
  }
}
```

This standardized format ensures consistent error handling across all API endpoints and improves client-side error handling capabilities.