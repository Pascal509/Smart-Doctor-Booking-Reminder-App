package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/sirupsen/logrus"

	"smart-doctor-booking-app/models"
	"smart-doctor-booking-app/repository"
	"smart-doctor-booking-app/utils"
)

// DoctorHandler handles HTTP requests for doctor operations
type DoctorHandler struct {
	doctorRepo repository.DoctorRepository
	validator  *validator.Validate
}

// NewDoctorHandler creates a new DoctorHandler instance
func NewDoctorHandler(doctorRepo repository.DoctorRepository) *DoctorHandler {
	return &DoctorHandler{
		doctorRepo: doctorRepo,
		validator:  validator.New(),
	}
}

// CreateDoctorRequest represents the request payload for creating a doctor
type CreateDoctorRequest struct {
	Name        string `json:"name" validate:"required,min=2,max=255" binding:"required"`
	SpecialtyID uint   `json:"specialty_id" validate:"required,min=1" binding:"required"`
}

// SuccessResponse represents a success response


// CreateDoctor handles POST /doctors - creates a new doctor
func (h *DoctorHandler) CreateDoctor(c *gin.Context) {
	var req CreateDoctorRequest

	// Bind JSON request to struct
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Bad Request",
			Message: "Invalid request payload",
			Details: h.parseValidationErrors(err),
		})
		return
	}

	// Additional validation using validator
	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation Failed",
			Message: "Required fields validation failed",
			Details: h.parseValidationErrors(err),
		})
		return
	}

	// Sanitize input to prevent injection attacks
	sanitizedName := utils.SanitizeName(req.Name)
	if err := utils.ValidateInput(sanitizedName, "name"); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation Failed",
			Message: "Invalid input data provided",
		})
		return
	}

	// Create doctor model
	doctor := &models.Doctor{
		Name:        sanitizedName,
		SpecialtyID: req.SpecialtyID,
		IsActive:    true,
	}

	// Save doctor using repository
	if err := h.doctorRepo.CreateDoctor(doctor); err != nil {
		utils.LogError(err, "Failed to create doctor", logrus.Fields{
			"component":    "doctor_handler",
			"operation":    "create_doctor",
			"doctor_name":  doctor.Name,
			"specialty_id": doctor.SpecialtyID,
		})

		if strings.Contains(err.Error(), "validation failed") ||
			strings.Contains(err.Error(), "specialty not found") ||
			strings.Contains(err.Error(), "required") {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "Validation Failed",
				Message: "Invalid input data provided",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Unable to process request at this time",
		})
		return
	}

	utils.LogInfo("Doctor created successfully", logrus.Fields{
		"component":    "doctor_handler",
		"operation":    "create_doctor",
		"doctor_id":    doctor.ID,
		"doctor_name":  doctor.Name,
		"specialty_id": doctor.SpecialtyID,
	})

	// Return success response with 201 Created status
	c.JSON(http.StatusCreated, SuccessResponse{
		Message: "Doctor created successfully",
		Data:    doctor,
	})
}

// GetDoctor handles GET /doctors/:id - retrieves a doctor by ID
func (h *DoctorHandler) GetDoctor(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Bad Request",
			Message: "Invalid doctor ID",
		})
		return
	}

	doctor, err := h.doctorRepo.GetDoctorByID(uint(id))
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "Not Found",
				Message: "Requested resource not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Unable to process request at this time",
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Doctor retrieved successfully",
		Data:    doctor,
	})
}

// GetAllDoctors handles GET /doctors - retrieves all doctors
func (h *DoctorHandler) GetAllDoctors(c *gin.Context) {
	// Parse pagination parameters from query string
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")
	pageStr := c.Query("page") // Optional page parameter

	// Parse limit
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10 // Default limit
	}
	if limit > 100 {
		limit = 100 // Maximum limit
	}

	// Parse offset or page
	var offset int
	if pageStr != "" {
		// If page is provided, calculate offset
		page, err := strconv.Atoi(pageStr)
		if err != nil || page <= 0 {
			page = 1
		}
		offset = (page - 1) * limit
	} else {
		// Use offset directly
		offset, err = strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			offset = 0
		}
	}

	// Check if pagination is requested
	if c.Query("limit") != "" || c.Query("offset") != "" || c.Query("page") != "" {
		// Use paginated endpoint
		params := repository.PaginationParams{
			Limit:  limit,
			Offset: offset,
		}

		result, err := h.doctorRepo.GetAllDoctorsPaginated(params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "Internal Server Error",
				Message: "Unable to process request at this time",
			})
			return
		}

		c.JSON(http.StatusOK, SuccessResponse{
			Message: "Doctors retrieved successfully",
			Data:    result,
		})
	} else {
		// Use non-paginated endpoint for backward compatibility
		doctors, err := h.doctorRepo.GetAllDoctors()
		if err != nil {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "Internal Server Error",
				Message: "Unable to process request at this time",
			})
			return
		}

		c.JSON(http.StatusOK, SuccessResponse{
			Message: "Doctors retrieved successfully",
			Data:    doctors,
		})
	}
}

// parseValidationErrors converts validation errors to a map for better error messages
func (h *DoctorHandler) parseValidationErrors(err error) map[string]interface{} {
	errorMap := make(map[string]interface{})

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			field := strings.ToLower(fieldError.Field())
			switch fieldError.Tag() {
			case "required":
				errorMap[field] = field + " is required"
			case "min":
				errorMap[field] = field + " must be at least " + fieldError.Param() + " characters"
			case "max":
				errorMap[field] = field + " must be at most " + fieldError.Param() + " characters"
			default:
				errorMap[field] = field + " is invalid"
			}
		}
	} else {
		errorMap["general"] = err.Error()
	}

	return errorMap
}
