import React, { useReducer, useEffect } from 'react';
import { useDoctors } from '../../hooks/useDoctors';

/**
 * AppointmentScheduler component using useReducer for better state management
 * Refactored from multiple useState calls to a single useReducer hook
 */
interface AppointmentSchedulerProps {
  className?: string;
}

// Define the state shape for the appointment form
interface AppointmentFormState {
  date: string;
  time: string;
  doctorId: string;
  specialtyId: string;
  notes: string;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
}

// Define action types for the reducer
type AppointmentFormAction =
  | { type: 'SET_DATE'; payload: string }
  | { type: 'SET_TIME'; payload: string }
  | { type: 'SET_DOCTOR_ID'; payload: string }
  | { type: 'SET_SPECIALTY_ID'; payload: string }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_SUBMIT_ERROR'; payload: string | null }
  | { type: 'SET_SUBMIT_SUCCESS'; payload: boolean }
  | { type: 'RESET_FORM' }
  | { type: 'RESET_DOCTOR_SELECTION' };

// Initial state for the form
const initialState: AppointmentFormState = {
  date: '',
  time: '',
  doctorId: '',
  specialtyId: '',
  notes: '',
  isSubmitting: false,
  submitError: null,
  submitSuccess: false,
};

// Reducer function to handle state updates
const appointmentFormReducer = (state: AppointmentFormState, action: AppointmentFormAction): AppointmentFormState => {
  switch (action.type) {
    case 'SET_DATE':
      return { ...state, date: action.payload };
    case 'SET_TIME':
      return { ...state, time: action.payload };
    case 'SET_DOCTOR_ID':
      return { ...state, doctorId: action.payload };
    case 'SET_SPECIALTY_ID':
      return { ...state, specialtyId: action.payload };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'SET_SUBMIT_ERROR':
      return { ...state, submitError: action.payload };
    case 'SET_SUBMIT_SUCCESS':
      return { ...state, submitSuccess: action.payload };
    case 'RESET_FORM':
      return {
        ...initialState,
        // Keep specialty selection when resetting after successful submission
        specialtyId: state.specialtyId,
      };
    case 'RESET_DOCTOR_SELECTION':
      return { ...state, doctorId: '' };
    default:
      return state;
  }
};

export const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({ className = '' }) => {
  // Use useReducer instead of multiple useState calls
  const [formState, dispatch] = useReducer(appointmentFormReducer, initialState);
  const { date, time, doctorId, specialtyId, notes, isSubmitting, submitError, submitSuccess } = formState;

  const { doctors, loading: doctorsLoading, error: doctorsError, fetchDoctors } = useDoctors();

  // Fetch doctors when specialty changes
  useEffect(() => {
    const specialtyIdNum = parseInt(specialtyId);
    if (specialtyIdNum && specialtyIdNum > 0) {
      fetchDoctors(specialtyIdNum);
      dispatch({ type: 'RESET_DOCTOR_SELECTION' }); // Reset doctor selection when specialty changes
    }
  }, [specialtyId, fetchDoctors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'SET_SUBMIT_ERROR', payload: null });
    dispatch({ type: 'SET_SUBMIT_SUCCESS', payload: false });

    try {
      // Validate form data
      if (!date || !time || !doctorId) {
        throw new Error('Please fill in all required fields');
      }

      const appointmentDateTime = new Date(`${date}T${time}`);
      if (appointmentDateTime <= new Date()) {
        throw new Error('Appointment time must be in the future');
      }

      // Here you would typically call an API to book the appointment
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate success
      dispatch({ type: 'SET_SUBMIT_SUCCESS', payload: true });
      
      // Reset form (keeping specialty selection)
      dispatch({ type: 'RESET_FORM' });

    } catch (error) {
      dispatch({ 
        type: 'SET_SUBMIT_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to book appointment' 
      });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_FORM' });
    dispatch({ type: 'SET_SPECIALTY_ID', payload: '' }); // Also reset specialty
  };

  // Generate time slots (9 AM to 5 PM, 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Schedule Appointment</h2>

      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800 font-medium">Appointment scheduled successfully!</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Specialty Selection */}
        <div>
          <label htmlFor="specialtyId" className="block text-sm font-medium text-gray-700 mb-2">
            Medical Specialty *
          </label>
          <select
            id="specialtyId"
            value={specialtyId}
            onChange={(e) => dispatch({ type: 'SET_SPECIALTY_ID', payload: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a specialty</option>
            <option value="1">Cardiology</option>
            <option value="2">Dermatology</option>
            <option value="3">Neurology</option>
            <option value="4">Orthopedics</option>
            <option value="5">Pediatrics</option>
          </select>
        </div>

        {/* Doctor Selection */}
        <div>
          <label htmlFor="doctorId" className="block text-sm font-medium text-gray-700 mb-2">
            Doctor *
          </label>
          <select
            id="doctorId"
            value={doctorId}
            onChange={(e) => dispatch({ type: 'SET_DOCTOR_ID', payload: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={!specialtyId || doctorsLoading}
          >
            <option value="">Select a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id.toString()}>
                {doctor.name}
              </option>
            ))}
          </select>
          {doctorsLoading && (
            <p className="text-sm text-gray-500 mt-1">Loading doctors...</p>
          )}
          {doctorsError && (
            <p className="text-sm text-red-600 mt-1">{doctorsError}</p>
          )}
        </div>

        {/* Date Selection */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Appointment Date *
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => dispatch({ type: 'SET_DATE', payload: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Time Selection */}
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
            Appointment Time *
          </label>
          <select
            id="time"
            value={time}
            onChange={(e) => dispatch({ type: 'SET_TIME', payload: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a time</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => dispatch({ type: 'SET_NOTES', payload: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any additional information or special requests..."
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting || !date || !time || !doctorId}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentScheduler;