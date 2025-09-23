package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// AIService handles communication with the external Python AI service
type AIService struct {
	client  *http.Client
	baseURL string
}

// NewAIService creates a new AIService instance
func NewAIService(baseURL string) *AIService {
	return &AIService{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL: baseURL,
	}
}

// SymptomRequest represents the request payload for symptom classification
type SymptomRequest struct {
	Symptom string `json:"symptom"`
}

// ClassificationResponse represents the response from the AI service
type ClassificationResponse struct {
	SpecialtyID int     `json:"specialty_id"`
	Confidence  float64 `json:"confidence,omitempty"`
	Message     string  `json:"message,omitempty"`
}

// ErrorResponse represents an error response from the AI service
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// SuggestSpecialty makes a POST request to the external Python AI service
// to classify a symptom and return the recommended specialty_id
func (s *AIService) SuggestSpecialty(symptom string) (int, error) {
	if symptom == "" {
		return 0, fmt.Errorf("symptom cannot be empty")
	}

	// Prepare request payload
	reqPayload := SymptomRequest{
		Symptom: symptom,
	}

	// Marshal request to JSON
	jsonData, err := json.Marshal(reqPayload)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	url := fmt.Sprintf("%s/api/classify", s.baseURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	// Make the request
	resp, err := s.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to make request to AI service: %w", err)
	}

	// Ensure response body is always closed, even in error scenarios
	defer func() {
		if resp != nil && resp.Body != nil {
			if closeErr := resp.Body.Close(); closeErr != nil {
				// Log the close error but don't override the main error
				fmt.Printf("Warning: failed to close response body: %v\n", closeErr)
			}
		}
	}()

	// Read response body with proper error handling
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read response body: %w", err)
	}

	// Handle non-200 status codes
	if resp.StatusCode != http.StatusOK {
		var errorResp ErrorResponse
		if err := json.Unmarshal(body, &errorResp); err != nil {
			return 0, fmt.Errorf("AI service returned status %d: %s", resp.StatusCode, string(body))
		}
		return 0, fmt.Errorf("AI service error (%d): %s - %s", resp.StatusCode, errorResp.Error, errorResp.Message)
	}

	// Parse successful response
	var classificationResp ClassificationResponse
	if err := json.Unmarshal(body, &classificationResp); err != nil {
		return 0, fmt.Errorf("failed to parse response: %w", err)
	}

	// Validate specialty_id
	if classificationResp.SpecialtyID <= 0 {
		return 0, fmt.Errorf("invalid specialty_id received: %d", classificationResp.SpecialtyID)
	}

	return classificationResp.SpecialtyID, nil
}

// SuggestSpecialty is a convenience function that creates a default AIService
// and calls SuggestSpecialty with the default Python AI service URL
func SuggestSpecialty(symptom string) (int, error) {
	aiService := NewAIService("http://localhost:5000")
	return aiService.SuggestSpecialty(symptom)
}
