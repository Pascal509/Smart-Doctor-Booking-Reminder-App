const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// In-memory data storage (in production, use a proper database)
const doctors = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    specialty: 'Cardiology',
    experience: '15 years',
    rating: 4.8,
    availability: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    phone: '(555) 123-4567',
    email: 'sarah.johnson@hospital.com'
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    specialty: 'Pediatrics',
    experience: '12 years',
    rating: 4.9,
    availability: ['08:00', '09:00', '10:00', '13:00', '14:00', '15:00'],
    phone: '(555) 234-5678',
    email: 'michael.chen@hospital.com'
  },
  {
    id: '3',
    name: 'Dr. Emily Rodriguez',
    specialty: 'Dermatology',
    experience: '10 years',
    rating: 4.7,
    availability: ['09:00', '11:00', '13:00', '14:00', '16:00'],
    phone: '(555) 345-6789',
    email: 'emily.rodriguez@hospital.com'
  },
  {
    id: '4',
    name: 'Dr. David Thompson',
    specialty: 'General Practice',
    experience: '20 years',
    rating: 4.6,
    availability: ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
    phone: '(555) 456-7890',
    email: 'david.thompson@hospital.com'
  }
];

const appointments = [];
const reminders = [];

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'Home - Smart Doctor Booking & Reminder App',
    doctors 
  });
});

app.get('/doctors', (req, res) => {
  const { specialty } = req.query;
  let filteredDoctors = doctors;
  
  if (specialty && specialty !== 'all') {
    filteredDoctors = doctors.filter(doctor => 
      doctor.specialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }
  
  res.render('doctors', { 
    title: 'Find Doctors - Smart Doctor Booking & Reminder App',
    doctors: filteredDoctors, 
    selectedSpecialty: specialty || 'all' 
  });
});

app.get('/book/:doctorId', (req, res) => {
  const doctor = doctors.find(d => d.id === req.params.doctorId);
  if (!doctor) {
    return res.status(404).send('Doctor not found');
  }
  res.render('booking', { 
    title: `Book Appointment with ${doctor.name} - Smart Doctor Booking & Reminder App`,
    doctor 
  });
});

app.post('/book', (req, res) => {
  const { doctorId, patientName, patientEmail, patientPhone, date, time, reason } = req.body;
  
  const doctor = doctors.find(d => d.id === doctorId);
  if (!doctor) {
    return res.status(404).send('Doctor not found');
  }
  
  const appointment = {
    id: uuidv4(),
    doctorId,
    doctorName: doctor.name,
    patientName,
    patientEmail,
    patientPhone,
    date,
    time,
    reason,
    status: 'confirmed',
    createdAt: new Date()
  };
  
  appointments.push(appointment);
  
  // Schedule reminder
  scheduleReminder(appointment);
  
  res.render('confirmation', { 
    title: 'Appointment Confirmed - Smart Doctor Booking & Reminder App',
    appointment, 
    doctor 
  });
});

app.get('/appointments', (req, res) => {
  res.render('appointments', { 
    title: 'My Appointments - Smart Doctor Booking & Reminder App',
    appointments,
    doctors
  });
});

app.get('/api/appointments', (req, res) => {
  res.json(appointments);
});

app.delete('/api/appointments/:id', (req, res) => {
  const appointmentIndex = appointments.findIndex(apt => apt.id === req.params.id);
  if (appointmentIndex === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  appointments.splice(appointmentIndex, 1);
  res.json({ message: 'Appointment cancelled successfully' });
});

// Helper function to schedule reminders
function scheduleReminder(appointment) {
  const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
  const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
  
  if (reminderTime > new Date()) {
    const reminder = {
      id: uuidv4(),
      appointmentId: appointment.id,
      patientEmail: appointment.patientEmail,
      reminderTime,
      sent: false
    };
    
    reminders.push(reminder);
    console.log(`Reminder scheduled for ${appointment.patientName} at ${reminderTime}`);
  }
}

// Cron job to check and send reminders (runs every hour)
cron.schedule('0 * * * *', () => {
  const now = new Date();
  
  reminders.forEach(reminder => {
    if (!reminder.sent && reminder.reminderTime <= now) {
      console.log(`Sending reminder to ${reminder.patientEmail} for appointment ${reminder.appointmentId}`);
      reminder.sent = true;
      // In a real application, you would send an actual email here
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found - Smart Doctor Booking & Reminder App'
  });
});

app.listen(PORT, () => {
  console.log(`Smart Doctor Booking & Reminder App running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
});

module.exports = app;