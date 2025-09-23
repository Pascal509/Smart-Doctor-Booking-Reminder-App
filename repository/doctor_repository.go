package repository

import (
	"errors"
	"fmt"

	"gorm.io/gorm"

	"smart-doctor-booking-app/models"
)

// PaginationParams represents pagination parameters
type PaginationParams struct {
	Limit  int
	Offset int
}

// PaginatedResult represents a paginated result
type PaginatedResult struct {
	Data        []models.Doctor `json:"data"`
	Total       int64           `json:"total"`
	Limit       int             `json:"limit"`
	Offset      int             `json:"offset"`
	TotalPages  int             `json:"total_pages"`
	CurrentPage int             `json:"current_page"`
}

// DoctorRepository interface defines the contract for doctor data operations
type DoctorRepository interface {
	CreateDoctor(doctor *models.Doctor) error
	GetDoctorByID(id uint) (*models.Doctor, error)
	GetAllDoctors() ([]models.Doctor, error)
	GetAllDoctorsPaginated(params PaginationParams) (*PaginatedResult, error)
	UpdateDoctor(doctor *models.Doctor) error
	DeleteDoctor(id uint) error
}

// doctorRepository implements DoctorRepository interface
type doctorRepository struct {
	db *gorm.DB
}

// NewDoctorRepository creates a new instance of DoctorRepository
func NewDoctorRepository(db *gorm.DB) DoctorRepository {
	return &doctorRepository{
		db: db,
	}
}

// CreateDoctor saves doctor to database after checking specialty exists
// Uses database transaction to ensure atomicity
func (r *doctorRepository) CreateDoctor(doctor *models.Doctor) error {
	if doctor == nil {
		return errors.New("doctor cannot be nil")
	}

	// Use transaction to ensure atomicity
	tx := r.db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to begin transaction: %w", tx.Error)
	}

	// Ensure transaction is rolled back on error
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			// Log the panic instead of re-panicking
			fmt.Printf("Panic in CreateDoctor transaction: %v\n", r)
		}
	}()

	// Check if specialty exists within transaction
	var specialty models.Specialty
	if err := tx.First(&specialty, doctor.SpecialtyID).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("specialty not found")
		}
		return fmt.Errorf("failed to verify specialty: %w", err)
	}

	// Save doctor to database within transaction
	if err := tx.Create(doctor).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to create doctor: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetDoctorByID retrieves a doctor by ID
func (r *doctorRepository) GetDoctorByID(id uint) (*models.Doctor, error) {
	var doctor models.Doctor
	if err := r.db.Preload("Specialty").First(&doctor, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("doctor not found")
		}
		return nil, fmt.Errorf("failed to get doctor: %w", err)
	}
	return &doctor, nil
}

// GetAllDoctors retrieves all doctors (kept for backward compatibility)
func (r *doctorRepository) GetAllDoctors() ([]models.Doctor, error) {
	var doctors []models.Doctor
	if err := r.db.Preload("Specialty").Find(&doctors).Error; err != nil {
		return nil, fmt.Errorf("failed to get doctors: %w", err)
	}
	return doctors, nil
}

// GetAllDoctorsPaginated retrieves doctors with pagination
func (r *doctorRepository) GetAllDoctorsPaginated(params PaginationParams) (*PaginatedResult, error) {
	// Set default values if not provided
	if params.Limit <= 0 {
		params.Limit = 10 // Default limit
	}
	if params.Limit > 100 {
		params.Limit = 100 // Maximum limit to prevent abuse
	}
	if params.Offset < 0 {
		params.Offset = 0
	}

	// Get total count
	var total int64
	if err := r.db.Model(&models.Doctor{}).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count doctors: %w", err)
	}

	// Get paginated doctors
	var doctors []models.Doctor
	if err := r.db.Preload("Specialty").
		Limit(params.Limit).
		Offset(params.Offset).
		Find(&doctors).Error; err != nil {
		return nil, fmt.Errorf("failed to get doctors: %w", err)
	}

	// Calculate pagination metadata
	totalPages := int((total + int64(params.Limit) - 1) / int64(params.Limit))
	currentPage := (params.Offset / params.Limit) + 1

	return &PaginatedResult{
		Data:        doctors,
		Total:       total,
		Limit:       params.Limit,
		Offset:      params.Offset,
		TotalPages:  totalPages,
		CurrentPage: currentPage,
	}, nil
}

// UpdateDoctor updates an existing doctor
// Uses database transaction to ensure atomicity
func (r *doctorRepository) UpdateDoctor(doctor *models.Doctor) error {
	if doctor == nil {
		return errors.New("doctor cannot be nil")
	}

	// Use transaction to ensure atomicity
	tx := r.db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to begin transaction: %w", tx.Error)
	}

	// Ensure transaction is rolled back on error
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			// Log the panic instead of re-panicking
			fmt.Printf("Panic in UpdateDoctor transaction: %v\n", r)
		}
	}()

	// Check if doctor exists before updating
	var existingDoctor models.Doctor
	if err := tx.First(&existingDoctor, doctor.ID).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("doctor not found")
		}
		return fmt.Errorf("failed to find doctor: %w", err)
	}

	// If specialty is being updated, verify it exists
	if doctor.SpecialtyID != existingDoctor.SpecialtyID {
		var specialty models.Specialty
		if err := tx.First(&specialty, doctor.SpecialtyID).Error; err != nil {
			tx.Rollback()
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("specialty not found")
			}
			return fmt.Errorf("failed to verify specialty: %w", err)
		}
	}

	// Update doctor within transaction
	if err := tx.Save(doctor).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update doctor: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// DeleteDoctor soft deletes a doctor by ID
func (r *doctorRepository) DeleteDoctor(id uint) error {
	if err := r.db.Delete(&models.Doctor{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete doctor: %w", err)
	}
	return nil
}
