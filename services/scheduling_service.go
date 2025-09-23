package services

import (
	"errors"
	"fmt"
	"time"

	"smart-doctor-booking-app/models"
	"smart-doctor-booking-app/repository"
	"smart-doctor-booking-app/utils"
)

// SchedulingService interface defines methods for smart appointment scheduling
type SchedulingService interface {
	// Core Scheduling Operations
	BookAppointment(request *BookingRequest) (*models.Appointment, error)
	CancelAppointment(appointmentID uint, cancelledBy, reason string) error
	RescheduleAppointment(appointmentID uint, newStartTime, newEndTime time.Time) (*models.Appointment, error)

	// Availability Management
	GetDoctorAvailability(doctorID uint, date time.Time) (*models.AvailabilityResponse, error)
	GetDoctorAvailabilityRange(doctorID uint, startDate, endDate time.Time) (map[string]*models.AvailabilityResponse, error)
	CheckTimeSlotAvailability(doctorID uint, startTime, endTime time.Time) (bool, error)

	// Patient Operations
	GetPatientAppointments(userID uint, status string) ([]models.Appointment, error)
	GetUpcomingAppointments(userID uint) ([]models.Appointment, error)

	// Doctor Operations
	GetDoctorAppointments(doctorID uint, date time.Time) ([]models.Appointment, error)
	GetDoctorSchedule(doctorID uint) (*models.DoctorSchedule, error)
	UpdateDoctorSchedule(schedule *models.DoctorSchedule) error

	// Conflict Detection and Resolution
	DetectConflicts(doctorID uint, startTime, endTime time.Time, excludeAppointmentID *uint) ([]models.Appointment, error)
	SuggestAlternativeSlots(doctorID uint, preferredTime time.Time, duration int) ([]models.TimeSlot, error)
	AutoRescheduleConflicts(doctorID uint, startTime, endTime time.Time) error

	// Time Slot Management
	GenerateTimeSlots(doctorID uint, date time.Time) error
	GenerateWeeklySlots(doctorID uint, startDate time.Time) error
	BlockTimeSlots(doctorID uint, startTime, endTime time.Time, reason string) error
	UnblockTimeSlots(doctorID uint, startTime, endTime time.Time) error
}

// BookingRequest represents a request to book an appointment
type BookingRequest struct {
	UserID          uint                   `json:"user_id" validate:"required"`
	DoctorID        uint                   `json:"doctor_id" validate:"required"`
	AppointmentTime time.Time              `json:"appointment_time" validate:"required"`
	Duration        int                    `json:"duration" validate:"required,min=15,max=180"`
	AppointmentType models.AppointmentType `json:"appointment_type"`
	Notes           string                 `json:"notes"`
	ReminderType    models.ReminderType    `json:"reminder_type"`
	ReminderTime    int                    `json:"reminder_time"` // minutes before appointment
}

// schedulingService implements SchedulingService
type schedulingService struct {
	appointmentRepo repository.AppointmentRepository
	timeSlotRepo    repository.TimeSlotRepository
	notificationSvc NotificationService
}

// NewSchedulingService creates a new scheduling service
func NewSchedulingService(
	appointmentRepo repository.AppointmentRepository,
	timeSlotRepo repository.TimeSlotRepository,
	notificationSvc NotificationService,
) SchedulingService {
	return &schedulingService{
		appointmentRepo: appointmentRepo,
		timeSlotRepo:    timeSlotRepo,
		notificationSvc: notificationSvc,
	}
}

// Core Scheduling Operations

