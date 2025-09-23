package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"golang.org/x/time/rate"
	// "smart-doctor-booking-app/utils"
)

// RateLimiterConfig holds rate limiting configuration
type RateLimiterConfig struct {
	RequestsPerSecond float64
	BurstSize         int
	Enabled           bool
}

// IPRateLimiter holds rate limiters for different IP addresses
type IPRateLimiter struct {
	limiters map[string]*rate.Limiter
	config   RateLimiterConfig
	logger   *logrus.Logger
	cleanup  chan string
}

// NewIPRateLimiter creates a new IP-based rate limiter
func NewIPRateLimiter(config RateLimiterConfig, logger *logrus.Logger) *IPRateLimiter {
	rl := &IPRateLimiter{
		limiters: make(map[string]*rate.Limiter),
		config:   config,
		logger:   logger,
		cleanup:  make(chan string, 100),
	}

	// Start cleanup goroutine to remove old limiters
	go rl.cleanupRoutine()

	return rl
}

// getLimiter returns the rate limiter for the given IP
func (rl *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	if limiter, exists := rl.limiters[ip]; exists {
		return limiter
	}

	// Create new limiter for this IP
	limiter := rate.NewLimiter(rate.Limit(rl.config.RequestsPerSecond), rl.config.BurstSize)
	rl.limiters[ip] = limiter

	// Schedule cleanup after 10 minutes of inactivity
	go func() {
		time.Sleep(10 * time.Minute)
		select {
		case rl.cleanup <- ip:
		default:
			// Channel is full, skip cleanup
		}
	}()

	return limiter
}

// cleanupRoutine removes inactive rate limiters
func (rl *IPRateLimiter) cleanupRoutine() {
	for ip := range rl.cleanup {
		delete(rl.limiters, ip)
		rl.logger.Debug("Cleaned up rate limiter", "ip", ip)
	}
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(config RateLimiterConfig, logger *logrus.Logger) gin.HandlerFunc {
	if !config.Enabled {
		// Return a no-op middleware if rate limiting is disabled
		return func(c *gin.Context) {
			c.Next()
		}
	}

	rateLimiter := NewIPRateLimiter(config, logger)

	return func(c *gin.Context) {
		// Get client IP
		clientIP := getClientIP(c)

		// Get rate limiter for this IP
		limiter := rateLimiter.getLimiter(clientIP)

		// Check if request is allowed
		if !limiter.Allow() {
			logger.Warn("Rate limit exceeded", "ip", clientIP, "path", c.Request.URL.Path)

			// Set rate limit headers
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%.0f", config.RequestsPerSecond))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Second).Unix(), 10))

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "Rate limit exceeded",
				"message": "Too many requests. Please try again later.",
				"code":    "RATE_LIMIT_EXCEEDED",
			})
			c.Abort()
			return
		}

		// Set rate limit headers for successful requests
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%.0f", config.RequestsPerSecond))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(int(limiter.Tokens())))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Second).Unix(), 10))

		logger.Debug("Request allowed", "ip", clientIP, "path", c.Request.URL.Path)
		c.Next()
	}
}

// getClientIP extracts the real client IP from the request
func getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header first (for load balancers/proxies)
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		if len(xff) > 0 {
			return xff
		}
	}

	// Check X-Real-IP header (for nginx proxy)
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	return c.ClientIP()
}

// AdvancedRateLimitMiddleware creates a more sophisticated rate limiter with different limits for different endpoints
func AdvancedRateLimitMiddleware(logger *logrus.Logger) gin.HandlerFunc {
	// Define different rate limits for different endpoint types
	configs := map[string]RateLimiterConfig{
		"auth":        {RequestsPerSecond: 5, BurstSize: 10, Enabled: true},  // Stricter for auth endpoints
		"appointment": {RequestsPerSecond: 10, BurstSize: 20, Enabled: true}, // Moderate for appointments
		"doctor":      {RequestsPerSecond: 20, BurstSize: 40, Enabled: true}, // More lenient for doctor info
		"default":     {RequestsPerSecond: 15, BurstSize: 30, Enabled: true}, // Default rate limit
	}

	// Create rate limiters for each endpoint type
	rateLimiters := make(map[string]*IPRateLimiter)
	for endpointType, config := range configs {
		rateLimiters[endpointType] = NewIPRateLimiter(config, logger)
	}

	return func(c *gin.Context) {
		// Determine endpoint type based on path
		endpointType := getEndpointType(c.Request.URL.Path)

		// Get appropriate rate limiter
		rateLimiter, exists := rateLimiters[endpointType]
		if !exists {
			rateLimiter = rateLimiters["default"]
		}

		// Get client IP and rate limiter
		clientIP := getClientIP(c)
		limiter := rateLimiter.getLimiter(clientIP)
		config := configs[endpointType]

		// Check if request is allowed
		if !limiter.Allow() {
			logger.Warn("Advanced rate limit exceeded",
				"ip", clientIP,
				"path", c.Request.URL.Path,
				"endpoint_type", endpointType)

			c.Header("X-RateLimit-Limit", fmt.Sprintf("%.0f", config.RequestsPerSecond))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Second).Unix(), 10))
			c.Header("X-RateLimit-Type", endpointType)

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "Rate limit exceeded",
				"message": fmt.Sprintf("Too many requests to %s endpoints. Please try again later.", endpointType),
				"code":    "RATE_LIMIT_EXCEEDED",
				"type":    endpointType,
			})
			c.Abort()
			return
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%.0f", config.RequestsPerSecond))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(int(limiter.Tokens())))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Second).Unix(), 10))
		c.Header("X-RateLimit-Type", endpointType)

		c.Next()
	}
}

// getEndpointType determines the endpoint type based on the request path
func getEndpointType(path string) string {
	switch {
	case contains(path, "/auth/"):
		return "auth"
	case contains(path, "/appointments"):
		return "appointment"
	case contains(path, "/doctors"):
		return "doctor"
	default:
		return "default"
	}
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
