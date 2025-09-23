package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"smart-doctor-booking-app/models"
	"smart-doctor-booking-app/utils"
)

// AppointmentRepository interface defines the contract for appointment data operations
type AppointmentRepository interface {
	// Basic CRUD operations
	GetUpcomingAppointments(userID int) ([]models.Appointment, error)
	CreateAppointment(appointment *models.Appointment) error
	GetAppointmentByID(id uint) (*models.Appointment, error)
	GetAllAppointments() ([]models.Appointment, error)
	UpdateAppointment(appointment *models.Appointment) error
	DeleteAppointment(id uint) error

	// Smart scheduling operations
	GetDoctorAvailability(doctorID uint, date time.Time) ([]models.TimeSlot, error)
	GetDoctorAvailabilityRange(doctorID uint, startDate, endDate time.Time) (map[string][]models.TimeSlot, error)
	CheckTimeSlotAvailability(doctorID uint, startTime, endTime time.Time) (bool, error)
	BookTimeSlot(appointment *models.Appointment) error
	CancelAppointment(appointmentID uint, cancelledBy, reason string) error
	RescheduleAppointment(appointmentID uint, newStartTime, newEndTime time.Time) error
	GetPatientAppointments(userID uint, status string) ([]models.Appointment, error)
	GetDoctorAppointments(doctorID uint, date time.Time) ([]models.Appointment, error)
	DetectConflicts(doctorID uint, startTime, endTime time.Time, excludeAppointmentID *uint) ([]models.Appointment, error)
	CreateTimeSlots(doctorID uint, date time.Time, startTime, endTime time.Time, duration int) error
	GetTimeSlotsByDoctor(doctorID uint, date time.Time) ([]models.TimeSlot, error)
	UpdateTimeSlotStatus(slotID uint, status models.SlotStatus, appointmentID *uint) error
}

// appointmentRepository implements AppointmentRepository interface
type appointmentRepository struct {
	db *gorm.DB
}

// NewAppointmentRepository creates a new instance of AppointmentRepository
func NewAppointmentRepository(db *gorm.DB) AppointmentRepository {
	return &appointmentRepository{
		db: db,
	}
}

// GetUpcomingAppointments returns a slice of appointments with Status = 'SCHEDULED',
// where AppointmentTime is after the current time, ordered ascending by AppointmentTime
func (r *appointmentRepository) GetUpcomingAppointments(userID int) ([]models.Appointment, error) {
	var appointments []models.Appointment
	currentTime := time.Now()

	// Query for upcoming scheduled appointments
	result := r.db.Preload("Doctor").Preload("Doctor.Specialty").
		Where("user_id = ? AND status = ? AND appointment_time > ?",
			userID, models.StatusScheduled, currentTime).
		Order("appointment_time ASC").
		Find(&appointments)

	if result.Error != nil {
		return nil, result.Error
	}

	// Check if no rows were found and return sql.ErrNoRows for testability
	if result.RowsAffected == 0 {
		return nil, sql.ErrNoRows
	}

	return appointments, nil
}

// CreateAppointment saves appointment to database
func (r *appointmentRepository) CreateAppointment(appointment *models.Appointment) error {
	if appointment == nil {
		return gorm.ErrInvalidData
	}

	if err := r.db.Create(appointment).Error; err != nil {
		return err
	}

	return nil
}

// GetAppointmentByID retrieves an appointment by its ID
func (r *appointmentRepository) GetAppointmentByID(id uint) (*models.Appointment, error) {
	var appointment models.Appointment

	result := r.db.Preload("Doctor").Preload("Doctor.Specialty").
		First(&appointment, id)

	if result.Error != nil {
		return nil, result.Error
	}

	return &appointment, nil
}

// GetAllAppointments retrieves all appointments
func (r *appointmentRepository) GetAllAppointments() ([]models.Appointment, error) {
	var appointments []models.Appointment

	result := r.db.Preload("Doctor").Preload("Doctor.Specialty").
		Find(&appointments)

	if result.Error != nil {
		return nil, result.Error
	}

	return appointments, nil
}

