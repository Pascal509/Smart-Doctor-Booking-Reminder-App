package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"smart-doctor-booking-app/models"
	"smart-doctor-booking-app/services"
	"smart-doctor-booking-app/utils"
)

// AppointmentHandler handles appointment-related HTTP requests
type AppointmentHandler struct {
	schedulingService services.SchedulingService
}

// NewAppointmentHandler creates a new appointment handler
func NewAppointmentHandler(schedulingService services.SchedulingService) *AppointmentHandler {
	return &AppointmentHandler{
		schedulingService: schedulingService,
	}
}

// BookingRequest represents the request body for booking an appointment
type BookingRequest struct {
	DoctorID        uint                   `json:"doctor_id" binding:"required"`
	AppointmentTime string                 `json:"appointment_time" binding:"required"`
	Duration        int                    `json:"duration" binding:"required,min=15,max=180"`
	AppointmentType models.AppointmentType `json:"appointment_type"`
	Notes           string                 `json:"notes"`
	ReminderType    models.ReminderType    `json:"reminder_type"`
	ReminderTime    int                    `json:"reminder_time" binding:"min=5,max=1440"` // 5 minutes to 24 hours
}

// RescheduleRequest represents the request body for rescheduling an appointment
type RescheduleRequest struct {
	NewAppointmentTime string `json:"new_appointment_time" binding:"required"`
	Duration           int    `json:"duration" binding:"required,min=15,max=180"`
}

// CancellationRequest represents the request body for cancelling an appointment
type CancellationRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// AvailabilityRequest represents the request for checking doctor availability
type AvailabilityRequest struct {
	DoctorID  uint   `form:"doctor_id" binding:"required"`
	Date      string `form:"date" binding:"required"`
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
}

// API Response structures
type BookingResponse struct {
	Success      bool                `json:"success"`
	Message      string              `json:"message"`
	Appointment  *models.Appointment `json:"appointment,omitempty"`
	Alternatives []models.TimeSlot   `json:"alternatives,omitempty"`
}

type AvailabilityResponse struct {
	Success      bool                                    `json:"success"`
	Message      string                                  `json:"message"`
	Availability *models.AvailabilityResponse            `json:"availability,omitempty"`
	Range        map[string]*models.AvailabilityResponse `json:"range,omitempty"`
}

type AppointmentsResponse struct {
	Success      bool                 `json:"success"`
	Message      string               `json:"message"`
	Appointments []models.Appointment `json:"appointments"`
	Total        int                  `json:"total"`
}

type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Core Appointment Management Endpoints

// BookAppointment handles POST /api/appointments/book
// @Summary Book a new appointment
// @Description Book a new appointment with conflict detection and automatic suggestions
// @Tags appointments
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param booking body BookingRequest true "Booking details"
// @Success 201 {object} BookingResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 409 {object} BookingResponse "Conflict with alternatives"
// @Failure 500 {object} ErrorResponse
// @Router /api/appointments/book [post]
func (h *AppointmentHandler) BookAppointment(c *gin.Context) {
	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		utils.LogError(nil, "User ID not found in context", map[string]interface{}{
			"endpoint": "BookAppointment",
		})
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Unauthorized",
			Message: "User authentication required",
		})
		return
	}

	var request BookingRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		utils.LogError(err, "Invalid booking request", map[string]interface{}{
			"user_id": userID,
			"request": request,
		})
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Parse appointment time
	appointmentTime, err := time.Parse("2006-01-02T15:04:05Z07:00", request.AppointmentTime)
	if err != nil {
		utils.LogError(err, "Invalid appointment time format", map[string]interface{}{
			"user_id":          userID,
			"appointment_time": request.AppointmentTime,
		})
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid time format",
			Message: "Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)",
		})
		return
	}

	// Create booking request
	bookingReq := &services.BookingRequest{
		UserID:          userID.(uint),
		DoctorID:        request.DoctorID,
		AppointmentTime: appointmentTime,
		Duration:        request.Duration,
		AppointmentType: request.AppointmentType,
		Notes:           request.Notes,
		ReminderType:    request.ReminderType,
		ReminderTime:    request.ReminderTime,
	}

	// Book the appointment
	appointment, err := h.schedulingService.BookAppointment(bookingReq)
	if err != nil {
		// Check if error contains alternatives
		if appointment == nil {
			// Try to get alternative slots
			alternatives, _ := h.schedulingService.SuggestAlternativeSlots(
				request.DoctorID, appointmentTime, request.Duration)

			utils.LogError(err, "Failed to book appointment", map[string]interface{}{
				"user_id":            userID,
				"doctor_id":          request.DoctorID,
				"appointment_time":   appointmentTime,
				"alternatives_count": len(alternatives),
			})

			c.JSON(http.StatusConflict, BookingResponse{
				Success:      false,
				Message:      err.Error(),
				Alternatives: alternatives,
			})
			return
		}

		utils.LogError(err, "Failed to book appointment", map[string]interface{}{
			"user_id":   userID,
			"doctor_id": request.DoctorID,
		})
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Booking failed",
			Message: "Unable to book appointment. Please try again.",
		})
		return
	}

	utils.LogInfo("Appointment booked successfully", map[string]interface{}{
		"appointment_id": appointment.ID,
		"user_id":        userID,
		"doctor_id":      request.DoctorID,
	})

	c.JSON(http.StatusCreated, BookingResponse{
		Success:     true,
		Message:     "Appointment booked successfully",
		Appointment: appointment,
	})
}

