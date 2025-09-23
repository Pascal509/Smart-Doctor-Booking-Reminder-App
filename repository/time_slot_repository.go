package repository

import (
	"errors"
	"fmt"
	"time"

	"smart-doctor-booking-app/models"
	"smart-doctor-booking-app/utils"

	"gorm.io/gorm"
)

// TimeSlotRepository interface defines methods for time slot management
type TimeSlotRepository interface {
	// Doctor Schedule Management
	CreateDoctorSchedule(schedule *models.DoctorSchedule) error
	GetDoctorSchedule(doctorID uint) (*models.DoctorSchedule, error)
	UpdateDoctorSchedule(schedule *models.DoctorSchedule) error
	DeleteDoctorSchedule(doctorID uint) error

	// Time Slot Management
	CreateTimeSlot(timeSlot *models.TimeSlot) error
	GetTimeSlot(id uint) (*models.TimeSlot, error)
	UpdateTimeSlot(timeSlot *models.TimeSlot) error
	DeleteTimeSlot(id uint) error

	// Availability Management
	GenerateTimeSlots(doctorID uint, date time.Time) error
	GetAvailableSlots(doctorID uint, date time.Time) ([]models.TimeSlot, error)
	GetAvailableSlotsRange(doctorID uint, startDate, endDate time.Time) (map[string][]models.TimeSlot, error)
	CheckSlotAvailability(doctorID uint, startTime, endTime time.Time) (bool, error)

	// Break Management
	CreateDoctorBreak(doctorBreak *models.DoctorBreak) error
	GetDoctorBreaks(doctorID uint, date time.Time) ([]models.DoctorBreak, error)
	UpdateDoctorBreak(doctorBreak *models.DoctorBreak) error
	DeleteDoctorBreak(id uint) error

	// Bulk Operations
	GenerateWeeklySlots(doctorID uint, startDate time.Time) error
	BlockTimeSlots(doctorID uint, startTime, endTime time.Time, reason string) error
	UnblockTimeSlots(doctorID uint, startTime, endTime time.Time) error
}

// timeSlotRepository implements TimeSlotRepository
type timeSlotRepository struct {
	db *gorm.DB
}

// NewTimeSlotRepository creates a new time slot repository
func NewTimeSlotRepository(db *gorm.DB) TimeSlotRepository {
	return &timeSlotRepository{db: db}
}

// Doctor Schedule Management

// CreateDoctorSchedule creates a new doctor schedule
func (r *timeSlotRepository) CreateDoctorSchedule(schedule *models.DoctorSchedule) error {
	if schedule == nil {
		return errors.New("schedule cannot be nil")
	}

	// Check if schedule already exists
	var existingSchedule models.DoctorSchedule
	result := r.db.Where("doctor_id = ?", schedule.DoctorID).First(&existingSchedule)
	if result.Error == nil {
		return errors.New("schedule already exists for this doctor")
	}

	if err := r.db.Create(schedule).Error; err != nil {
		return fmt.Errorf("failed to create doctor schedule: %w", err)
	}

	utils.LogInfo("Doctor schedule created successfully", map[string]interface{}{
		"doctor_id":   schedule.DoctorID,
		"schedule_id": schedule.ID,
	})

	return nil
}

// GetDoctorSchedule retrieves a doctor's schedule
func (r *timeSlotRepository) GetDoctorSchedule(doctorID uint) (*models.DoctorSchedule, error) {
	var schedule models.DoctorSchedule
	result := r.db.Where("doctor_id = ?", doctorID).First(&schedule)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("doctor schedule not found")
		}
		return nil, result.Error
	}

	return &schedule, nil
}