// UpdateAppointment updates an existing appointment
func (r *appointmentRepository) UpdateAppointment(appointment *models.Appointment) error {
	if appointment == nil {
		return gorm.ErrInvalidData
	}

	result := r.db.Save(appointment)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// DeleteAppointment soft deletes an appointment by ID
func (r *appointmentRepository) DeleteAppointment(id uint) error {
	result := r.db.Delete(&models.Appointment{}, id)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// Smart Scheduling Methods

// GetDoctorAvailability returns available time slots for a doctor on a specific date
func (r *appointmentRepository) GetDoctorAvailability(doctorID uint, date time.Time) ([]models.TimeSlot, error) {
	var timeSlots []models.TimeSlot

	// Get available time slots for the doctor on the specified date
	result := r.db.Where("doctor_id = ? AND date = ? AND status = ?",
		doctorID, date.Format("2006-01-02"), models.SlotAvailable).
		Order("start_time ASC").
		Find(&timeSlots)

	if result.Error != nil {
		return nil, result.Error
	}

	return timeSlots, nil
}

// GetDoctorAvailabilityRange returns available time slots for a doctor within a date range
func (r *appointmentRepository) GetDoctorAvailabilityRange(doctorID uint, startDate, endDate time.Time) (map[string][]models.TimeSlot, error) {
	var timeSlots []models.TimeSlot
	availabilityMap := make(map[string][]models.TimeSlot)

	// Get available time slots for the doctor within the date range
	result := r.db.Where("doctor_id = ? AND date BETWEEN ? AND ? AND status = ?",
		doctorID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"), models.SlotAvailable).
		Order("date ASC, start_time ASC").
		Find(&timeSlots)

	if result.Error != nil {
		return nil, result.Error
	}

	// Group slots by date
	for _, slot := range timeSlots {
		dateKey := slot.Date.Format("2006-01-02")
		availabilityMap[dateKey] = append(availabilityMap[dateKey], slot)
	}

	return availabilityMap, nil
}

// CheckTimeSlotAvailability checks if a time slot is available for booking
func (r *appointmentRepository) CheckTimeSlotAvailability(doctorID uint, startTime, endTime time.Time) (bool, error) {
	var count int64

	// Check for conflicting appointments
	result := r.db.Model(&models.Appointment{}).
		Where("doctor_id = ? AND status IN (?, ?) AND ((appointment_time < ? AND end_time > ?) OR (appointment_time < ? AND end_time > ?) OR (appointment_time >= ? AND end_time <= ?))",
			doctorID, models.StatusScheduled, models.StatusConfirmed,
			endTime, startTime, // Overlaps at start
			startTime, endTime, // Overlaps at end
			startTime, endTime). // Completely within
		Count(&count)

	if result.Error != nil {
		return false, result.Error
	}

	return count == 0, nil
}

// BookTimeSlot books a time slot with conflict detection and transaction support
func (r *appointmentRepository) BookTimeSlot(appointment *models.Appointment) error {
	if appointment == nil {
		return gorm.ErrInvalidData
	}

	// Begin transaction
	tx := r.db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to begin transaction: %w", tx.Error)
	}

	// Ensure rollback on error
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			// Log the panic instead of re-panicking
			utils.LogError(fmt.Errorf("panic in CancelAppointment: %v", r), "Transaction panic recovered", nil)
		}
	}()

	// Check for conflicts within transaction
	conflicts, err := r.detectConflictsInTx(tx, appointment.DoctorID, appointment.AppointmentTime, appointment.EndTime, nil)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to check conflicts: %w", err)
	}

	if len(conflicts) > 0 {
		tx.Rollback()
		return errors.New("time slot is not available - conflicts detected")
	}

	// Calculate end time if not provided
	if appointment.EndTime.IsZero() {
		appointment.EndTime = appointment.AppointmentTime.Add(time.Duration(appointment.Duration) * time.Minute)
	}

	// Create appointment within transaction
	if err := tx.Create(appointment).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to create appointment: %w", err)
	}

	// Update corresponding time slot status if exists
	var timeSlot models.TimeSlot
	result := tx.Where("doctor_id = ? AND date = ? AND start_time <= ? AND end_time >= ? AND status = ?",
		appointment.DoctorID, appointment.AppointmentTime.Format("2006-01-02"),
		appointment.AppointmentTime, appointment.EndTime, models.SlotAvailable).
		First(&timeSlot)

	if result.Error == nil {
		// Update time slot status
		timeSlot.Status = models.SlotBooked
		timeSlot.AppointmentID = &appointment.ID
		if err := tx.Save(&timeSlot).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to update time slot: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.LogInfo("Appointment booked successfully", map[string]interface{}{
		"appointment_id":   appointment.ID,
		"doctor_id":        appointment.DoctorID,
		"user_id":          appointment.UserID,
		"appointment_time": appointment.AppointmentTime,
	})

	return nil
}

