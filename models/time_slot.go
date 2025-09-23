package models

import (
	"time"

	"gorm.io/gorm"
)

// DayOfWeek represents days of the week
type DayOfWeek string

const (
	Monday    DayOfWeek = "MONDAY"
	Tuesday   DayOfWeek = "TUESDAY"
	Wednesday DayOfWeek = "WEDNESDAY"
	Thursday  DayOfWeek = "THURSDAY"
	Friday    DayOfWeek = "FRIDAY"
	Saturday  DayOfWeek = "SATURDAY"
	Sunday    DayOfWeek = "SUNDAY"
)

// SlotStatus represents the status of a time slot
type SlotStatus string

const (
	SlotAvailable SlotStatus = "AVAILABLE"
	SlotBooked    SlotStatus = "BOOKED"
	SlotBlocked   SlotStatus = "BLOCKED"
	SlotBreak     SlotStatus = "BREAK"
)

// WorkingHours defines the start and end time for a working day.
type WorkingHours struct {
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

// DoctorSchedule represents a doctor's weekly schedule template.
// This struct will be used to generate individual time slots.
type DoctorSchedule struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	DoctorID     uint           `json:"doctor_id" gorm:"not null;index" validate:"required,min=1"`
	SlotDuration time.Duration  `json:"slot_duration" gorm:"not null" validate:"required"`
	Monday       WorkingHours   `json:"monday"`
	Tuesday      WorkingHours   `json:"tuesday"`
	Wednesday    WorkingHours   `json:"wednesday"`
	Thursday     WorkingHours   `json:"thursday"`
	Friday       WorkingHours   `json:"friday"`
	Saturday     WorkingHours   `json:"saturday"`
	Sunday       WorkingHours   `json:"sunday"`
	IsActive     bool           `json:"is_active" gorm:"default:true"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`

	Doctor Doctor `json:"doctor,omitempty" gorm:"foreignKey:DoctorID"`
}

// TableName specifies the table name for the DoctorSchedule model
func (DoctorSchedule) TableName() string {
	return "doctor_schedules"
}

// TimeSlot represents individual time slots for appointments
type TimeSlot struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	DoctorID      uint           `json:"doctor_id" gorm:"not null;index" validate:"required,min=1"`
	Date          time.Time      `json:"date" gorm:"type:date;not null;index" validate:"required"`
	StartTime     time.Time      `json:"start_time" gorm:"not null" validate:"required"`
	EndTime       time.Time      `json:"end_time" gorm:"not null" validate:"required"`
	Duration      int            `json:"duration" gorm:"not null;default:30" validate:"required,min=15,max=180"` // Duration in minutes
	Status        SlotStatus     `json:"status" gorm:"type:varchar(20);default:'AVAILABLE'" validate:"required"`
	AppointmentID *uint          `json:"appointment_id" gorm:"index"` // Reference to booked appointment
	Notes         string         `json:"notes" gorm:"type:text"`
	IsRecurring   bool           `json:"is_recurring" gorm:"default:false"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Doctor      Doctor       `json:"doctor,omitempty" gorm:"foreignKey:DoctorID"`
	Appointment *Appointment `json:"appointment,omitempty" gorm:"foreignKey:AppointmentID"`
}

// TableName specifies the table name for the TimeSlot model
func (TimeSlot) TableName() string {
	return "time_slots"
}

// DoctorBreak represents breaks in a doctor's schedule
type DoctorBreak struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	DoctorID    uint           `json:"doctor_id" gorm:"not null;index" validate:"required,min=1"`
	Date        time.Time      `json:"date" gorm:"type:date;not null;index" validate:"required"`
	StartTime   time.Time      `json:"start_time" gorm:"not null" validate:"required"`
	EndTime     time.Time      `json:"end_time" gorm:"not null" validate:"required"`
	Reason      string         `json:"reason" gorm:"type:varchar(100)"`
	IsRecurring bool           `json:"is_recurring" gorm:"default:false"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Doctor Doctor `json:"doctor,omitempty" gorm:"foreignKey:DoctorID"`
}

// TableName specifies the table name for the DoctorBreak model
func (DoctorBreak) TableName() string {
	return "doctor_breaks"
}

// AvailabilityRequest represents a request for checking doctor availability
type AvailabilityRequest struct {
	DoctorID  uint      `json:"doctor_id" validate:"required,min=1"`
	Date      time.Time `json:"date" validate:"required"`
	StartDate time.Time `json:"start_date,omitempty"`
	EndDate   time.Time `json:"end_date,omitempty"`
	Duration  int       `json:"duration" validate:"required,min=15,max=180"`
}

// AvailabilityResponse represents the response for availability check
type AvailabilityResponse struct {
	DoctorID       uint       `json:"doctor_id"`
	Date           time.Time  `json:"date"`
	AvailableSlots []TimeSlot `json:"available_slots"`
	TotalSlots     int        `json:"total_slots"`
	BookedSlots    int        `json:"booked_slots"`
}
