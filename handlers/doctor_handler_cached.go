// Package handlers provides HTTP request handlers with enhanced caching mechanisms.
//
// CACHING STRATEGY:
// This implementation uses a granular, key-based caching approach to maximize cache hit rates
// while ensuring data consistency. The strategy includes:
//
// 1. INDIVIDUAL DOCTOR CACHING:
//    - Key pattern: "doctor:{id}" (e.g., "doctor:123")
//    - Used for single doctor lookups
//    - Invalidated only when that specific doctor is modified or deleted
//
// 2. SPECIALTY LIST CACHING:
//    - Key pattern: "doctors:specialty:{id}" (e.g., "doctors:specialty:5")
//    - Contains lists of doctors filtered by specialty
//    - Invalidated when doctors in that specialty are created, updated, or deleted
//
// 3. GENERAL LIST CACHING:
//    - Key pattern: "doctors:all"
//    - Contains the complete list of doctors
//    - Invalidated when any doctor is created, updated, or deleted
//
// CACHE INVALIDATION LOGIC:
// - CreateDoctor: Immediately caches new doctor + invalidates specialty/general lists
// - UpdateDoctor: Invalidates specific doctor + old/new specialty lists + re-caches doctor
// - DeleteDoctor: Invalidates specific doctor + specialty/general lists
// - GetDoctor: Uses individual doctor cache with fallback to database + cache population
//
// This approach prevents over-invalidation (e.g., removing hundreds of valid doctor records
// when only one is modified) while maintaining data consistency across all cache layers.
package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/sirupsen/logrus"

	"smart-doctor-booking-app/models"
	"smart-doctor-booking-app/repository"
	"smart-doctor-booking-app/services"
	"smart-doctor-booking-app/utils"
)

// UpdateDoctorRequest represents the request payload for updating a doctor
type UpdateDoctorRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	SpecialtyID uint   `json:"specialty_id" binding:"required,min=1"`
	IsActive    *bool  `json:"is_active" binding:"required"`
}

// CachedDoctorHandler handles HTTP requests for doctor operations with caching support
type CachedDoctorHandler struct {
	doctorRepo   repository.DoctorRepository
	cacheService services.CacheService
	validator    *validator.Validate
	logger       *logrus.Logger
}

// NewDoctorHandlerWithCache creates a new CachedDoctorHandler instance
func NewDoctorHandlerWithCache(doctorRepo repository.DoctorRepository, cacheService services.CacheService) *CachedDoctorHandler {
	return &CachedDoctorHandler{
		doctorRepo:   doctorRepo,
		cacheService: cacheService,
		validator:    validator.New(),
		logger:       logrus.New(),
	}
}

// CreateDoctor handles POST /doctors - creates a new doctor with cache invalidation
func (h *CachedDoctorHandler) CreateDoctor(c *gin.Context) {
	var req CreateDoctorRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request payload", "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request",
			Message: "Please check your request payload",
			Details: h.parseValidationErrors(err),
		})
		return
	}

	// Validate the request
	if err := h.validator.Struct(req); err != nil {
		h.logger.Error("Validation failed", "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation failed",
			Message: "Please check your input data",
			Details: h.parseValidationErrors(err),
		})
		return
	}

	// Sanitize input
	req.Name = utils.SanitizeString(req.Name)

	// Create doctor model
	doctor := &models.Doctor{
		Name:        req.Name,
		SpecialtyID: req.SpecialtyID,
		IsActive:    true,
	}

	// Create doctor in database
	if err := h.doctorRepo.CreateDoctor(doctor); err != nil {
		h.logger.Error("Failed to create doctor", "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Database error",
			Message: "Failed to create doctor",
		})
		return
	}

	ctx := c.Request.Context()

	// Immediately cache the newly created doctor using granular key pattern: doctor:{id}
	if err := h.cacheService.SetDoctor(ctx, doctor); err != nil {
		h.logger.Warn("Failed to cache newly created doctor", "doctorID", doctor.ID, "error", err)
	}

	// Invalidate only specialty-specific list cache, not individual doctor caches
	h.invalidateSpecialtyListCache(ctx, doctor.SpecialtyID)

	h.logger.Info("Doctor created successfully", "doctorID", doctor.ID, "name", doctor.Name)
	c.JSON(http.StatusCreated, SuccessResponse{
		Message: "Doctor created successfully",
		Data:    doctor,
	})
}

