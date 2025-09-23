package models

import (
	"time"

	"gorm.io/gorm"
)

// Doctor represents a doctor in the system
type Doctor struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"not null;size:255" validate:"required,min=2,max=255"`
	SpecialtyID uint           `json:"specialty_id" gorm:"not null" validate:"required,min=1"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Specialty Specialty `json:"specialty,omitempty" gorm:"foreignKey:SpecialtyID"`
}

// TableName specifies the table name for the Doctor model
func (Doctor) TableName() string {
	return "doctors"
}