// CancelAppointment handles DELETE /api/appointments/:id/cancel
// @Summary Cancel an appointment
// @Description Cancel an existing appointment
// @Tags appointments
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path int true "Appointment ID"
// @Param cancellation body CancellationRequest true "Cancellation details"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/appointments/{id}/cancel [delete]
func (h *AppointmentHandler) CancelAppointment(c *gin.Context) {
	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
		Error:   "Unauthorized",
		Message: "User authentication required",
	})
		return
	}

	// Get appointment ID from URL parameter
	appointmentIDStr := c.Param("id")
	appointmentID, err := strconv.ParseUint(appointmentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid appointment ID",
			Message: "Appointment ID must be a valid number",
		})
		return
	}

	var request CancellationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Cancel the appointment
	cancelledBy := "patient" // In a real app, determine if cancelled by patient or doctor
	if err := h.schedulingService.CancelAppointment(uint(appointmentID), cancelledBy, request.Reason); err != nil {
		utils.LogError(err, "Failed to cancel appointment", map[string]interface{}{
			"appointment_id": appointmentID,
			"user_id":        userID,
			"cancelled_by":   cancelledBy,
		})
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Cancellation failed",
			Message: "Unable to cancel appointment. Please try again.",
		})
		return
	}

	utils.LogInfo("Appointment cancelled successfully", map[string]interface{}{
		"appointment_id": appointmentID,
		"user_id":        userID,
		"reason":         request.Reason,
	})

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Appointment cancelled successfully",
	})
}

// RescheduleAppointment handles PUT /api/appointments/:id/reschedule
// @Summary Reschedule an appointment
// @Description Reschedule an existing appointment to a new time
// @Tags appointments
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path int true "Appointment ID"
// @Param reschedule body RescheduleRequest true "Reschedule details"
// @Success 200 {object} BookingResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/appointments/{id}/reschedule [put]
func (h *AppointmentHandler) RescheduleAppointment(c *gin.Context) {
	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Unauthorized",
			Message: "User authentication required",
		})
		return
	}

	// Get appointment ID from URL parameter
	appointmentIDStr := c.Param("id")
	appointmentID, err := strconv.ParseUint(appointmentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid appointment ID",
			Message: "Appointment ID must be a valid number",
		})
		return
	}

	var request RescheduleRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Parse new appointment time
	newAppointmentTime, err := time.Parse("2006-01-02T15:04:05Z07:00", request.NewAppointmentTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid time format",
			Message: "Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)",
		})
		return
	}

	// Calculate new end time
	newEndTime := newAppointmentTime.Add(time.Duration(request.Duration) * time.Minute)

	// Reschedule the appointment
	newAppointment, err := h.schedulingService.RescheduleAppointment(uint(appointmentID), newAppointmentTime, newEndTime)
	if err != nil {
		utils.LogError(err, "Failed to reschedule appointment", map[string]interface{}{
			"appointment_id":       appointmentID,
			"user_id":              userID,
			"new_appointment_time": newAppointmentTime,
		})
		c.JSON(http.StatusConflict, ErrorResponse{
			Error:   "Reschedule failed",
			Message: err.Error(),
		})
		return
	}

	utils.LogInfo("Appointment rescheduled successfully", map[string]interface{}{
		"appointment_id":     appointmentID,
		"new_appointment_id": newAppointment.ID,
		"user_id":            userID,
	})

	c.JSON(http.StatusOK, BookingResponse{
		Success:     true,
		Message:     "Appointment rescheduled successfully",
		Appointment: newAppointment,
	})
}