// UpdateDoctor handles PUT /doctors/:id - updates an existing doctor with cache invalidation
func (h *CachedDoctorHandler) UpdateDoctor(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid doctor ID", "id", idStr, "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid ID",
			Message: "Doctor ID must be a valid number",
		})
		return
	}

	doctorID := uint(id)
	var req UpdateDoctorRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request payload", "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request",
			Message: "Please check your request payload",
			Details: h.parseValidationErrors(err),
		})
		return
	}

	// Validate the request
	if err := h.validator.Struct(req); err != nil {
		h.logger.Error("Validation failed", "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation failed",
			Message: "Please check your input data",
			Details: h.parseValidationErrors(err),
		})
		return
	}

	// Get existing doctor to check specialty change
	existingDoctor, err := h.doctorRepo.GetDoctorByID(doctorID)
	if err != nil {
		h.logger.Error("Failed to retrieve existing doctor", "doctorID", doctorID, "error", err)
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "Doctor not found",
			Message: "The requested doctor does not exist",
		})
		return
	}

	// Sanitize input
	req.Name = utils.SanitizeString(req.Name)

	// Update doctor model
	updatedDoctor := &models.Doctor{
		ID:          doctorID,
		Name:        req.Name,
		SpecialtyID: req.SpecialtyID,
		IsActive:    *req.IsActive,
	}

	// Update doctor in database
	if err := h.doctorRepo.UpdateDoctor(updatedDoctor); err != nil {
		h.logger.Error("Failed to update doctor", "doctorID", doctorID, "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Database error",
			Message: "Failed to update doctor",
		})
		return
	}

	ctx := c.Request.Context()

	// Invalidate the specific doctor cache using granular key pattern: doctor:{id}
	h.invalidateDoctorCache(ctx, doctorID)

	// Invalidate specialty list caches for both old and new specialties (if changed)
	h.invalidateSpecialtyListCache(ctx, existingDoctor.SpecialtyID)
	if existingDoctor.SpecialtyID != req.SpecialtyID {
		h.invalidateSpecialtyListCache(ctx, req.SpecialtyID)
	}

	// Cache the updated doctor immediately
	if err := h.cacheService.SetDoctor(ctx, updatedDoctor); err != nil {
		h.logger.Warn("Failed to cache updated doctor", "doctorID", doctorID, "error", err)
	}

	h.logger.Info("Doctor updated successfully", "doctorID", doctorID, "name", req.Name)
	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Doctor updated successfully",
		Data:    updatedDoctor,
	})
}

// DeleteDoctor handles DELETE /doctors/:id - deletes a doctor with cache invalidation
func (h *CachedDoctorHandler) DeleteDoctor(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid doctor ID", "id", idStr, "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid ID",
			Message: "Doctor ID must be a valid number",
		})
		return
	}

	doctorID := uint(id)

	// Get existing doctor to know which specialty cache to invalidate
	existingDoctor, err := h.doctorRepo.GetDoctorByID(doctorID)
	if err != nil {
		h.logger.Error("Failed to retrieve doctor for deletion", "doctorID", doctorID, "error", err)
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "Doctor not found",
			Message: "The requested doctor does not exist",
		})
		return
	}

	// Delete doctor from database
	if err := h.doctorRepo.DeleteDoctor(doctorID); err != nil {
		h.logger.Error("Failed to delete doctor", "doctorID", doctorID, "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Database error",
			Message: "Failed to delete doctor",
		})
		return
	}

	ctx := c.Request.Context()

	// Invalidate the specific doctor cache using granular key pattern: doctor:{id}
	h.invalidateDoctorCache(ctx, doctorID)

	// Invalidate specialty list cache
	h.invalidateSpecialtyListCache(ctx, existingDoctor.SpecialtyID)

	h.logger.Info("Doctor deleted successfully", "doctorID", doctorID)
	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Doctor deleted successfully",
		Data:    nil,
	})
}

// GetDoctor handles GET /doctors/:id - retrieves a doctor by ID with caching
func (h *CachedDoctorHandler) GetDoctor(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid doctor ID", "id", idStr, "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid ID",
			Message: "Doctor ID must be a valid number",
		})
		return
	}

	doctorID := uint(id)
	ctx := c.Request.Context()

	// Try to get from cache first
	cachedDoctor, err := h.cacheService.GetDoctor(ctx, doctorID)
	if err == nil {
		h.logger.Debug("Doctor retrieved from cache", "doctorID", doctorID)
		c.JSON(http.StatusOK, SuccessResponse{
			Message: "Doctor retrieved successfully",
			Data:    cachedDoctor,
		})
		return
	}

	// Cache miss, get from database
	doctor, err := h.doctorRepo.GetDoctorByID(doctorID)
	if err != nil {
		h.logger.Error("Failed to retrieve doctor", "doctorID", doctorID, "error", err)
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "Doctor not found",
			Message: "The requested doctor does not exist",
		})
		return
	}

	// Cache the doctor for future requests
	if err := h.cacheService.SetDoctor(ctx, doctor); err != nil {
		h.logger.Warn("Failed to cache doctor", "doctorID", doctorID, "error", err)
	}

	h.logger.Info("Doctor retrieved successfully", "doctorID", doctorID)
	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Doctor retrieved successfully",
		Data:    doctor,
	})
}

// GetAllDoctors handles GET /doctors - retrieves all doctors with caching and filtering
func (h *CachedDoctorHandler) GetAllDoctors(c *gin.Context) {
	// Parse query parameters
	specialtyIDStr := c.Query("specialty_id")
	isActiveStr := c.Query("is_active")
	limitStr := c.Query("limit")
	offsetStr := c.Query("offset")

	ctx := c.Request.Context()

	// Handle specialty-specific requests with caching
	if specialtyIDStr != "" {
		specialtyID, err := strconv.ParseUint(specialtyIDStr, 10, 32)
		if err != nil {
			h.logger.Error("Invalid specialty ID", "specialtyID", specialtyIDStr, "error", err)
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "Invalid specialty ID",
				Message: "Specialty ID must be a valid number",
			})
			return
		}

		// Try to get from cache first
		cachedDoctors, err := h.cacheService.GetDoctorsBySpecialty(ctx, uint(specialtyID))
		if err == nil {
			h.logger.Debug("Doctors by specialty retrieved from cache", "specialtyID", specialtyID)
			c.JSON(http.StatusOK, SuccessResponse{
				Message: "Doctors retrieved successfully",
				Data:    cachedDoctors,
			})
			return
		}
	}

	// Parse other filters
	var isActive *bool
	if isActiveStr != "" {
		parsedIsActive, err := strconv.ParseBool(isActiveStr)
		if err != nil {
			h.logger.Error("Invalid is_active parameter", "isActive", isActiveStr, "error", err)
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "Invalid is_active parameter",
				Message: "is_active must be true or false",
			})
			return
		}
		isActive = &parsedIsActive
	}

	var limit *int
	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err != nil || parsedLimit < 1 {
			h.logger.Error("Invalid limit parameter", "limit", limitStr, "error", err)
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "Invalid limit parameter",
				Message: "Limit must be a positive number",
			})
			return
		}
		limit = &parsedLimit
	}

	var offset *int
	if offsetStr != "" {
		parsedOffset, err := strconv.Atoi(offsetStr)
		if err != nil || parsedOffset < 0 {
			h.logger.Error("Invalid offset parameter", "offset", offsetStr, "error", err)
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "Invalid offset parameter",
				Message: "Offset must be a non-negative number",
			})
			return
		}
		offset = &parsedOffset
	}

	// Get doctors from database
	doctors, err := h.doctorRepo.GetAllDoctors()
	if err != nil {
		h.logger.Error("Failed to retrieve doctors", "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Database error",
			Message: "Failed to retrieve doctors",
		})
		return
	}

	// Cache specialty-specific results if only specialty filter is applied
	if specialtyIDStr != "" && isActive == nil && limit == nil && offset == nil {
		specialtyID, _ := strconv.ParseUint(specialtyIDStr, 10, 32)
		if err := h.cacheService.SetDoctorsBySpecialty(ctx, uint(specialtyID), doctors); err != nil {
			h.logger.Warn("Failed to cache doctors by specialty", "specialtyID", specialtyID, "error", err)
		}
	}

	h.logger.Info("Doctors retrieved successfully", "count", len(doctors))
	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Doctors retrieved successfully",
		Data:    doctors,
	})
}

// GetDoctorsBySpecialty handles GET /doctors/specialty/:id - retrieves doctors by specialty with caching
func (h *CachedDoctorHandler) GetDoctorsBySpecialty(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid specialty ID", "id", idStr, "error", err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid ID",
			Message: "Specialty ID must be a valid number",
		})
		return
	}

	specialtyID := uint(id)
	ctx := c.Request.Context()

	// Try to get from cache first
	cachedDoctors, err := h.cacheService.GetDoctorsBySpecialty(ctx, specialtyID)
	if err == nil {
		h.logger.Debug("Doctors by specialty retrieved from cache", "specialtyID", specialtyID)
		c.JSON(http.StatusOK, SuccessResponse{
			Message: "Doctors retrieved successfully",
			Data:    cachedDoctors,
		})
		return
	}

	// Cache miss, get from database
	doctors, err := h.doctorRepo.GetAllDoctors()
	if err != nil {
		h.logger.Error("Failed to retrieve doctors by specialty", "specialtyID", specialtyID, "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Database error",
			Message: "Failed to retrieve doctors",
		})
		return
	}

	// Cache the results for future requests
	if err := h.cacheService.SetDoctorsBySpecialty(ctx, specialtyID, doctors); err != nil {
		h.logger.Warn("Failed to cache doctors by specialty", "specialtyID", specialtyID, "error", err)
	}

	h.logger.Info("Doctors by specialty retrieved successfully", "specialtyID", specialtyID, "count", len(doctors))
	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Doctors retrieved successfully",
		Data:    doctors,
	})
}

// invalidateRelatedCaches invalidates caches related to doctor changes
// invalidateSpecialtyListCache invalidates only the specialty-specific list cache
// This is more granular than invalidating all doctor caches
func (h *CachedDoctorHandler) invalidateSpecialtyListCache(ctx context.Context, specialtyID uint) {
	// Invalidate specialty-based doctor list cache
	specialtyCacheKey := fmt.Sprintf("doctors:specialty:%d", specialtyID)
	if err := h.cacheService.Delete(ctx, specialtyCacheKey); err != nil {
		h.logger.Warn("Failed to invalidate specialty list cache", "specialtyID", specialtyID, "cacheKey", specialtyCacheKey, "error", err)
	}

	// Also invalidate the general doctors list cache
	generalCacheKey := "doctors:all"
	if err := h.cacheService.Delete(ctx, generalCacheKey); err != nil {
		h.logger.Warn("Failed to invalidate general doctors list cache", "cacheKey", generalCacheKey, "error", err)
	}

	h.logger.Debug("Successfully invalidated specialty list caches", "specialtyID", specialtyID)
}

// invalidateDoctorCache invalidates the cache for a specific doctor using granular key pattern
func (h *CachedDoctorHandler) invalidateDoctorCache(ctx context.Context, doctorID uint) {
	doctorCacheKey := fmt.Sprintf("doctor:%d", doctorID)
	if err := h.cacheService.Delete(ctx, doctorCacheKey); err != nil {
		h.logger.Warn("Failed to invalidate doctor cache", "doctorID", doctorID, "cacheKey", doctorCacheKey, "error", err)
	} else {
		h.logger.Debug("Successfully invalidated doctor cache", "doctorID", doctorID, "cacheKey", doctorCacheKey)
	}
}

// parseValidationErrors converts validation errors to a map
func (h *CachedDoctorHandler) parseValidationErrors(err error) map[string]interface{} {
	errors := make(map[string]interface{})

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			fieldName := strings.ToLower(fieldError.Field())
			switch fieldError.Tag() {
			case "required":
				errors[fieldName] = "This field is required"
			case "min":
				errors[fieldName] = "Value is too short or too small"
			case "max":
				errors[fieldName] = "Value is too long or too large"
			default:
				errors[fieldName] = "Invalid value"
			}
		}
	} else {
		errors["general"] = err.Error()
	}

	return errors
}

// ClearCache handles DELETE /doctors/cache - clears all doctor-related caches
func (h *CachedDoctorHandler) ClearCache(c *gin.Context) {
	ctx := c.Request.Context()

	// This would require implementing a pattern-based cache clearing
	// For now, we'll flush the entire cache (not recommended for production)
	if err := h.cacheService.Flush(ctx); err != nil {
		h.logger.Error("Failed to clear cache", "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Cache error",
			Message: "Failed to clear cache",
		})
		return
	}

	h.logger.Info("Doctor cache cleared successfully")
	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Cache cleared successfully",
		Data:    nil,
	})
}