// BookAppointment books a new appointment with conflict detection
func (s *schedulingService) BookAppointment(request *BookingRequest) (*models.Appointment, error) {
	if request == nil {
		return nil, errors.New("booking request cannot be nil")
	}

	// Validate appointment time (must be in the future)
	if request.AppointmentTime.Before(time.Now()) {
		return nil, errors.New("appointment time must be in the future")
	}

	// Calculate end time
	endTime := request.AppointmentTime.Add(time.Duration(request.Duration) * time.Minute)

	// Check for conflicts
	conflicts, err := s.appointmentRepo.DetectConflicts(request.DoctorID, request.AppointmentTime, endTime, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to check conflicts: %w", err)
	}

	if len(conflicts) > 0 {
		// Suggest alternative slots
		alternatives, _ := s.SuggestAlternativeSlots(request.DoctorID, request.AppointmentTime, request.Duration)
		if len(alternatives) > 0 {
			return nil, fmt.Errorf("time slot is not available. Suggested alternatives: %v", alternatives)
		}
		return nil, errors.New("time slot is not available and no alternatives found")
	}

	// Check time slot availability
	available, err := s.timeSlotRepo.CheckSlotAvailability(request.DoctorID, request.AppointmentTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to check slot availability: %w", err)
	}

	if !available {
		return nil, errors.New("requested time slot is not available")
	}

	// Create appointment
	appointment := &models.Appointment{
		UserID:          request.UserID,
		DoctorID:        request.DoctorID,
		AppointmentTime: request.AppointmentTime,
		EndTime:         endTime,
		Duration:        request.Duration,
		Type:            request.AppointmentType,
		Status:          models.StatusScheduled,
		Notes:           request.Notes,
		ReminderType:    request.ReminderType,
		ReminderTime:    request.ReminderTime,
		CreatedAt:       time.Now(),
	}

	// Book the appointment
	if err := s.appointmentRepo.BookTimeSlot(appointment); err != nil {
		return nil, fmt.Errorf("failed to book appointment: %w", err)
	}

	// Send confirmation notification
	go func() {
		if err := s.notificationSvc.SendAppointmentConfirmation(appointment); err != nil {
			utils.LogError(err, "Failed to send appointment confirmation", map[string]interface{}{
				"appointment_id": appointment.ID,
				"user_id":        appointment.UserID,
			})
		}
	}()

	utils.LogInfo("Appointment booked successfully", map[string]interface{}{
		"appointment_id":   appointment.ID,
		"user_id":          request.UserID,
		"doctor_id":        request.DoctorID,
		"appointment_time": request.AppointmentTime,
	})

	return appointment, nil
}

// CancelAppointment cancels an existing appointment
func (s *schedulingService) CancelAppointment(appointmentID uint, cancelledBy, reason string) error {
	if appointmentID == 0 {
		return errors.New("appointment ID cannot be zero")
	}

	// Get appointment details for notification
	appointment, err := s.appointmentRepo.GetAppointmentByID(appointmentID)
	if err != nil {
		return fmt.Errorf("failed to get appointment: %w", err)
	}

	// Cancel the appointment
	if err := s.appointmentRepo.CancelAppointment(appointmentID, cancelledBy, reason); err != nil {
		return fmt.Errorf("failed to cancel appointment: %w", err)
	}

	// Send cancellation notification
	go func() {
		if err := s.notificationSvc.SendAppointmentCancellation(appointment, reason); err != nil {
			utils.LogError(err, "Failed to send cancellation notification", map[string]interface{}{
				"appointment_id": appointmentID,
				"cancelled_by":   cancelledBy,
			})
		}
	}()

	utils.LogInfo("Appointment cancelled successfully", map[string]interface{}{
		"appointment_id": appointmentID,
		"cancelled_by":   cancelledBy,
		"reason":         reason,
	})

	return nil
}

// RescheduleAppointment reschedules an existing appointment
func (s *schedulingService) RescheduleAppointment(appointmentID uint, newStartTime, newEndTime time.Time) (*models.Appointment, error) {
	if appointmentID == 0 {
		return nil, errors.New("appointment ID cannot be zero")
	}

	// Validate new appointment time
	if newStartTime.Before(time.Now()) {
		return nil, errors.New("new appointment time must be in the future")
	}

	// Get original appointment
	originalAppointment, err := s.appointmentRepo.GetAppointmentByID(appointmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get original appointment: %w", err)
	}

	// Check for conflicts at new time
	conflicts, err := s.appointmentRepo.DetectConflicts(originalAppointment.DoctorID, newStartTime, newEndTime, &appointmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to check conflicts: %w", err)
	}

	if len(conflicts) > 0 {
		return nil, errors.New("new time slot is not available - conflicts detected")
	}

	// Reschedule the appointment
	rescheduleErr := s.appointmentRepo.RescheduleAppointment(appointmentID, newStartTime, newEndTime)
	if rescheduleErr != nil {
		return nil, fmt.Errorf("failed to reschedule appointment: %w", err)
	}

	// Get the new appointment
	newAppointment, err := s.appointmentRepo.GetAppointmentByID(appointmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get rescheduled appointment: %w", err)
	}

	// Send reschedule notification
	go func() {
		if err := s.notificationSvc.SendAppointmentReschedule(originalAppointment, newAppointment); err != nil {
			utils.LogError(err, "Failed to send reschedule notification", map[string]interface{}{
				"appointment_id": appointmentID,
				"new_start_time": newStartTime,
			})
		}
	}()

	return newAppointment, nil
}

