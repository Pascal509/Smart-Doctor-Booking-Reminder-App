package utils

import (
	"fmt"
	"html"
	"regexp"
	"strings"
)

// InputSanitizer provides methods for sanitizing user inputs
type InputSanitizer struct {
	// SQL injection patterns to detect and remove
	sqlPatterns []*regexp.Regexp
	// XSS patterns to detect and remove
	xssPatterns []*regexp.Regexp
}

// NewInputSanitizer creates a new InputSanitizer instance
func NewInputSanitizer() *InputSanitizer {
	// Common SQL injection patterns
	sqlPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)`),
		regexp.MustCompile(`(?i)(--|#|/\*|\*/)`),
		regexp.MustCompile(`(?i)(or\s+1\s*=\s*1|and\s+1\s*=\s*1)`),
		regexp.MustCompile(`(?i)(\bor\b|\band\b)\s*['"]?\s*\w+\s*['"]?\s*=\s*['"]?\s*\w+`),
		regexp.MustCompile(`[';"\\]`),
	}

	// Common XSS patterns
	xssPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`),
		regexp.MustCompile(`(?i)<iframe[^>]*>.*?</iframe>`),
		regexp.MustCompile(`(?i)<object[^>]*>.*?</object>`),
		regexp.MustCompile(`(?i)<embed[^>]*>`),
		regexp.MustCompile(`(?i)javascript:`),
		regexp.MustCompile(`(?i)on\w+\s*=`),
	}

	return &InputSanitizer{
		sqlPatterns: sqlPatterns,
		xssPatterns: xssPatterns,
	}
}

// SanitizeString sanitizes a string input by removing potential SQL injection and XSS attacks
func (s *InputSanitizer) SanitizeString(input string) string {
	if input == "" {
		return input
	}

	// Trim whitespace
	sanitized := strings.TrimSpace(input)

	// HTML escape to prevent XSS
	sanitized = html.EscapeString(sanitized)

	// Remove SQL injection patterns
	for _, pattern := range s.sqlPatterns {
		sanitized = pattern.ReplaceAllString(sanitized, "")
	}

	// Remove XSS patterns (after HTML escaping for double protection)
	for _, pattern := range s.xssPatterns {
		sanitized = pattern.ReplaceAllString(sanitized, "")
	}

	// Remove null bytes and control characters
	sanitized = strings.ReplaceAll(sanitized, "\x00", "")
	sanitized = regexp.MustCompile(`[\x00-\x1F\x7F]`).ReplaceAllString(sanitized, "")

	// Limit length to prevent buffer overflow attacks
	if len(sanitized) > 1000 {
		sanitized = sanitized[:1000]
	}

	return sanitized
}

// SanitizeName specifically sanitizes name fields (doctors, patients, etc.)
func (s *InputSanitizer) SanitizeName(name string) string {
	sanitized := s.SanitizeString(name)

	// Allow only letters, spaces, hyphens, and apostrophes for names
	namePattern := regexp.MustCompile(`[^a-zA-Z\s\-'.]`)
	sanitized = namePattern.ReplaceAllString(sanitized, "")

	// Remove multiple consecutive spaces
	spacePattern := regexp.MustCompile(`\s+`)
	sanitized = spacePattern.ReplaceAllString(sanitized, " ")

	// Trim and ensure reasonable length for names
	sanitized = strings.TrimSpace(sanitized)
	if len(sanitized) > 255 {
		sanitized = sanitized[:255]
	}

	return sanitized
}

// ValidateInput performs validation checks on sanitized input
func (s *InputSanitizer) ValidateInput(input string, fieldName string) error {
	if input == "" {
		return nil // Empty validation should be handled by struct validation
	}

	// Check for suspicious patterns that might indicate injection attempts
	for _, pattern := range s.sqlPatterns {
		if pattern.MatchString(input) {
			return fmt.Errorf("%s contains potentially malicious content", fieldName)
		}
	}

	for _, pattern := range s.xssPatterns {
		if pattern.MatchString(input) {
			return fmt.Errorf("%s contains potentially malicious content", fieldName)
		}
	}

	return nil
}

// Global sanitizer instance
var defaultSanitizer = NewInputSanitizer()

// SanitizeString is a convenience function using the default sanitizer
func SanitizeString(input string) string {
	return defaultSanitizer.SanitizeString(input)
}

// SanitizeName is a convenience function using the default sanitizer
func SanitizeName(name string) string {
	return defaultSanitizer.SanitizeName(name)
}

// ValidateInput is a convenience function using the default sanitizer
func ValidateInput(input string, fieldName string) error {
	return defaultSanitizer.ValidateInput(input, fieldName)
}