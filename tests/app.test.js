const request = require('supertest');
const app = require('../src/server');

describe('Smart Doctor Booking & Reminder App', () => {
  afterAll(() => {
    // Close server after tests
    if (app && app.close) {
      app.close();
    }
  });

  describe('GET /', () => {
    it('should return the home page', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Smart Doctor Booking');
    });
  });

  describe('GET /doctors', () => {
    it('should return the doctors page', async () => {
      const response = await request(app).get('/doctors');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Find Doctors');
    });

    it('should filter doctors by specialty', async () => {
      const response = await request(app).get('/doctors?specialty=cardiology');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Dr. Sarah Johnson');
    });
  });

  describe('GET /book/:doctorId', () => {
    it('should return booking page for valid doctor', async () => {
      const response = await request(app).get('/book/1');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Book Appointment');
      expect(response.text).toContain('Dr. Sarah Johnson');
    });

    it('should return 404 for invalid doctor', async () => {
      const response = await request(app).get('/book/999');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /book', () => {
    it('should create an appointment', async () => {
      const appointmentData = {
        doctorId: '1',
        patientName: 'John Doe',
        patientEmail: 'john@example.com',
        patientPhone: '555-123-4567',
        date: '2024-12-25',
        time: '10:00',
        reason: 'Regular checkup'
      };

      const response = await request(app)
        .post('/book')
        .send(appointmentData);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Appointment Confirmed');
    });
  });

  describe('GET /appointments', () => {
    it('should return appointments page', async () => {
      const response = await request(app).get('/appointments');
      expect(response.status).toBe(200);
      expect(response.text).toContain('My Appointments');
    });
  });

  describe('GET /api/appointments', () => {
    it('should return appointments as JSON', async () => {
      const response = await request(app).get('/api/appointments');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.status).toBe(404);
    });
  });
});