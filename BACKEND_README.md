# Smart Doctor Booking API - Backend Implementation

This is the backend implementation for the Smart Doctor Booking & Reminder App using Golang with Gin framework and GORM ORM.

## 🚀 Features Implemented

- **Doctor CRUD Operations** with validation
- **PostgreSQL Integration** using GORM
- **RESTful API** with proper HTTP status codes
- **Input Validation** for required fields (Name, SpecialtyID)
- **Error Handling** with detailed error messages
- **Database Auto-Migration**
- **CORS Support** for frontend integration

## 📁 Project Structure

```
smart-doctor-booking-app/
├── config/
│   └── database.go          # Database configuration and connection
├── handlers/
│   └── doctor_handler.go    # HTTP handlers for doctor operations
├── models/
│   ├── doctor.go           # Doctor model with GORM annotations
│   └── specialty.go        # Specialty model
├── repository/
│   └── doctor_repository.go # Data access layer with validation
├── routes/
│   └── routes.go           # Route configuration
├── seed/
│   └── specialties.sql     # Sample data for specialties
├── .env.example            # Environment variables template
├── go.mod                  # Go module dependencies
├── main.go                 # Application entry point
└── README.md               # Project documentation
```

## 🛠️ Technologies Used

- **Golang 1.24.4** - Backend language
- **Gin Framework** - HTTP web framework
- **GORM** - ORM for database operations
- **PostgreSQL** - Database
- **Validator v10** - Input validation

## 📋 API Endpoints

### Health Check
- **GET** `/health` - Check API status

### Doctor Operations
- **POST** `/api/v1/doctors` - Create a new doctor
- **GET** `/api/v1/doctors/:id` - Get doctor by ID
- **GET** `/api/v1/doctors` - Get all doctors

## 🔧 Setup Instructions

### Prerequisites
- Go 1.24.4 or higher
- PostgreSQL database

### 1. Environment Setup
Copy the environment template and configure your database:
```bash
cp .env.example .env
```

Update the `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=smart_doctor_booking
DB_SSLMODE=disable
PORT=8080
```

### 2. Database Setup
Create the PostgreSQL database:
```sql
CREATE DATABASE smart_doctor_booking;
```

Optionally, run the sample data script:
```bash
psql -d smart_doctor_booking -f seed/specialties.sql
```

### 3. Install Dependencies
```bash
go mod tidy
```

### 4. Run the Application
```bash
go run main.go
```

The API will be available at `http://localhost:8080`

## 📝 API Usage Examples

### Create Doctor (POST /api/v1/doctors)

**Request:**
```json
{
  "name": "Dr. John Smith",
  "specialty_id": 1
}
```

**Success Response (201 Created):**
```json
{
  "message": "Doctor created successfully",
  "data": {
    "id": 1,
    "name": "Dr. John Smith",
    "specialty_id": 1,
    "is_active": true,
    "created_at": "2024-01-20T10:30:00Z",
    "updated_at": "2024-01-20T10:30:00Z"
  }
}
```

**Validation Error Response (400 Bad Request):**
```json
{
  "error": "Validation Failed",
  "message": "Required fields validation failed",
  "details": {
    "name": "name is required",
    "specialty_id": "specialty_id is required"
  }
}
```

### Get Doctor (GET /api/v1/doctors/:id)

**Success Response (200 OK):**
```json
{
  "message": "Doctor retrieved successfully",
  "data": {
    "id": 1,
    "name": "Dr. John Smith",
    "specialty_id": 1,
    "is_active": true,
    "created_at": "2024-01-20T10:30:00Z",
    "updated_at": "2024-01-20T10:30:00Z",
    "specialty": {
      "id": 1,
      "name": "Cardiology",
      "description": "Heart and cardiovascular system specialists"
    }
  }
}
```

## ✅ Validation Rules

### Doctor Creation
- **Name**: Required, minimum 2 characters, maximum 255 characters
- **SpecialtyID**: Required, must be a positive integer
- **SpecialtyID**: Must reference an existing specialty in the database

## 🔒 Error Handling

The API returns appropriate HTTP status codes:
- **200 OK** - Successful GET requests
- **201 Created** - Successful POST requests
- **400 Bad Request** - Validation errors or invalid input
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server errors

## 🧪 Testing

You can test the API using curl, Postman, or any HTTP client:

```bash
# Health check
curl http://localhost:8080/health

# Create doctor
curl -X POST http://localhost:8080/api/v1/doctors \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Jane Doe","specialty_id":1}'

# Get all doctors
curl http://localhost:8080/api/v1/doctors

# Get doctor by ID
curl http://localhost:8080/api/v1/doctors/1
```

## 🔄 Database Schema

### Doctors Table
```sql
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty_id INTEGER NOT NULL REFERENCES specialties(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);
```

### Specialties Table
```sql
CREATE TABLE specialties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);
```

## 🚀 Next Steps

This backend implementation provides a solid foundation for the Smart Doctor Booking system. Future enhancements could include:

- Authentication and authorization
- Appointment management
- Patient management
- SMS/Email reminder integration
- AI-powered symptom-to-specialist matching
- Advanced search and filtering
- Rate limiting and caching
- Comprehensive testing suite