// Availability Management

// GetDoctorAvailability returns available time slots for a doctor on a specific date
func (s *schedulingService) GetDoctorAvailability(doctorID uint, date time.Time) (*models.AvailabilityResponse, error) {
	// Get available time slots
	timeSlots, err := s.timeSlotRepo.GetAvailableSlots(doctorID, date)
	if err != nil {
		return nil, fmt.Errorf("failed to get available slots: %w", err)
	}

	// Get doctor appointments for the day
	appointments, err := s.appointmentRepo.GetDoctorAppointments(doctorID, date)
	if err != nil {
		return nil, fmt.Errorf("failed to get doctor appointments: %w", err)
	}

	// Get doctor breaks (not used in current response structure)
	_, err = s.timeSlotRepo.GetDoctorBreaks(doctorID, date)
	if err != nil {
		utils.LogError(err, "Failed to get doctor breaks", map[string]interface{}{
			"doctor_id": doctorID,
			"date":      date,
		})
		// Continue without breaks data
	}

	response := &models.AvailabilityResponse{
		DoctorID:       doctorID,
		Date:           date,
		AvailableSlots: timeSlots,
		TotalSlots:     len(timeSlots),
		BookedSlots:    len(appointments),
	}

	return response, nil
}

// GetDoctorAvailabilityRange returns available time slots for a doctor within a date range
func (s *schedulingService) GetDoctorAvailabilityRange(doctorID uint, startDate, endDate time.Time) (map[string]*models.AvailabilityResponse, error) {
	availabilityMap := make(map[string]*models.AvailabilityResponse)

	// Iterate through each date in the range
	currentDate := startDate
	for currentDate.Before(endDate) || currentDate.Equal(endDate) {
		availability, err := s.GetDoctorAvailability(doctorID, currentDate)
		if err != nil {
			utils.LogError(err, "Failed to get availability for date", map[string]interface{}{
				"doctor_id": doctorID,
				"date":      currentDate,
			})
			// Continue with next date
			currentDate = currentDate.AddDate(0, 0, 1)
			continue
		}

		dateKey := currentDate.Format("2006-01-02")
		availabilityMap[dateKey] = availability
		currentDate = currentDate.AddDate(0, 0, 1)
	}

	return availabilityMap, nil
}

// CheckTimeSlotAvailability checks if a time slot is available for booking
func (s *schedulingService) CheckTimeSlotAvailability(doctorID uint, startTime, endTime time.Time) (bool, error) {
	return s.timeSlotRepo.CheckSlotAvailability(doctorID, startTime, endTime)
}

// Patient Operations

// GetPatientAppointments returns appointments for a specific patient
func (s *schedulingService) GetPatientAppointments(userID uint, status string) ([]models.Appointment, error) {
	return s.appointmentRepo.GetPatientAppointments(userID, status)
}

// GetUpcomingAppointments returns upcoming appointments for a patient
func (s *schedulingService) GetUpcomingAppointments(userID uint) ([]models.Appointment, error) {
	return s.appointmentRepo.GetUpcomingAppointments(int(userID))
}

// Doctor Operations

// GetDoctorAppointments returns appointments for a specific doctor on a specific date
func (s *schedulingService) GetDoctorAppointments(doctorID uint, date time.Time) ([]models.Appointment, error) {
	return s.appointmentRepo.GetDoctorAppointments(doctorID, date)
}

// GetDoctorSchedule retrieves a doctor's schedule
func (s *schedulingService) GetDoctorSchedule(doctorID uint) (*models.DoctorSchedule, error) {
	return s.timeSlotRepo.GetDoctorSchedule(doctorID)
}

// UpdateDoctorSchedule updates a doctor's schedule
func (s *schedulingService) UpdateDoctorSchedule(schedule *models.DoctorSchedule) error {
	return s.timeSlotRepo.UpdateDoctorSchedule(schedule)
}

// Conflict Detection and Resolution

// DetectConflicts detects scheduling conflicts for a doctor within a time range
func (s *schedulingService) DetectConflicts(doctorID uint, startTime, endTime time.Time, excludeAppointmentID *uint) ([]models.Appointment, error) {
	return s.appointmentRepo.DetectConflicts(doctorID, startTime, endTime, excludeAppointmentID)
}

