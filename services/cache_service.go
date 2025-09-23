package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"smart-doctor-booking-app/models"
	// "smart-doctor-booking-app/utils"
)

// CacheService interface defines caching operations
type CacheService interface {
	// Generic cache operations
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Get(ctx context.Context, key string, dest interface{}) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) bool
	Flush(ctx context.Context) error

	// Specialized cache operations for common entities
	SetSpecialties(ctx context.Context, specialties []models.Specialty) error
	GetSpecialties(ctx context.Context) ([]models.Specialty, error)
	SetDoctor(ctx context.Context, doctor *models.Doctor) error
	GetDoctor(ctx context.Context, doctorID uint) (*models.Doctor, error)
	SetDoctorsBySpecialty(ctx context.Context, specialtyID uint, doctors []models.Doctor) error
	GetDoctorsBySpecialty(ctx context.Context, specialtyID uint) ([]models.Doctor, error)
	InvalidateDoctorCache(ctx context.Context, doctorID uint) error

	// Health check
	HealthCheck(ctx context.Context) error
}

// cacheService implements CacheService interface
type cacheService struct {
	redisClient *redis.Client
	logger      *logrus.Logger
	defaultTTL  time.Duration
}

// CacheConfig holds cache configuration
type CacheConfig struct {
	RedisAddr     string
	RedisPassword string
	RedisDB       int
	DefaultTTL    time.Duration
}

// NewCacheService creates a new cache service instance
func NewCacheService(config CacheConfig, logger *logrus.Logger) CacheService {
	rdb := redis.NewClient(&redis.Options{
		Addr:     config.RedisAddr,
		Password: config.RedisPassword,
		DB:       config.RedisDB,
	})

	return &cacheService{
		redisClient: rdb,
		logger:      logger,
		defaultTTL:  config.DefaultTTL,
	}
}

// Set stores a value in cache with expiration
func (c *cacheService) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		c.logger.Error("Failed to marshal cache value", "key", key, "error", err)
		return fmt.Errorf("failed to marshal cache value: %w", err)
	}

	err = c.redisClient.Set(ctx, key, data, expiration).Err()
	if err != nil {
		c.logger.Error("Failed to set cache value", "key", key, "error", err)
		return fmt.Errorf("failed to set cache value: %w", err)
	}

	c.logger.Debug("Cache value set successfully", "key", key, "expiration", expiration)
	return nil
}

// Get retrieves a value from cache
func (c *cacheService) Get(ctx context.Context, key string, dest interface{}) error {
	data, err := c.redisClient.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			c.logger.Debug("Cache miss", "key", key)
			return fmt.Errorf("cache miss for key: %s", key)
		}
		c.logger.Error("Failed to get cache value", "key", key, "error", err)
		return fmt.Errorf("failed to get cache value: %w", err)
	}

	err = json.Unmarshal([]byte(data), dest)
	if err != nil {
		c.logger.Error("Failed to unmarshal cache value", "key", key, "error", err)
		return fmt.Errorf("failed to unmarshal cache value: %w", err)
	}

	c.logger.Debug("Cache hit", "key", key)
	return nil
}

// Delete removes a value from cache
func (c *cacheService) Delete(ctx context.Context, key string) error {
	err := c.redisClient.Del(ctx, key).Err()
	if err != nil {
		c.logger.Error("Failed to delete cache value", "key", key, "error", err)
		return fmt.Errorf("failed to delete cache value: %w", err)
	}

	c.logger.Debug("Cache value deleted", "key", key)
	return nil
}

// Exists checks if a key exists in cache
func (c *cacheService) Exists(ctx context.Context, key string) bool {
	result, err := c.redisClient.Exists(ctx, key).Result()
	if err != nil {
		c.logger.Error("Failed to check cache key existence", "key", key, "error", err)
		return false
	}
	return result > 0
}

// Flush clears all cache entries
func (c *cacheService) Flush(ctx context.Context) error {
	err := c.redisClient.FlushDB(ctx).Err()
	if err != nil {
		c.logger.Error("Failed to flush cache", "error", err)
		return fmt.Errorf("failed to flush cache: %w", err)
	}

	c.logger.Info("Cache flushed successfully")
	return nil
}

// SetSpecialties caches all specialties
func (c *cacheService) SetSpecialties(ctx context.Context, specialties []models.Specialty) error {
	key := "specialties:all"
	return c.Set(ctx, key, specialties, c.defaultTTL)
}

// GetSpecialties retrieves cached specialties
func (c *cacheService) GetSpecialties(ctx context.Context) ([]models.Specialty, error) {
	key := "specialties:all"
	var specialties []models.Specialty
	err := c.Get(ctx, key, &specialties)
	if err != nil {
		return nil, err
	}
	return specialties, nil
}

// SetDoctor caches a doctor profile
func (c *cacheService) SetDoctor(ctx context.Context, doctor *models.Doctor) error {
	key := fmt.Sprintf("doctor:%d", doctor.ID)
	return c.Set(ctx, key, doctor, c.defaultTTL)
}

// GetDoctor retrieves a cached doctor profile
func (c *cacheService) GetDoctor(ctx context.Context, doctorID uint) (*models.Doctor, error) {
	key := fmt.Sprintf("doctor:%d", doctorID)
	var doctor models.Doctor
	err := c.Get(ctx, key, &doctor)
	if err != nil {
		return nil, err
	}
	return &doctor, nil
}

// SetDoctorsBySpecialty caches doctors by specialty
func (c *cacheService) SetDoctorsBySpecialty(ctx context.Context, specialtyID uint, doctors []models.Doctor) error {
	key := fmt.Sprintf("doctors:specialty:%d", specialtyID)
	return c.Set(ctx, key, doctors, c.defaultTTL)
}

// GetDoctorsBySpecialty retrieves cached doctors by specialty
func (c *cacheService) GetDoctorsBySpecialty(ctx context.Context, specialtyID uint) ([]models.Doctor, error) {
	key := fmt.Sprintf("doctors:specialty:%d", specialtyID)
	var doctors []models.Doctor
	err := c.Get(ctx, key, &doctors)
	if err != nil {
		return nil, err
	}
	return doctors, nil
}

// InvalidateDoctorCache removes doctor-related cache entries
func (c *cacheService) InvalidateDoctorCache(ctx context.Context, doctorID uint) error {
	// Delete individual doctor cache
	doctorKey := fmt.Sprintf("doctor:%d", doctorID)
	err := c.Delete(ctx, doctorKey)
	if err != nil {
		c.logger.Error("Failed to invalidate doctor cache", "doctorID", doctorID, "error", err)
	}

	// Delete specialty-based doctor lists (we'd need to know the specialty)
	// For now, we'll use a pattern-based deletion for all specialty caches
	pattern := "doctors:specialty:*"
	keys, err := c.redisClient.Keys(ctx, pattern).Result()
	if err != nil {
		c.logger.Error("Failed to get specialty cache keys", "error", err)
		return err
	}

	if len(keys) > 0 {
		err = c.redisClient.Del(ctx, keys...).Err()
		if err != nil {
			c.logger.Error("Failed to delete specialty cache keys", "error", err)
			return err
		}
	}

	c.logger.Info("Doctor cache invalidated", "doctorID", doctorID)
	return nil
}

// HealthCheck verifies Redis connection
func (c *cacheService) HealthCheck(ctx context.Context) error {
	_, err := c.redisClient.Ping(ctx).Result()
	if err != nil {
		c.logger.Error("Redis health check failed", "error", err)
		return fmt.Errorf("redis health check failed: %w", err)
	}
	return nil
}
