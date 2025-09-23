Smart Doctor-Booking & Reminder App: Capstone Project

🔖 Project Title & Description
The Smart Doctor-Booking & Reminder App is a high-performance platform designed to revolutionize how patients find specialists and manage their appointments.

Core Problem: Inefficiency in appointment scheduling, patient drop-off due to difficulty finding the right specialist, and high no-show rates.

Solution: We are building a robust, high-concurrency backend (Golang) and a modern frontend (React) connected by a core AI-powered symptom-to-specialist classifier. The app provides smart doctor suggestions and multi-channel reminders (SMS/Email) to maximize booking efficiency and patient compliance.

Target Audience: Mid-to-large medical clinics and hospitals seeking to digitize and optimize their patient intake and scheduling processes.

🛠️ Tech Stack
This project leverages a performant, scalable stack, integrating Python specifically for the AI/ML layer.

Component	Technology	Rationale
Frontend	React (Vite) / Tailwind CSS	Fast development, component-based UI, and modern styling.
Backend (API)	Golang (Gin or Echo Framework)	High performance, excellent concurrency, and small binary size for a reliable API.
AI/ML Layer	Python (Scikit-learn)	Dedicated service for the lightweight symptom classification model.
Database	PostgreSQL	Reliable, feature-rich relational DB for structured appointment and user data.
Database ORM	GORM or SQLC	Idiomatic Golang interaction with PostgreSQL.
Messaging	Twilio	Industry-standard for programmatic SMS reminders.
AI-Assisted Dev	Cursor / GitHub Copilot / CodeRabbit	In-IDE assistance, automated PR reviews, and schema-aware generation.
🧠 AI Integration Strategy: AI-Assisted Development
This capstone project emphasizes using AI as a force multiplier throughout the entire development process, focusing on the principles of Context Injection and Guardrails (as seen in the provided image).

1. 🧱 Code or Feature Generation (Scaffolding)
We will use in-IDE tooling (e.g., Cursor or Copilot) to generate boilerplate and functions, saving significant time.

Task	AI Strategy & Prompt Example
API Scaffolding (Golang)	Strategy: Generate the full HTTP handlers, model structs, and basic routing using the Echo or Gin framework.
Prompt: "Using the Golang Echo framework and the GORM ORM, generate the full CRUD handlers (Create, GetByID, GetAll, Delete) for a Doctor resource. The Doctor struct has fields: ID (int), Name (string), SpecialtyID (int), and is_active (bool)."
Frontend Component	Strategy: Generate complex React components with required state/props.
Prompt: "Generate a TypeScript React component called AppointmentCard that accepts doctorName and appointmentTime as props. It must use Tailwind CSS for styling and include a stateful 'Cancel Appointment' button."
2. 🧪 Testing Support
AI will be used to ensure every critical piece of business logic is covered by a test suite.

Task	AI Strategy & Prompt Example
Unit Tests (Golang)	Strategy: Provide the Go function and ask for a complete test suite to cover various inputs and error paths.
Prompt: "Generate a complete testing package test suite for the ScheduleReminder(appointmentTime time.Time) Go function. Ensure tests cover successful scheduling, a scenario where the time is in the past (returning an error), and a scenario where the time is exactly now."
Mocking Integration	Strategy: Generate the necessary boilerplate for mocking external dependencies (e.g., the database or the Twilio service).
Prompt: "Generate the mock implementation for the AppointmentRepository interface using GoMock, so I can test the CreateAppointment service layer without hitting the PostgreSQL database."
3. 📝 Documentation
AI ensures documentation is consistent, professional, and up-to-date across the codebase and external files.

Task	AI Strategy & Prompt Example
Internal Documentation	Strategy: Automatically generate and maintain correct Go documentation (Godoc) for all exported functions and structs.
Prompt: "Write a concise Godoc comment for the BookAppointment function, explaining its parameters (userID, doctorID, time) and what it returns (Appointment struct, error), emphasizing its use of a database transaction."
README & Wiki	Strategy: Update external documentation based on project changes (e.g., when the AI classifier is updated).
Prompt: "Based on the latest Git diff which shows the symptom classifier moving from simple rules to a Scikit-learn model, update the 'AI Integration Strategy' section of the README to reflect this change."
4. Context-Aware Techniques (Schema-Aware & Architecture)
This is the most critical area, leveraging AI as a schema-aware and architecture-aware teammate.

Technique	Implementation Details	AI Tooling Integration
Schema-Aware Coding	We will feed the AI the PostgreSQL schema and the Golang Structs (e.g., Doctor, Appointment) to generate: 1. Data validation logic. 2. Safe, prepared SQL queries if using SQLC.	Prompt: "Given the Appointment GORM struct, generate a Golang function that fetches all appointments for a given userID, ensuring the query only selects appointments that have a status of 'SCHEDULED' and orders them by time ascending."
Automated Reviews	We will integrate CodeRabbit (or similar tool) into the GitHub workflow. This adheres to the "Automate Pull Requests" principle from the guide.	Action: The tool will run on every PR, focusing on Golang best practices (e.g., error handling, interface use) and potential security flaws in the generated API code. It will leave inline, actionable comments.
Creating Reusable Project Rules	We will explicitly define the project's Go idioms (e.g., all database access must go through a dedicated Repository interface) and save them as a custom instruction file (.cursor/project-spec.md).	Action: This file will be loaded by the in-IDE AI, forcing it to generate code that follows our repository pattern and architecture, making it behave like a "teammate, not a generic chatbot."
Refactor with Guardrails	When refactoring a large block of business logic (e.g., reminder scheduling), we will use specific prompts to limit the scope of change.	Prompt: "Refactor this SendReminder function to use a channel for concurrency, but DO NOT alter the external TwilioClient interface, only modify the internal loop logic."

## 🚀 Features Implemented

The following API endpoints have been fully integrated with the frontend application:

### Authentication Endpoints
- **POST /api/v1/auth/login** - User authentication with JWT token generation and full form validation
- **POST /api/v1/auth/validate** - JWT token validation for protected routes
- **POST /api/v1/auth/logout** - Secure user logout with token invalidation

### Doctor Management Endpoints
- **GET /api/v1/doctors** - Retrieve all active doctors with specialty information
- **GET /api/v1/doctors/:id** - Get specific doctor details by ID
- **POST /api/v1/doctors** - Create new doctor profiles with validation
- **PUT /api/v1/doctors/:id** - Update existing doctor information
- **DELETE /api/v1/doctors/:id** - Soft delete doctor profiles

### Appointment Management Endpoints
- **POST /api/v1/appointments/book** - Book new appointments with full form validation and success handling
- **GET /api/v1/appointments/availability** - Check doctor availability for specific time slots
- **PUT /api/v1/appointments/:id/reschedule** - Reschedule existing appointments with conflict detection
- **DELETE /api/v1/appointments/:id/cancel** - Cancel appointments with reason tracking
- **GET /api/v1/appointments/user/:user_id** - Retrieve user's appointment history

### System Health Endpoints
- **GET /health** - Application health check with database connectivity status

All endpoints include:
- Comprehensive error handling and validation
- Rate limiting and security middleware
- CORS configuration for frontend integration
- Structured JSON responses with consistent error formats
- TypeScript interface definitions for type-safe frontend integration