// CancelAppointment cancels an appointment and updates related time slots
func (r *appointmentRepository) CancelAppointment(appointmentID uint, cancelledBy, reason string) error {
	// Begin transaction
	tx := r.db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to begin transaction: %w", tx.Error)
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			// Log the panic instead of re-panicking
			utils.LogError(fmt.Errorf("panic in transaction: %v", r), "Transaction panic recovered", nil)
		}
	}()

	// Get appointment
	var appointment models.Appointment
	if err := tx.First(&appointment, appointmentID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("appointment not found: %w", err)
	}

	// Update appointment status
	now := time.Now()
	appointment.Status = models.StatusCancelled
	appointment.CancelledAt = &now
	appointment.CancelledBy = cancelledBy
	appointment.CancellationReason = reason

	if err := tx.Save(&appointment).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update appointment: %w", err)
	}

	// Free up the time slot
	var timeSlot models.TimeSlot
	result := tx.Where("appointment_id = ?", appointmentID).First(&timeSlot)
	if result.Error == nil {
		timeSlot.Status = models.SlotAvailable
		timeSlot.AppointmentID = nil
		if err := tx.Save(&timeSlot).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to update time slot: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.LogInfo("Appointment cancelled successfully", map[string]interface{}{
		"appointment_id": appointmentID,
		"cancelled_by":   cancelledBy,
		"reason":         reason,
	})

	return nil
}

// RescheduleAppointment reschedules an appointment to a new time slot
func (r *appointmentRepository) RescheduleAppointment(appointmentID uint, newStartTime, newEndTime time.Time) error {
	// Begin transaction
	tx := r.db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to begin transaction: %w", tx.Error)
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			// Log the panic instead of re-panicking
			utils.LogError(fmt.Errorf("panic in RescheduleAppointment: %v", r), "Transaction panic recovered", nil)
		}
	}()

	// Get original appointment
	var originalAppointment models.Appointment
	if err := tx.First(&originalAppointment, appointmentID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("appointment not found: %w", err)
	}

	// Check for conflicts at new time
	conflicts, err := r.detectConflictsInTx(tx, originalAppointment.DoctorID, newStartTime, newEndTime, &appointmentID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to check conflicts: %w", err)
	}

	if len(conflicts) > 0 {
		tx.Rollback()
		return errors.New("new time slot is not available - conflicts detected")
	}

	// Create new appointment
	newAppointment := originalAppointment
	newAppointment.ID = 0 // Reset ID for new record
	newAppointment.AppointmentTime = newStartTime
	newAppointment.EndTime = newEndTime
	newAppointment.RescheduledFrom = &originalAppointment.ID
	newAppointment.RescheduleCount = originalAppointment.RescheduleCount + 1
	newAppointment.Status = models.StatusScheduled

	if err := tx.Create(&newAppointment).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to create rescheduled appointment: %w", err)
	}

	// Update original appointment
	originalAppointment.Status = models.StatusRescheduled
	originalAppointment.RescheduledTo = &newAppointment.ID
	if err := tx.Save(&originalAppointment).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update original appointment: %w", err)
	}

	// Update time slots
	// Free old slot
	var oldTimeSlot models.TimeSlot
	result := tx.Where("appointment_id = ?", appointmentID).First(&oldTimeSlot)
	if result.Error == nil {
		oldTimeSlot.Status = models.SlotAvailable
		oldTimeSlot.AppointmentID = nil
		tx.Save(&oldTimeSlot)
	}

	// Book new slot
	var newTimeSlot models.TimeSlot
	result = tx.Where("doctor_id = ? AND date = ? AND start_time <= ? AND end_time >= ? AND status = ?",
		newAppointment.DoctorID, newStartTime.Format("2006-01-02"),
		newStartTime, newEndTime, models.SlotAvailable).First(&newTimeSlot)
	if result.Error == nil {
		newTimeSlot.Status = models.SlotBooked
		newTimeSlot.AppointmentID = &newAppointment.ID
		tx.Save(&newTimeSlot)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.LogInfo("Appointment rescheduled successfully", map[string]interface{}{
		"original_appointment_id": appointmentID,
		"new_appointment_id":      newAppointment.ID,
		"new_start_time":          newStartTime,
		"new_end_time":            newEndTime,
	})

	return nil
}

