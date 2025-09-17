# Smart-Doctor-Booking-Reminder-App

The Smart Doctor-Booking & Reminder App is an innovative platform designed to simplify the process of finding and scheduling medical appointments.

## Features

### 🔍 Doctor Search & Discovery
- Browse qualified healthcare professionals by specialty
- Search doctors by name or medical specialty
- Filter doctors by expertise (Cardiology, Pediatrics, Dermatology, General Practice)
- View doctor profiles with ratings, experience, and contact information

### 📅 Easy Appointment Booking
- Quick appointment scheduling with available time slots
- Interactive time slot selection
- Patient information collection
- Appointment confirmation with detailed information

### 🔔 Smart Reminder System
- Automatic appointment reminders 24 hours before scheduled visits
- Email-based notification system (configurable)
- Prevents missed appointments

### 📊 Appointment Management
- View all scheduled appointments
- Cancel appointments when needed
- Track appointment history and status
- Real-time appointment updates

## Technology Stack

- **Backend**: Node.js with Express.js framework
- **Frontend**: EJS templating engine with responsive CSS
- **Styling**: Custom CSS with modern design patterns
- **Scheduling**: Node-cron for automated reminders
- **Testing**: Jest with Supertest for API testing
- **Data Storage**: In-memory storage (easily replaceable with database)

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Pascal509/Smart-Doctor-Booking-Reminder-App.git
cd Smart-Doctor-Booking-Reminder-App
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Development Mode

For development with auto-restart on file changes:
```bash
npm run dev
```

### Testing

Run the test suite:
```bash
npm test
```

## Usage Guide

### For Patients

1. **Find a Doctor**:
   - Visit the "Find Doctors" page
   - Use search or filter by specialty
   - Review doctor profiles and availability

2. **Book an Appointment**:
   - Click "Book Appointment" for your chosen doctor
   - Fill in your contact information
   - Select your preferred date and time slot
   - Provide reason for visit (optional)
   - Confirm your booking

3. **Manage Appointments**:
   - View all your appointments in "My Appointments"
   - Cancel appointments if needed
   - Receive automatic reminders

### For Healthcare Providers

The current version includes sample doctors with predefined schedules. In a production environment, doctors would have:
- Profile management capabilities
- Schedule and availability management
- Patient communication tools
- Appointment confirmation workflows

## API Endpoints

### Public Routes
- `GET /` - Home page
- `GET /doctors` - Doctor listings with optional filtering
- `GET /book/:doctorId` - Booking form for specific doctor
- `POST /book` - Create new appointment
- `GET /appointments` - View all appointments

### API Routes
- `GET /api/appointments` - Get appointments as JSON
- `DELETE /api/appointments/:id` - Cancel appointment

## Project Structure

```
├── src/
│   └── server.js          # Main application server
├── public/
│   ├── css/
│   │   └── style.css      # Application styles
│   └── js/
│       └── app.js         # Client-side JavaScript
├── views/
│   ├── partials/
│   │   ├── header.ejs     # Page header template
│   │   └── footer.ejs     # Page footer template
│   ├── index.ejs          # Home page
│   ├── doctors.ejs        # Doctor listings
│   ├── booking.ejs        # Appointment booking form
│   ├── confirmation.ejs   # Booking confirmation
│   ├── appointments.ejs   # Appointment management
│   └── 404.ejs           # Error page
├── tests/
│   └── app.test.js        # Application tests
└── package.json           # Project configuration
```

## Features in Detail

### Responsive Design
- Mobile-first approach
- Optimized for tablets and desktops
- Intuitive navigation and user experience

### Data Validation
- Client-side and server-side form validation
- Email and phone number format checking
- Date validation (future dates only)
- Required field validation

### User Experience
- Loading states for async operations
- Smooth animations and transitions
- Real-time feedback and error handling
- Confirmation dialogs for destructive actions

### Accessibility
- Semantic HTML structure
- Proper form labeling
- Keyboard navigation support
- Screen reader compatibility

## Future Enhancements

- **Database Integration**: Replace in-memory storage with persistent database
- **User Authentication**: Add secure login/logout functionality
- **Email Integration**: Implement actual email notifications
- **Payment Processing**: Add online payment capabilities
- **Video Consultations**: Integrate telemedicine features
- **Mobile App**: React Native or Flutter mobile application
- **Advanced Search**: Location-based doctor search
- **Review System**: Patient ratings and reviews
- **Insurance Integration**: Verify insurance coverage
- **Calendar Sync**: Integration with Google Calendar, Outlook

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team

---

**Smart Doctor Booking & Reminder App** - Simplifying healthcare appointments for everyone.