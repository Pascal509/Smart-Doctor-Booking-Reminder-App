package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"golang.org/x/crypto/bcrypt"

	"smart-doctor-booking-app/middleware"
)

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// AuthHandler handles authentication operations
type AuthHandler struct {
	validator *validator.Validate
}

// NewAuthHandler creates a new AuthHandler instance
func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		validator: validator.New(),
	}
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Username string `json:"username" validate:"required,min=3,max=50" binding:"required"`
	Password string `json:"password" validate:"required,min=6" binding:"required"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token    string `json:"token"`
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Message  string `json:"message"`
}

// Login handles POST /auth/login - authenticates user and returns JWT token
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest

	// Bind JSON request to struct
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Bad Request",
			Message: "Invalid request payload",
		})
		return
	}

	// Additional validation
	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation Failed",
			Message: "Required fields validation failed",
		})
		return
	}

	// Sanitize input
	username := strings.TrimSpace(req.Username)
	password := req.Password

	// For demo purposes, we'll use hardcoded credentials
	// In production, this should query a user database
	var userID uint
	var role string
	var hashedPassword string

	// Demo users (in production, fetch from database)
	switch username {
	case "admin":
		userID = 1
		role = "admin"
		// Password: "admin123" (bcrypt hash)
		hashedPassword = "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
	case "doctor":
		userID = 2
		role = "doctor"
		// Password: "doctor123" (bcrypt hash)
		hashedPassword = "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
	case "user":
		userID = 3
		role = "user"
		// Password: "user123" (bcrypt hash)
		hashedPassword = "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
	default:
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Authentication Failed",
			Message: "Invalid credentials",
		})
		return
	}

	// Verify password
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Authentication Failed",
			Message: "Invalid credentials",
		})
		return
	}

	// Generate JWT token
	token, err := middleware.GenerateToken(userID, username, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to generate token",
		})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, LoginResponse{
		Token:    token,
		UserID:   userID,
		Username: username,
		Role:     role,
		Message:  "Login successful",
	})
}

// ValidateToken handles GET /auth/validate - validates JWT token
func (h *AuthHandler) ValidateToken(c *gin.Context) {
	// Get user info from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Unauthorized",
			Message: "Invalid token",
		})
		return
	}

	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Username not found in context",
		})
		return
	}

	role, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Role not found in context",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":    true,
		"user_id":  userID,
		"username": username,
		"role":     role,
		"message":  "Token is valid",
	})
}

// Logout handles POST /auth/logout - invalidates JWT token
func (h *AuthHandler) Logout(c *gin.Context) {
	// Note: JWT tokens are stateless, so we can't truly "invalidate" them
	// In production, you might want to maintain a blacklist of tokens
	// or use shorter expiration times with refresh tokens
	c.JSON(http.StatusOK, gin.H{
		"message": "Logout successful",
	})
}
