package utils

import (
	"os"
	"strings"

	"github.com/sirupsen/logrus"
)

// Logger is the global logger instance
var Logger *logrus.Logger

// InitLogger initializes the global logger with configuration
func InitLogger() {
	Logger = logrus.New()

	// Set log level based on environment
	logLevel := strings.ToLower(os.Getenv("LOG_LEVEL"))
	switch logLevel {
	case "debug":
		Logger.SetLevel(logrus.DebugLevel)
	case "info":
		Logger.SetLevel(logrus.InfoLevel)
	case "warn", "warning":
		Logger.SetLevel(logrus.WarnLevel)
	case "error":
		Logger.SetLevel(logrus.ErrorLevel)
	case "fatal":
		Logger.SetLevel(logrus.FatalLevel)
	case "panic":
		Logger.SetLevel(logrus.PanicLevel)
	default:
		Logger.SetLevel(logrus.InfoLevel) // Default to info level
	}

	// Set formatter based on environment
	env := strings.ToLower(os.Getenv("ENVIRONMENT"))
	if env == "production" || env == "prod" {
		// Use JSON formatter for production
		Logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "timestamp",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
			},
		})
	} else {
		// Use text formatter for development
		Logger.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "2006-01-02 15:04:05",
			ForceColors:     true,
		})
	}

	// Set output to stdout
	Logger.SetOutput(os.Stdout)

	// Add default fields
	Logger = Logger.WithFields(logrus.Fields{
		"service": "smart-doctor-booking",
		"version": "1.0.0",
	}).Logger
}

// LogError logs an error with context
func LogError(err error, message string, fields logrus.Fields) {
	if Logger == nil {
		InitLogger()
	}

	entry := Logger.WithError(err)
	if fields != nil {
		entry = entry.WithFields(fields)
	}
	entry.Error(message)
}

// LogInfo logs an info message with context
func LogInfo(message string, fields logrus.Fields) {
	if Logger == nil {
		InitLogger()
	}

	if fields != nil {
		Logger.WithFields(fields).Info(message)
	} else {
		Logger.Info(message)
	}
}

// LogWarn logs a warning message with context
func LogWarn(message string, fields logrus.Fields) {
	if Logger == nil {
		InitLogger()
	}

	if fields != nil {
		Logger.WithFields(fields).Warn(message)
	} else {
		Logger.Warn(message)
	}
}

// LogDebug logs a debug message with context
func LogDebug(message string, fields logrus.Fields) {
	if Logger == nil {
		InitLogger()
	}

	if fields != nil {
		Logger.WithFields(fields).Debug(message)
	} else {
		Logger.Debug(message)
	}
}

// LogFatal logs a fatal message and exits
func LogFatal(err error, message string, fields logrus.Fields) {
	if Logger == nil {
		InitLogger()
	}

	entry := Logger.WithError(err)
	if fields != nil {
		entry = entry.WithFields(fields)
	}
	entry.Fatal(message)
}

// LogHTTPRequest logs HTTP request details
func LogHTTPRequest(method, path, userAgent, clientIP string, statusCode int, duration int64) {
	if Logger == nil {
		InitLogger()
	}

	fields := logrus.Fields{
		"method":      method,
		"path":        path,
		"user_agent":  userAgent,
		"client_ip":   clientIP,
		"status_code": statusCode,
		"duration_ms": duration,
		"type":        "http_request",
	}

	if statusCode >= 400 {
		Logger.WithFields(fields).Warn("HTTP request completed with error")
	} else {
		Logger.WithFields(fields).Info("HTTP request completed")
	}
}

// LogDatabaseOperation logs database operation details
func LogDatabaseOperation(operation, table string, duration int64, err error) {
	if Logger == nil {
		InitLogger()
	}

	fields := logrus.Fields{
		"operation":   operation,
		"table":       table,
		"duration_ms": duration,
		"type":        "database_operation",
	}

	if err != nil {
		Logger.WithFields(fields).WithError(err).Error("Database operation failed")
	} else {
		Logger.WithFields(fields).Debug("Database operation completed")
	}
}

// LogSecurityEvent logs security-related events
func LogSecurityEvent(event, userID, clientIP, details string) {
	if Logger == nil {
		InitLogger()
	}

	fields := logrus.Fields{
		"event":     event,
		"user_id":   userID,
		"client_ip": clientIP,
		"details":   details,
		"type":      "security_event",
	}

	Logger.WithFields(fields).Warn("Security event detected")
}
