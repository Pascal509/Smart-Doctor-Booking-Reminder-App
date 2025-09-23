import { BookingData, BookingResponse, ApiResponse, ApiError } from '../types/api';
import apiClient from './apiClient';

/**
 * Books a new appointment with the specified doctor
 * 
 * @param data - Booking data containing doctor_id, patient_id, appointment_time, and optional notes
 * @returns Promise<BookingResponse> - Booking confirmation with appointment details
 * @throws Error - When the API request fails or returns an error
 * 
 * OpenAPI Specification:
 * POST /api/v1/appointments/book
 * 
 * Request Body:
 * {
 *   "doctor_id": number,
 *   "patient_id": number,
 *   "appointment_time": string (ISO 8601 format),
 *   "notes": string (optional)
 * }
 * 
 * Success Response (201):
 * {
 *   "appointment_id": number,
 *   "doctor_id": number,
 *   "patient_id": number,
 *   "appointment_time": string,
 *   "status": string,
 *   "notes": string,
 *   "created_at": string,
 *   "message": string
 * }
 * 
 * Error Responses:
 * 400 - Bad Request (invalid data)
 * 401 - Unauthorized (authentication required)
 * 403 - Forbidden (insufficient permissions)
 * 404 - Not Found (doctor not found)
 * 409 - Conflict (time slot not available)
 * 422 - Unprocessable Entity (validation errors)
 */
export const bookAppointment = async (data: BookingData): Promise<BookingResponse> => {
  try {
    // Validate required fields
    if (!data.doctor_id || !data.appointment_time || !data.duration) {
      throw new Error('Doctor ID, appointment time, and duration are required');
    }

    // Validate appointment time format (basic ISO 8601 check)
    const appointmentDate = new Date(data.appointment_time);
    if (isNaN(appointmentDate.getTime())) {
      throw new Error('Invalid appointment time format. Please use ISO 8601 format.');
    }

    // Check if appointment time is in the future
    if (appointmentDate <= new Date()) {
      throw new Error('Appointment time must be in the future.');
    }

    const response = await apiClient.post<BookingResponse>(
      '/appointments/book',
      {
        doctor_id: data.doctor_id,
        appointment_time: data.appointment_time,
        duration: data.duration,
        appointment_type: data.appointment_type || 'CONSULTATION',
        notes: data.notes || '',
        reminder_type: data.reminder_type || 'EMAIL',
        reminder_time: data.reminder_time || 60
      }
    );

    return response;
  } catch (error: any) {
    // Handle specific error cases
    if (error.status === 401) {
      throw new Error('Authentication failed - please log in again');
    }
    
    if (error.status === 403) {
      throw new Error('You do not have permission to book appointments');
    }
    
    if (error.status === 404) {
      throw new Error('Doctor not found or not available');
    }
    
    if (error.status === 409) {
      throw new Error('The selected time slot is no longer available. Please choose a different time.');
    }
    
    if (error.status === 422) {
      const validationMessage = error.response?.message || 'Invalid appointment data provided';
      throw new Error(validationMessage);
    }
    
    if (error.status === 400) {
      const badRequestMessage = error.response?.message || 'Invalid request data';
      throw new Error(badRequestMessage);
    }
    
    // Generic error handling
    const message = error.response?.message || error.message || 'Failed to book appointment';
    throw new Error(message);
  }
};

/**
 * Gets available time slots for a specific doctor on a given date
 * 
 * @param doctorId - The ID of the doctor
 * @param date - The date to check availability (YYYY-MM-DD format)
 * @returns Promise<string[]> - Array of available time slots in ISO 8601 format
 * @throws Error - When the API request fails or returns an error
 */
export const getAvailableSlots = async (doctorId: number, date: string): Promise<string[]> => {
  try {
    if (!doctorId || !date) {
      throw new Error('Doctor ID and date are required');
    }

    const response = await apiClient.get<string[]>(
      `/appointments/availability?doctor_id=${doctorId}&date=${date}`
    );

    return response;
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Authentication failed - please log in again');
    }
    
    if (error.status === 404) {
      throw new Error('Doctor not found or no availability information');
    }
    
    const message = error.response?.message || error.message || 'Failed to fetch available time slots';
    throw new Error(message);
  }
};

/**
 * Cancel an existing appointment
 * 
 * @param id - The appointment ID to cancel
 * @param reason - Optional reason for cancellation
 * @returns Promise<ApiResponse> - Success response with cancellation confirmation
 * @throws {ApiError} When the request fails or appointment cannot be cancelled
 * 
 * @openapi
 * /api/v1/appointments/{id}/cancel:
 *   delete:
 *     summary: Cancel an appointment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The appointment ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional reason for cancellation
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *       400:
 *         description: Invalid appointment ID or appointment cannot be cancelled
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Internal server error
 */
export const cancelAppointment = async (id: number, reason?: string): Promise<ApiResponse<any>> => {
  // Validate input
  if (!id || id <= 0) {
    throw new ApiError('Invalid appointment ID', 400);
  }

  try {
    const requestBody = reason ? { reason } : {};
    
    const response = await apiClient.delete<ApiResponse<any>>(
      `/appointments/${id}/cancel`,
      { data: requestBody }
    );
    
    return {
      message: response.message || 'Appointment cancelled successfully',
      data: response.data
    };
  } catch (error: any) {
    // Handle API errors
    if (error.response) {
      const { status, data } = error.response;
      throw new ApiError(
        data?.message || data?.error || 'Failed to cancel appointment',
        status,
        data
      );
    }
    
    // Handle network or other errors
    throw new ApiError(
      error.message || 'Network error occurred while cancelling appointment',
      0
    );
  }
};