// Availability and Viewing Endpoints

// GetDoctorAvailability handles GET /api/appointments/availability
// @Summary Get doctor's available time slots
// @Description Get available time slots for a doctor on a specific date or date range
// @Tags appointments
// @Accept json
// @Produce json
// @Param doctor_id query int true "Doctor ID"
// @Param date query string false "Specific date (YYYY-MM-DD)"
// @Param start_date query string false "Start date for range (YYYY-MM-DD)"
// @Param end_date query string false "End date for range (YYYY-MM-DD)"
// @Success 200 {object} AvailabilityResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/appointments/availability [get]
func (h *AppointmentHandler) GetDoctorAvailability(c *gin.Context) {
	var request AvailabilityRequest
	if err := c.ShouldBindQuery(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Check if it's a date range request
	if request.StartDate != "" && request.EndDate != "" {
		// Parse date range
		startDate, err := time.Parse("2006-01-02", request.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "Invalid start date format",
				Message: "Please use YYYY-MM-DD format",
			})
			return
		}

		endDate, err := time.Parse("2006-01-02", request.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "Invalid end date format",
				Message: "Please use YYYY-MM-DD format",
			})
			return
		}

		// Get availability range
		availabilityRange, err := h.schedulingService.GetDoctorAvailabilityRange(request.DoctorID, startDate, endDate)
		if err != nil {
			utils.LogError(err, "Failed to get doctor availability range", map[string]interface{}{
			"doctor_id":  request.DoctorID,
			"start_date": startDate,
			"end_date":   endDate,
		})
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "Failed to get availability",
				Message: "Unable to retrieve doctor availability. Please try again.",
			})
			return
		}

		c.JSON(http.StatusOK, AvailabilityResponse{
			Success: true,
			Message: "Doctor availability retrieved successfully",
			Range:   availabilityRange,
		})
		return
	}

	// Single date request
	if request.Date == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Missing date parameter",
			Message: "Please provide either 'date' or both 'start_date' and 'end_date'",
		})
		return
	}

	// Parse single date
	date, err := time.Parse("2006-01-02", request.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid date format",
			Message: "Please use YYYY-MM-DD format",
		})
		return
	}

	// Get availability for single date
	availability, err := h.schedulingService.GetDoctorAvailability(request.DoctorID, date)
	if err != nil {
		utils.LogError(err, "Failed to get doctor availability", map[string]interface{}{
			"doctor_id": request.DoctorID,
			"date":      date,
		})
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Failed to get availability",
			Message: "Unable to retrieve doctor availability. Please try again.",
		})
		return
	}

	c.JSON(http.StatusOK, AvailabilityResponse{
		Success:      true,
		Message:      "Doctor availability retrieved successfully",
		Availability: availability,
	})
}

// GetPatientAppointments handles GET /api/appointments/patient
// @Summary Get patient's appointments
// @Description Get all appointments for the authenticated patient
// @Tags appointments
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param status query string false "Filter by status (scheduled, confirmed, cancelled, completed)"
// @Success 200 {object} AppointmentsResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/appointments/patient [get]
func (h *AppointmentHandler) GetPatientAppointments(c *gin.Context) {
	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Unauthorized",
			Message: "User authentication required",
		})
		return
	}

	// Get optional status filter
	status := c.Query("status")

	// Get patient appointments
	appointments, err := h.schedulingService.GetPatientAppointments(userID.(uint), status)
	if err != nil {
		utils.LogError(err, "Failed to get patient appointments", map[string]interface{}{
			"user_id": userID,
			"status":  status,
		})
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Failed to get appointments",
			Message: "Unable to retrieve appointments. Please try again.",
		})
		return
	}

	c.JSON(http.StatusOK, AppointmentsResponse{
		Success:      true,
		Message:      "Appointments retrieved successfully",
		Appointments: appointments,
		Total:        len(appointments),
	})
}

