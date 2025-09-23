package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"smart-doctor-booking-app/models"
)

// Database holds the database connection
type Database struct {
	DB *gorm.DB
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// GetDatabaseConfig returns database configuration from environment variables
func GetDatabaseConfig() *DatabaseConfig {
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		log.Fatal("DB_PASSWORD environment variable is required")
	}

	// Parse connection pool settings
	maxOpenConns := getEnvInt("DB_MAX_OPEN_CONNS", 25)
	maxIdleConns := getEnvInt("DB_MAX_IDLE_CONNS", 5)
	connMaxLifetime := getEnvDuration("DB_CONN_MAX_LIFETIME", "5m")
	connMaxIdleTime := getEnvDuration("DB_CONN_MAX_IDLE_TIME", "5m")

	return &DatabaseConfig{
		Host:            getEnv("DB_HOST", "localhost"),
		Port:            getEnv("DB_PORT", "5432"),
		User:            getEnv("DB_USER", "postgres"),
		Password:        password,
		DBName:          getEnv("DB_NAME", "smart_doctor_booking"),
		SSLMode:         getEnv("DB_SSLMODE", "disable"),
		MaxOpenConns:    maxOpenConns,
		MaxIdleConns:    maxIdleConns,
		ConnMaxLifetime: connMaxLifetime,
		ConnMaxIdleTime: connMaxIdleTime,
	}
}

// ConnectDatabase establishes database connection with connection pooling
func ConnectDatabase() (*Database, error) {
	config := GetDatabaseConfig()

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		config.Host, config.User, config.Password, config.DBName, config.Port, config.SSLMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Set connection pool parameters
	sqlDB.SetMaxOpenConns(config.MaxOpenConns)
	sqlDB.SetMaxIdleConns(config.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(config.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(config.ConnMaxIdleTime)

	// Auto migrate the schema
	err = db.AutoMigrate(&models.Specialty{}, &models.Doctor{}, &models.Appointment{})
	if err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	// Create database indexes for performance optimization
	err = createDatabaseIndexes(db)
	if err != nil {
		return nil, fmt.Errorf("failed to create database indexes: %w", err)
	}

	log.Println("Database connected, migrated, and optimized successfully")

	return &Database{DB: db}, nil
}

// getEnv gets environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// getEnvInt gets environment variable as integer with fallback
func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return fallback
}

// getEnvDuration gets environment variable as duration with fallback
func getEnvDuration(key, fallback string) time.Duration {
	value := getEnv(key, fallback)
	if duration, err := time.ParseDuration(value); err == nil {
		return duration
	}
	// If parsing fails, parse the fallback
	if duration, err := time.ParseDuration(fallback); err == nil {
		return duration
	}
	// Default to 5 minutes if all else fails
	return 5 * time.Minute
}

// createDatabaseIndexes creates performance indexes on frequently queried fields
func createDatabaseIndexes(db *gorm.DB) error {
	// Appointments table indexes
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);",
		"CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_appointments_appointment_time ON appointments(appointment_time);",
		"CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);",
		"CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(type);",
		"CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);",
		"CREATE INDEX IF NOT EXISTS idx_appointments_doctor_time ON appointments(doctor_id, appointment_time);",
		"CREATE INDEX IF NOT EXISTS idx_appointments_user_status ON appointments(user_id, status);",
		"CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status ON appointments(doctor_id, status);",
		"CREATE INDEX IF NOT EXISTS idx_appointments_date_range ON appointments(appointment_time, end_time);",

		// Doctors table indexes
		"CREATE INDEX IF NOT EXISTS idx_doctors_specialty_id ON doctors(specialty_id);",
		"CREATE INDEX IF NOT EXISTS idx_doctors_is_active ON doctors(is_active);",
		"CREATE INDEX IF NOT EXISTS idx_doctors_specialty_active ON doctors(specialty_id, is_active);",

		// Specialties table indexes
		"CREATE INDEX IF NOT EXISTS idx_specialties_name ON specialties(name);",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create index: %s - %v", indexSQL, err)
			// Continue with other indexes even if one fails
		}
	}

	log.Println("Database indexes created successfully")
	return nil
}
