package models

import (
	"time"

	"gorm.io/gorm"
)

// AppointmentStatus represents the status of an appointment
type AppointmentStatus string

const (
	StatusScheduled   AppointmentStatus = "SCHEDULED"
	StatusCompleted   AppointmentStatus = "COMPLETED"
	StatusCancelled   AppointmentStatus = "CANCELLED"
	StatusNoShow      AppointmentStatus = "NO_SHOW"
	StatusRescheduled AppointmentStatus = "RESCHEDULED"
	StatusConfirmed   AppointmentStatus = "CONFIRMED"
)

// AppointmentType represents the type of appointment
type AppointmentType string

const (
	TypeConsultation AppointmentType = "CONSULTATION"
	TypeFollowUp     AppointmentType = "FOLLOW_UP"
	TypeCheckup      AppointmentType = "CHECKUP"
	TypeEmergency    AppointmentType = "EMERGENCY"
)

// ReminderType represents the type of reminder
type ReminderType string

const (
	ReminderSMS   ReminderType = "SMS"
	ReminderEmail ReminderType = "EMAIL"
	ReminderPush  ReminderType = "PUSH"
)

// Appointment represents an appointment in the system
type Appointment struct {
	ID              uint              `json:"id" gorm:"primaryKey"`
	UserID          uint              `json:"user_id" gorm:"not null" validate:"required,min=1"`
	DoctorID        uint              `json:"doctor_id" gorm:"not null" validate:"required,min=1"`
	AppointmentTime time.Time         `json:"appointment_time" gorm:"not null" validate:"required"`
	EndTime         time.Time         `json:"end_time" gorm:"not null" validate:"required"`
	Duration        int               `json:"duration" gorm:"not null;default:30" validate:"required,min=15,max=180"` // Duration in minutes
	Status          AppointmentStatus `json:"status" gorm:"type:varchar(20);default:'SCHEDULED'" validate:"required"`
	Type            AppointmentType   `json:"type" gorm:"type:varchar(20);default:'CONSULTATION'" validate:"required"`
	Notes           string            `json:"notes" gorm:"type:text"`
	PatientNotes    string            `json:"patient_notes" gorm:"type:text"`
	DoctorNotes     string            `json:"doctor_notes" gorm:"type:text"`

	// Smart scheduling fields
	IsRecurring     bool   `json:"is_recurring" gorm:"default:false"`
	RecurrenceRule  string `json:"recurrence_rule" gorm:"type:varchar(100)"` // RRULE format
	ParentID        *uint  `json:"parent_id" gorm:"index"`                   // For recurring appointments
	RescheduledFrom *uint  `json:"rescheduled_from" gorm:"index"`            // Original appointment ID
	RescheduledTo   *uint  `json:"rescheduled_to" gorm:"index"`              // New appointment ID
	RescheduleCount int    `json:"reschedule_count" gorm:"default:0"`

	// Reminder settings
	ReminderEnabled bool         `json:"reminder_enabled" gorm:"default:true"`
	ReminderType    ReminderType `json:"reminder_type" gorm:"type:varchar(10);default:'SMS'"`
	ReminderTime    int          `json:"reminder_time" gorm:"default:60"` // Minutes before appointment
	ReminderSent    bool         `json:"reminder_sent" gorm:"default:false"`
	ReminderSentAt  *time.Time   `json:"reminder_sent_at"`

	// Confirmation
	ConfirmationRequired bool       `json:"confirmation_required" gorm:"default:false"`
	ConfirmedAt          *time.Time `json:"confirmed_at"`
	ConfirmedBy          string     `json:"confirmed_by" gorm:"type:varchar(20)"` // 'PATIENT' or 'DOCTOR'

	// Cancellation
	CancelledAt        *time.Time `json:"cancelled_at"`
	CancelledBy        string     `json:"cancelled_by" gorm:"type:varchar(20)"` // 'PATIENT' or 'DOCTOR'
	CancellationReason string     `json:"cancellation_reason" gorm:"type:text"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Doctor                     Doctor       `json:"doctor,omitempty" gorm:"foreignKey:DoctorID"`
	Parent                     *Appointment `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	RescheduledFromAppointment *Appointment `json:"rescheduled_from_appointment,omitempty" gorm:"foreignKey:RescheduledFrom"`
	RescheduledToAppointment   *Appointment `json:"rescheduled_to_appointment,omitempty" gorm:"foreignKey:RescheduledTo"`
}

// TableName specifies the table name for the Appointment model
func (Appointment) TableName() string {
	return "appointments"
}