// UpdateDoctorSchedule updates a doctor's schedule
func (r *timeSlotRepository) UpdateDoctorSchedule(schedule *models.DoctorSchedule) error {
	if schedule == nil {
		return errors.New("schedule cannot be nil")
	}

	result := r.db.Save(schedule)
	if result.Error != nil {
		return fmt.Errorf("failed to update doctor schedule: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("doctor schedule not found")
	}

	utils.LogInfo("Doctor schedule updated successfully", map[string]interface{}{
		"doctor_id":   schedule.DoctorID,
		"schedule_id": schedule.ID,
	})

	return nil
}

// DeleteDoctorSchedule deletes a doctor's schedule
func (r *timeSlotRepository) DeleteDoctorSchedule(doctorID uint) error {
	result := r.db.Where("doctor_id = ?", doctorID).Delete(&models.DoctorSchedule{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete doctor schedule: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("doctor schedule not found")
	}

	utils.LogInfo("Doctor schedule deleted successfully", map[string]interface{}{
		"doctor_id": doctorID,
	})

	return nil
}

// Time Slot Management

// CreateTimeSlot creates a new time slot
func (r *timeSlotRepository) CreateTimeSlot(timeSlot *models.TimeSlot) error {
	if timeSlot == nil {
		return errors.New("time slot cannot be nil")
	}

	// Check for overlapping slots
	var count int64
	result := r.db.Model(&models.TimeSlot{}).
		Where("doctor_id = ? AND date = ? AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))",
			timeSlot.DoctorID, timeSlot.Date.Format("2006-01-02"),
			timeSlot.EndTime, timeSlot.StartTime, // Overlaps at start
			timeSlot.StartTime, timeSlot.EndTime, // Overlaps at end
			timeSlot.StartTime, timeSlot.EndTime). // Completely within
		Count(&count)

	if result.Error != nil {
		return fmt.Errorf("failed to check for overlapping slots: %w", result.Error)
	}

	if count > 0 {
		return errors.New("time slot overlaps with existing slot")
	}

	if err := r.db.Create(timeSlot).Error; err != nil {
		return fmt.Errorf("failed to create time slot: %w", err)
	}

	return nil
}

// GetTimeSlot retrieves a time slot by ID
func (r *timeSlotRepository) GetTimeSlot(id uint) (*models.TimeSlot, error) {
	var timeSlot models.TimeSlot
	result := r.db.Preload("Appointment").First(&timeSlot, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("time slot not found")
		}
		return nil, result.Error
	}

	return &timeSlot, nil
}

// UpdateTimeSlot updates a time slot
func (r *timeSlotRepository) UpdateTimeSlot(timeSlot *models.TimeSlot) error {
	if timeSlot == nil {
		return errors.New("time slot cannot be nil")
	}

	result := r.db.Save(timeSlot)
	if result.Error != nil {
		return fmt.Errorf("failed to update time slot: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("time slot not found")
	}

	return nil
}

// DeleteTimeSlot deletes a time slot
func (r *timeSlotRepository) DeleteTimeSlot(id uint) error {
	result := r.db.Delete(&models.TimeSlot{}, id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete time slot: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("time slot not found")
	}

	return nil
}

// Availability Management

// GenerateTimeSlots generates time slots for a doctor on a specific date based on their schedule
func (r *timeSlotRepository) GenerateTimeSlots(doctorID uint, date time.Time) error {
	// Get doctor's schedule
	schedule, err := r.GetDoctorSchedule(doctorID)
	if err != nil {
		return fmt.Errorf("failed to get doctor schedule: %w", err)
	}

	// Get day of week
	var workingHours models.WorkingHours
	switch date.Weekday() {
	case time.Monday:
		workingHours = schedule.Monday
	case time.Tuesday:
		workingHours = schedule.Tuesday
	case time.Wednesday:
		workingHours = schedule.Wednesday
	case time.Thursday:
		workingHours = schedule.Thursday
	case time.Friday:
		workingHours = schedule.Friday
	case time.Saturday:
		workingHours = schedule.Saturday
	case time.Sunday:
		workingHours = schedule.Sunday
	}

	// Check if doctor works on this day
	if workingHours.StartTime == "" || workingHours.EndTime == "" {
		return nil // Doctor doesn't work on this day
	}

	// Parse working hours
	startTime, err := time.Parse("15:04", workingHours.StartTime)
	if err != nil {
		return fmt.Errorf("invalid start time format: %w", err)
	}

	endTime, err := time.Parse("15:04", workingHours.EndTime)
	if err != nil {
		return fmt.Errorf("invalid end time format: %w", err)
	}

	// Create time slots
	currentTime := time.Date(date.Year(), date.Month(), date.Day(), startTime.Hour(), startTime.Minute(), 0, 0, date.Location())
	endOfDay := time.Date(date.Year(), date.Month(), date.Day(), endTime.Hour(), endTime.Minute(), 0, 0, date.Location())

	var timeSlots []models.TimeSlot
	for currentTime.Add(schedule.SlotDuration).Before(endOfDay) || currentTime.Add(schedule.SlotDuration).Equal(endOfDay) {
		slotEndTime := currentTime.Add(schedule.SlotDuration)

		timeSlot := models.TimeSlot{
			DoctorID:  doctorID,
			Date:      date,
			StartTime: currentTime,
			EndTime:   slotEndTime,
			Duration:  int(schedule.SlotDuration.Minutes()),
			Status:    models.SlotAvailable,
		}

		timeSlots = append(timeSlots, timeSlot)
		currentTime = slotEndTime
	}

	// Get doctor breaks for this date
	breaks, err := r.GetDoctorBreaks(doctorID, date)
	if err != nil {
		utils.LogError(err, "Failed to get doctor breaks", map[string]interface{}{
			"doctor_id": doctorID,
			"date":      date,
		})
	}

	// Mark slots during breaks as blocked
	for i := range timeSlots {
		for _, breakTime := range breaks {
			if timeSlots[i].StartTime.Before(breakTime.EndTime) && timeSlots[i].EndTime.After(breakTime.StartTime) {
				timeSlots[i].Status = models.SlotBlocked
				break
			}
		}
	}

	// Batch create time slots
	if len(timeSlots) > 0 {
		result := r.db.Create(&timeSlots)
		if result.Error != nil {
			return fmt.Errorf("failed to create time slots: %w", result.Error)
		}

		utils.LogInfo("Time slots generated successfully", map[string]interface{}{
			"doctor_id":   doctorID,
			"date":        date.Format("2006-01-02"),
			"slots_count": len(timeSlots),
		})
	}

	return nil
}

// GetAvailableSlots returns available time slots for a doctor on a specific date
func (r *timeSlotRepository) GetAvailableSlots(doctorID uint, date time.Time) ([]models.TimeSlot, error) {
	var timeSlots []models.TimeSlot

	result := r.db.Where("doctor_id = ? AND date = ? AND status = ?",
		doctorID, date.Format("2006-01-02"), models.SlotAvailable).
		Order("start_time ASC").
		Find(&timeSlots)

	if result.Error != nil {
		return nil, result.Error
	}

	return timeSlots, nil
}

// GetAvailableSlotsRange returns available time slots for a doctor within a date range
func (r *timeSlotRepository) GetAvailableSlotsRange(doctorID uint, startDate, endDate time.Time) (map[string][]models.TimeSlot, error) {
	var timeSlots []models.TimeSlot
	availabilityMap := make(map[string][]models.TimeSlot)

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

// CheckSlotAvailability checks if a time slot is available for booking
func (r *timeSlotRepository) CheckSlotAvailability(doctorID uint, startTime, endTime time.Time) (bool, error) {
	var count int64

	// Check for available slots that cover the requested time
	result := r.db.Model(&models.TimeSlot{}).
		Where("doctor_id = ? AND date = ? AND start_time <= ? AND end_time >= ? AND status = ?",
			doctorID, startTime.Format("2006-01-02"), startTime, endTime, models.SlotAvailable).
		Count(&count)

	if result.Error != nil {
		return false, result.Error
	}

	return count > 0, nil
}

// Break Management

// CreateDoctorBreak creates a new doctor break
func (r *timeSlotRepository) CreateDoctorBreak(doctorBreak *models.DoctorBreak) error {
	if doctorBreak == nil {
		return errors.New("doctorBreak cannot be nil")
	}

	if err := r.db.Create(doctorBreak).Error; err != nil {
		return fmt.Errorf("failed to create doctor break: %w", err)
	}

	utils.LogInfo("Doctor break created successfully", map[string]interface{}{
		"doctor_id": doctorBreak.DoctorID,
		"break_id":  doctorBreak.ID,
		"date":      doctorBreak.Date.Format("2006-01-02"),
	})

	return nil
}

// GetDoctorBreaks retrieves doctor breaks for a specific date
func (r *timeSlotRepository) GetDoctorBreaks(doctorID uint, date time.Time) ([]models.DoctorBreak, error) {
	var breaks []models.DoctorBreak

	result := r.db.Where("doctor_id = ? AND date = ?",
		doctorID, date.Format("2006-01-02")).
		Order("start_time ASC").
		Find(&breaks)

	if result.Error != nil {
		return nil, result.Error
	}

	return breaks, nil
}

// UpdateDoctorBreak updates a doctor break
func (r *timeSlotRepository) UpdateDoctorBreak(doctorBreak *models.DoctorBreak) error {
	if doctorBreak == nil {
		return errors.New("doctorBreak cannot be nil")
	}

	result := r.db.Save(doctorBreak)
	if result.Error != nil {
		return fmt.Errorf("failed to update doctor break: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("doctor break not found")
	}

	return nil
}

// DeleteDoctorBreak deletes a doctor break
func (r *timeSlotRepository) DeleteDoctorBreak(id uint) error {
	result := r.db.Delete(&models.DoctorBreak{}, id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete doctor break: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("doctor break not found")
	}

	return nil
}

// Bulk Operations

// GenerateWeeklySlots generates time slots for a doctor for the entire week starting from startDate
func (r *timeSlotRepository) GenerateWeeklySlots(doctorID uint, startDate time.Time) error {
	// Generate slots for 7 days
	for i := 0; i < 7; i++ {
		currentDate := startDate.AddDate(0, 0, i)
		if err := r.GenerateTimeSlots(doctorID, currentDate); err != nil {
			utils.LogError(err, "Failed to generate time slots for date", map[string]interface{}{
				"doctor_id": doctorID,
				"date":      currentDate.Format("2006-01-02"),
			})
			// Continue with other days even if one fails
		}
	}

	utils.LogInfo("Weekly time slots generation completed", map[string]interface{}{
		"doctor_id":  doctorID,
		"start_date": startDate.Format("2006-01-02"),
	})

	return nil
}

// BlockTimeSlots blocks time slots within a time range
func (r *timeSlotRepository) BlockTimeSlots(doctorID uint, startTime, endTime time.Time, reason string) error {
	result := r.db.Model(&models.TimeSlot{}).
		Where("doctor_id = ? AND start_time >= ? AND end_time <= ? AND status = ?",
			doctorID, startTime, endTime, models.SlotAvailable).
		Update("status", models.SlotBlocked)

	if result.Error != nil {
		return fmt.Errorf("failed to block time slots: %w", result.Error)
	}

	utils.LogInfo("Time slots blocked successfully", map[string]interface{}{
		"doctor_id":      doctorID,
		"start_time":     startTime,
		"end_time":       endTime,
		"reason":         reason,
		"affected_slots": result.RowsAffected,
	})

	return nil
}

// UnblockTimeSlots unblocks time slots within a time range
func (r *timeSlotRepository) UnblockTimeSlots(doctorID uint, startTime, endTime time.Time) error {
	result := r.db.Model(&models.TimeSlot{}).
		Where("doctor_id = ? AND start_time >= ? AND end_time <= ? AND status = ?",
			doctorID, startTime, endTime, models.SlotBlocked).
		Update("status", models.SlotAvailable)

	if result.Error != nil {
		return fmt.Errorf("failed to unblock time slots: %w", result.Error)
	}

	utils.LogInfo("Time slots unblocked successfully", map[string]interface{}{
		"doctor_id":      doctorID,
		"start_time":     startTime,
		"end_time":       endTime,
		"affected_slots": result.RowsAffected,
	})

	return nil
}
