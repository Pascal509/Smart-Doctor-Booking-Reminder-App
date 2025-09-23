package models

import (
	"time"

	"gorm.io/gorm"
)

// Specialty represents a medical specialty
type Specialty struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"not null;size:255;uniqueIndex" validate:"required,min=2,max=255"`
	Description string         `json:"description" gorm:"type:text"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Doctors []Doctor `json:"doctors,omitempty" gorm:"foreignKey:SpecialtyID"`
}

// TableName specifies the table name for the Specialty model
func (Specialty) TableName() string {
	return "specialties"
}