package main

import (
	"os"

	"smart-doctor-booking-app/config"
	"smart-doctor-booking-app/routes"
	"smart-doctor-booking-app/utils"

	"github.com/sirupsen/logrus"
)

func main() {
	// Initialize structured logger
	utils.InitLogger()

	utils.LogInfo("Initializing Smart Doctor Booking API", logrus.Fields{
		"component": "main",
	})

	// Connect to database
	db, err := config.ConnectDatabase()
	if err != nil {
		utils.LogFatal(err, "Failed to connect to database", logrus.Fields{
			"component": "main",
			"operation": "database_connection",
		})
	}

	utils.LogInfo("Database connection established successfully", logrus.Fields{
		"component": "main",
		"operation": "database_connection",
	})

	// Setup routes
	router := routes.SetupRoutes(db.DB)

	// Get port from environment variable or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	utils.LogInfo("Starting Smart Doctor Booking API server", logrus.Fields{
		"component":        "main",
		"port":             port,
		"health_check_url": "http://localhost:" + port + "/health",
		"api_base_url":     "http://localhost:" + port + "/api/v1",
	})

	// Start server
	if err := router.Run(":" + port); err != nil {
		utils.LogFatal(err, "Failed to start server", logrus.Fields{
			"component": "main",
			"port":      port,
		})
	}
}