// SuggestAlternativeSlots suggests alternative time slots when the preferred time is not available
func (s *schedulingService) SuggestAlternativeSlots(doctorID uint, preferredTime time.Time, duration int) ([]models.TimeSlot, error) {
	// Get available slots for the same day
	availableSlots, err := s.timeSlotRepo.GetAvailableSlots(doctorID, preferredTime)
	if err != nil {
		return nil, fmt.Errorf("failed to get available slots: %w", err)
	}

	// Filter slots that can accommodate the duration
	var suggestions []models.TimeSlot
	for _, slot := range availableSlots {
		slotDuration := int(slot.EndTime.Sub(slot.StartTime).Minutes())
		if slotDuration >= duration {
			suggestions = append(suggestions, slot)
		}
	}

	// If no slots available on the same day, check next few days
	if len(suggestions) == 0 {
		for i := 1; i <= 7; i++ { // Check next 7 days
			nextDate := preferredTime.AddDate(0, 0, i)
			nextDaySlots, err := s.timeSlotRepo.GetAvailableSlots(doctorID, nextDate)
			if err != nil {
				continue
			}

			for _, slot := range nextDaySlots {
				slotDuration := int(slot.EndTime.Sub(slot.StartTime).Minutes())
				if slotDuration >= duration {
					suggestions = append(suggestions, slot)
					if len(suggestions) >= 5 { // Limit to 5 suggestions
						break
					}
				}
			}

			if len(suggestions) >= 5 {
				break
			}
		}
	}

	return suggestions, nil
}

// AutoRescheduleConflicts automatically reschedules conflicting appointments
func (s *schedulingService) AutoRescheduleConflicts(doctorID uint, startTime, endTime time.Time) error {
	// Get conflicting appointments
	conflicts, err := s.appointmentRepo.DetectConflicts(doctorID, startTime, endTime, nil)
	if err != nil {
		return fmt.Errorf("failed to detect conflicts: %w", err)
	}

	for _, conflict := range conflicts {
		// Find alternative slot for each conflict
		alternatives, err := s.SuggestAlternativeSlots(doctorID, conflict.AppointmentTime, conflict.Duration)
		if err != nil || len(alternatives) == 0 {
			utils.LogError(err, "No alternative slots found for conflict", map[string]interface{}{
				"appointment_id": conflict.ID,
				"doctor_id":      doctorID,
			})
			continue
		}

		// Use the first available alternative
		alternative := alternatives[0]
		newEndTime := alternative.StartTime.Add(time.Duration(conflict.Duration) * time.Minute)

		// Reschedule the appointment
		if err := s.appointmentRepo.RescheduleAppointment(conflict.ID, alternative.StartTime, newEndTime); err != nil {
			utils.LogError(err, "Failed to auto-reschedule appointment", map[string]interface{}{
				"appointment_id": conflict.ID,
				"new_start_time": alternative.StartTime,
			})
			continue
		}

		// Send notification about auto-rescheduling
		go func(appointment models.Appointment, newTime time.Time) {
			if err := s.notificationSvc.SendAutoRescheduleNotification(&appointment, newTime); err != nil {
				utils.LogError(err, "Failed to send auto-reschedule notification", map[string]interface{}{
					"appointment_id": appointment.ID,
				})
			}
		}(conflict, alternative.StartTime)
	}

	return nil
}

// Time Slot Management

// GenerateTimeSlots generates time slots for a doctor on a specific date
func (s *schedulingService) GenerateTimeSlots(doctorID uint, date time.Time) error {
	return s.timeSlotRepo.GenerateTimeSlots(doctorID, date)
}

// GenerateWeeklySlots generates time slots for a doctor for the entire week
func (s *schedulingService) GenerateWeeklySlots(doctorID uint, startDate time.Time) error {
	return s.timeSlotRepo.GenerateWeeklySlots(doctorID, startDate)
}

// BlockTimeSlots blocks time slots within a time range
func (s *schedulingService) BlockTimeSlots(doctorID uint, startTime, endTime time.Time, reason string) error {
	return s.timeSlotRepo.BlockTimeSlots(doctorID, startTime, endTime, reason)
}

// UnblockTimeSlots unblocks time slots within a time range
func (s *schedulingService) UnblockTimeSlots(doctorID uint, startTime, endTime time.Time) error {
	return s.timeSlotRepo.UnblockTimeSlots(doctorID, startTime, endTime)
}
