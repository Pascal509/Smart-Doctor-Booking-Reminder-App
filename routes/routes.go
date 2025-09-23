package routes

// import neccessary dependencies and modules
import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"smart-doctor-booking-app/handlers"
	"smart-doctor-booking-app/middleware"
	"smart-doctor-booking-app/repository"
	"smart-doctor-booking-app/services"
	"smart-doctor-booking-app/utils"
)

// SetupRoutes configures all application routes with scalability improvements
func SetupRoutes(db *gorm.DB) *gin.Engine {
	// Create Gin router with default middleware (logger and recovery)
	router := gin.Default()

	// Initialize logger (use the global Logger instance)
	logger := utils.Logger

	// Add response compression middleware
	compressionConfig := middleware.DefaultCompressionConfig()
	if os.Getenv("COMPRESSION_ENABLED") == "false" {
		compressionConfig.Enabled = false
	}
	router.Use(middleware.CompressionMiddleware(compressionConfig, logger))

	// Add rate limiting middleware
	rateLimitConfig := middleware.RateLimiterConfig{
		RequestsPerSecond: getEnvFloat("RATE_LIMIT_RPS", 30.0),
		BurstSize:         getEnvInt("RATE_LIMIT_BURST", 60),
		Enabled:           getEnvBool("RATE_LIMIT_ENABLED", true),
	}
	router.Use(middleware.RateLimitMiddleware(rateLimitConfig, logger))

	// Add CORS middleware for frontend integration
	router.Use(func(c *gin.Context) {
		// Get allowed origins from environment variable
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			// Default to localhost for development
			allowedOrigins = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"
		}

		origin := c.Request.Header.Get("Origin")
		origins := strings.Split(allowedOrigins, ",")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range origins {
			if strings.TrimSpace(allowedOrigin) == origin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"message": "Smart Doctor Booking API is running",
		})
	})

	// Initialize caching service
	cacheConfig := services.CacheConfig{
		RedisAddr:     getEnvString("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnvString("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),
		DefaultTTL:    getEnvDuration("CACHE_DEFAULT_TTL", "15m"),
	}
	cacheService := services.NewCacheService(cacheConfig, logger)

	// Initialize repositories
	doctorRepo := repository.NewDoctorRepository(db)
	appointmentRepo := repository.NewAppointmentRepository(db)
	timeSlotRepo := repository.NewTimeSlotRepository(db)

	// Initialize services
	notificationService := services.NewNotificationService()
	schedulingService := services.NewSchedulingService(appointmentRepo, timeSlotRepo, notificationService)

	// Initialize handlers with caching support
	doctorHandler := handlers.NewDoctorHandlerWithCache(doctorRepo, cacheService)
	authHandler := handlers.NewAuthHandler()
	appointmentHandler := handlers.NewAppointmentHandler(schedulingService)

	// API v1 routes
	v1 := router.Group("/api/v1")

	// Add advanced rate limiting for API routes
	v1.Use(middleware.AdvancedRateLimitMiddleware(logger))

	// Health check for cache service
	v1.GET("/cache/health", func(c *gin.Context) {
		ctx := c.Request.Context()
		if err := cacheService.HealthCheck(ctx); err != nil {
			c.JSON(500, gin.H{"status": "unhealthy", "cache": "disconnected", "error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "healthy", "cache": "connected"})
	})
	{
		// Authentication routes (public)
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)                                        // POST /api/v1/auth/login
			auth.GET("/validate", middleware.AuthMiddleware(), authHandler.ValidateToken) // GET /api/v1/auth/validate
			auth.POST("/logout", middleware.AuthMiddleware(), authHandler.Logout)         // POST /api/v1/auth/logout
		}

		// Doctor routes (protected)
		doctors := v1.Group("/doctors")
		doctors.Use(middleware.AuthMiddleware()) // Apply auth middleware to all doctor routes
		{
			doctors.POST("", doctorHandler.CreateDoctor)       // POST /api/v1/doctors
			doctors.GET("/:id", doctorHandler.GetDoctor)       // GET /api/v1/doctors/:id
			doctors.GET("", doctorHandler.GetAllDoctors)       // GET /api/v1/doctors
			doctors.PUT("/:id", doctorHandler.UpdateDoctor)    // PUT /api/v1/doctors/:id
			doctors.DELETE("/:id", doctorHandler.DeleteDoctor) // DELETE /api/v1/doctors/:id
		}

		// Appointment routes (protected)
		appointments := v1.Group("/appointments")
		appointments.Use(middleware.AuthMiddleware()) // Apply auth middleware to all appointment routes
		{
			// Core appointment management
			appointments.POST("/book", appointmentHandler.BookAppointment)                // POST /api/v1/appointments/book
			appointments.DELETE("/:id/cancel", appointmentHandler.CancelAppointment)      // DELETE /api/v1/appointments/:id/cancel
			appointments.PUT("/:id/reschedule", appointmentHandler.RescheduleAppointment) // PUT /api/v1/appointments/:id/reschedule

			// Availability and viewing
			appointments.GET("/availability", appointmentHandler.GetDoctorAvailability) // GET /api/v1/appointments/availability
			appointments.GET("/patient", appointmentHandler.GetPatientAppointments)     // GET /api/v1/appointments/patient
			appointments.GET("/upcoming", appointmentHandler.GetUpcomingAppointments)   // GET /api/v1/appointments/upcoming
			appointments.GET("/doctor/:id", appointmentHandler.GetDoctorAppointments)   // GET /api/v1/appointments/doctor/:id

			// Utility endpoints
			appointments.GET("/check-availability", appointmentHandler.CheckTimeSlotAvailability) // GET /api/v1/appointments/check-availability
		}
	}

	return router
}

// Helper functions for environment variable parsing
func getEnvString(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return fallback
}

func getEnvDuration(key, fallback string) time.Duration {
	value := getEnvString(key, fallback)
	if duration, err := time.ParseDuration(value); err == nil {
		return duration
	}
	// If parsing fails, parse the fallback
	if duration, err := time.ParseDuration(fallback); err == nil {
		return duration
	}
	// Default to 15 minutes if all else fails
	return 15 * time.Minute
}