// GetUpcomingAppointments handles GET /api/appointments/upcoming
// @Summary Get patient's upcoming appointments
// @Description Get upcoming appointments for the authenticated patient
// @Tags appointments
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Success 200 {object} AppointmentsResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/appointments/upcoming [get]
func (h *AppointmentHandler) GetUpcomingAppointments(c *gin.Context) {
	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Unauthorized",
			Message: "User authentication required",
		})
		return
	}

	// Get upcoming appointments
	appointments, err := h.schedulingService.GetUpcomingAppointments(userID.(uint))
	if err != nil {
		utils.LogError(err, "Failed to get upcoming appointments", map[string]interface{}{
			"user_id": userID,
		})
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Failed to get appointments",
			Message: "Unable to retrieve upcoming appointments. Please try again.",
		})
		return
	}

	c.JSON(http.StatusOK, AppointmentsResponse{
		Success:      true,
		Message:      "Upcoming appointments retrieved successfully",
		Appointments: appointments,
		Total:        len(appointments),
	})
}

// GetDoctorAppointments handles GET /api/appointments/doctor/:id
// @Summary Get doctor's appointments for a specific date
// @Description Get all appointments for a doctor on a specific date
// @Tags appointments
// @Accept json
// @Produce json
// @Param id path int true "Doctor ID"
// @Param date query string true "Date (YYYY-MM-DD)"
// @Success 200 {object} AppointmentsResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/appointments/doctor/{id} [get]
func (h *AppointmentHandler) GetDoctorAppointments(c *gin.Context) {
	// Get doctor ID from URL parameter
	doctorIDStr := c.Param("id")
	doctorID, err := strconv.ParseUint(doctorIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid doctor ID",
			Message: "Doctor ID must be a valid number",
		})
		return
	}

	// Get date parameter
	dateStr := c.Query("date")
	if dateStr == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Missing date parameter",
			Message: "Please provide a date in YYYY-MM-DD format",
		})
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid date format",
			Message: "Please use YYYY-MM-DD format",
		})
		return
	}

	// Get doctor appointments
	appointments, err := h.schedulingService.GetDoctorAppointments(uint(doctorID), date)
	if err != nil {
		utils.LogError(err, "Failed to get doctor appointments", map[string]interface{}{
			"doctor_id": doctorID,
			"date":      date,
		})
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Failed to get appointments",
			Message: "Unable to retrieve doctor appointments. Please try again.",
		})
		return
	}

	c.JSON(http.StatusOK, AppointmentsResponse{
		Success:      true,
		Message:      "Doctor appointments retrieved successfully",
		Appointments: appointments,
		Total:        len(appointments),
	})
}

// Additional Utility Endpoints

// CheckTimeSlotAvailability handles GET /api/appointments/check-availability
// @Summary Check if a specific time slot is available
// @Description Check if a specific time slot is available for booking
// @Tags appointments
// @Accept json
// @Produce json
// @Param doctor_id query int true "Doctor ID"
// @Param start_time query string true "Start time (ISO 8601 format)"
// @Param end_time query string true "End time (ISO 8601 format)"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/appointments/check-availability [get]
func (h *AppointmentHandler) CheckTimeSlotAvailability(c *gin.Context) {
	doctorIDStr := c.Query("doctor_id")
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")

	if doctorIDStr == "" || startTimeStr == "" || endTimeStr == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Missing parameters",
			Message: "Please provide doctor_id, start_time, and end_time",
		})
		return
	}

	doctorID, err := strconv.ParseUint(doctorIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid doctor ID",
			Message: "Doctor ID must be a valid number",
		})
		return
	}

	startTime, err := time.Parse("2006-01-02T15:04:05Z07:00", startTimeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid start time format",
			Message: "Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)",
		})
		return
	}

	endTime, err := time.Parse("2006-01-02T15:04:05Z07:00", endTimeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid end time format",
			Message: "Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)",
		})
		return
	}

	available, err := h.schedulingService.CheckTimeSlotAvailability(uint(doctorID), startTime, endTime)
	if err != nil {
		utils.LogError(err, "Failed to check time slot availability", map[string]interface{}{
			"doctor_id":  doctorID,
			"start_time": startTime,
			"end_time":   endTime,
		})
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Failed to check availability",
			Message: "Unable to check time slot availability. Please try again.",
		})
		return
	}

	message := "Time slot is not available"
	if available {
		message = "Time slot is available"
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    message,
		"available":  available,
		"doctor_id":  doctorID,
		"start_time": startTime,
		"end_time":   endTime,
	})
}