// GetPatientAppointments returns appointments for a specific patient
func (r *appointmentRepository) GetPatientAppointments(userID uint, status string) ([]models.Appointment, error) {
	var appointments []models.Appointment
	query := r.db.Preload("Doctor").Preload("Doctor.Specialty").Where("user_id = ?", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	result := query.Order("appointment_time DESC").Find(&appointments)
	if result.Error != nil {
		return nil, result.Error
	}

	return appointments, nil
}

// GetDoctorAppointments returns appointments for a specific doctor on a specific date
func (r *appointmentRepository) GetDoctorAppointments(doctorID uint, date time.Time) ([]models.Appointment, error) {
	var appointments []models.Appointment

	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	result := r.db.Preload("Doctor").
		Where("doctor_id = ? AND appointment_time >= ? AND appointment_time < ? AND status IN (?, ?)",
			doctorID, startOfDay, endOfDay, models.StatusScheduled, models.StatusConfirmed).
		Order("appointment_time ASC").
		Find(&appointments)

	if result.Error != nil {
		return nil, result.Error
	}

	return appointments, nil
}

// DetectConflicts detects scheduling conflicts for a doctor within a time range
func (r *appointmentRepository) DetectConflicts(doctorID uint, startTime, endTime time.Time, excludeAppointmentID *uint) ([]models.Appointment, error) {
	return r.detectConflictsInTx(r.db, doctorID, startTime, endTime, excludeAppointmentID)
}

// detectConflictsInTx is a helper method for conflict detection within a transaction
func (r *appointmentRepository) detectConflictsInTx(tx *gorm.DB, doctorID uint, startTime, endTime time.Time, excludeAppointmentID *uint) ([]models.Appointment, error) {
	var conflicts []models.Appointment

	query := tx.Where("doctor_id = ? AND status IN (?, ?) AND ((appointment_time < ? AND end_time > ?) OR (appointment_time < ? AND end_time > ?) OR (appointment_time >= ? AND end_time <= ?))",
		doctorID, models.StatusScheduled, models.StatusConfirmed,
		endTime, startTime, // Overlaps at start
		startTime, endTime, // Overlaps at end
		startTime, endTime) // Completely within

	if excludeAppointmentID != nil {
		query = query.Where("id != ?", *excludeAppointmentID)
	}

	result := query.Find(&conflicts)
	if result.Error != nil {
		return nil, result.Error
	}

	return conflicts, nil
}

// CreateTimeSlots creates time slots for a doctor on a specific date
func (r *appointmentRepository) CreateTimeSlots(doctorID uint, date time.Time, startTime, endTime time.Time, duration int) error {
	var timeSlots []models.TimeSlot

	// Generate time slots
	currentTime := startTime
	for currentTime.Add(time.Duration(duration)*time.Minute).Before(endTime) || currentTime.Add(time.Duration(duration)*time.Minute).Equal(endTime) {
		slotEndTime := currentTime.Add(time.Duration(duration) * time.Minute)

		timeSlot := models.TimeSlot{
			DoctorID:  doctorID,
			Date:      date,
			StartTime: currentTime,
			EndTime:   slotEndTime,
			Duration:  duration,
			Status:    models.SlotAvailable,
		}

		timeSlots = append(timeSlots, timeSlot)
		currentTime = slotEndTime
	}

	// Batch create time slots
	if len(timeSlots) > 0 {
		result := r.db.Create(&timeSlots)
		if result.Error != nil {
			return fmt.Errorf("failed to create time slots: %w", result.Error)
		}
	}

	return nil
}

// GetTimeSlotsByDoctor returns time slots for a doctor on a specific date
func (r *appointmentRepository) GetTimeSlotsByDoctor(doctorID uint, date time.Time) ([]models.TimeSlot, error) {
	var timeSlots []models.TimeSlot

	result := r.db.Preload("Appointment").
		Where("doctor_id = ? AND date = ?", doctorID, date.Format("2006-01-02")).
		Order("start_time ASC").
		Find(&timeSlots)

	if result.Error != nil {
		return nil, result.Error
	}

	return timeSlots, nil
}

// UpdateTimeSlotStatus updates the status of a time slot
func (r *appointmentRepository) UpdateTimeSlotStatus(slotID uint, status models.SlotStatus, appointmentID *uint) error {
	var timeSlot models.TimeSlot

	if err := r.db.First(&timeSlot, slotID).Error; err != nil {
		return fmt.Errorf("time slot not found: %w", err)
	}

	timeSlot.Status = status
	timeSlot.AppointmentID = appointmentID

	if err := r.db.Save(&timeSlot).Error; err != nil {
		return fmt.Errorf("failed to update time slot: %w", err)
	}

	return nil
}
