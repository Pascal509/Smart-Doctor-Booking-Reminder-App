import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDoctorList } from '../../hooks/useDoctorList';
import { bookAppointment, getAvailableSlots } from '../../api/clients/appointmentApi';
import { Doctor, BookingData, BookingResponse } from '../../api/types/api';
import { DoctorCard } from '../ui/DoctorCard';

interface BookingFlowProps {
  onBookingComplete?: (booking: BookingResponse) => void;
  onCancel?: () => void;
  className?: string;
}

type BookingStep = 'doctor-selection' | 'time-selection' | 'confirmation' | 'success' | 'error';

interface BookingFormData {
  doctor_id: number | null;
  appointment_time: string;
  notes: string;
  selectedDoctor?: Doctor;
}

/**
 * Multi-step booking flow component for scheduling appointments
 * 
 * Steps:
 * 1. Doctor Selection - Choose from available doctors
 * 2. Time Selection - Pick available time slot
 * 3. Confirmation - Review and confirm booking details
 * 4. Success/Error - Show booking result
 */
export const BookingFlow: React.FC<BookingFlowProps> = ({
  onBookingComplete,
  onCancel,
  className = ''
}) => {
  const { authState } = useAuth();
  const { doctors, loading: doctorsLoading, error: doctorsError } = useDoctorList();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('doctor-selection');
  const [formData, setFormData] = useState<BookingFormData>({
    doctor_id: null,
    appointment_time: '',
    notes: ''
  });
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResponse | null>(null);

  // Initialize selected date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    if (formData.doctor_id && selectedDate && currentStep === 'time-selection') {
      fetchAvailableSlots();
    }
  }, [formData.doctor_id, selectedDate, currentStep]);

  const fetchAvailableSlots = async () => {
    if (!formData.doctor_id || !selectedDate) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const slots = await getAvailableSlots(formData.doctor_id, selectedDate);
      setAvailableSlots(slots);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch available time slots');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setFormData(prev => ({
      ...prev,
      doctor_id: doctor.id,
      selectedDoctor: doctor
    }));
    setCurrentStep('time-selection');
    setError(null);
  };

  const handleTimeSelect = (time: string) => {
    setFormData(prev => ({
      ...prev,
      appointment_time: time
    }));
    setCurrentStep('confirmation');
  };

  const handleConfirmBooking = async () => {
    if (!authState.user?.user_id || !formData.doctor_id || !formData.appointment_time) {
      setError('Missing required booking information');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookingData: BookingData = {
        doctor_id: formData.doctor_id,
        appointment_time: formData.appointment_time,
        duration: 60, // Default 60 minutes
        appointment_type: 'CONSULTATION',
        notes: formData.notes,
        reminder_type: 'EMAIL',
        reminder_time: 60
      };

      const result = await bookAppointment(bookingData);
      setBookingResult(result);
      setCurrentStep('success');
      
      if (onBookingComplete) {
        onBookingComplete(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to book appointment');
      setCurrentStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'time-selection':
        setCurrentStep('doctor-selection');
        break;
      case 'confirmation':
        setCurrentStep('time-selection');
        break;
      case 'error':
        setCurrentStep('confirmation');
        break;
      default:
        if (onCancel) onCancel();
    }
    setError(null);
  };

  const handleStartOver = () => {
    setFormData({
      doctor_id: null,
      appointment_time: '',
      notes: ''
    });
    setCurrentStep('doctor-selection');
    setError(null);
    setBookingResult(null);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateTimeSlots = () => {
    const slots = [];
    const baseDate = new Date(selectedDate);
    
    // Generate slots from 9 AM to 5 PM
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(baseDate);
        slotTime.setHours(hour, minute, 0, 0);
        slots.push(slotTime.toISOString());
      }
    }
    
    return slots;
  };

  if (!authState.isAuthenticated) {
    return (
      <div className={`max-w-md mx-auto p-6 bg-white rounded-lg shadow-md ${className}`}>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to book an appointment.</p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md ${className}`}>
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${
            ['doctor-selection'].includes(currentStep) ? 'text-blue-600' : 
            ['time-selection', 'confirmation', 'success'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              ['doctor-selection'].includes(currentStep) ? 'border-blue-600 bg-blue-50' :
              ['time-selection', 'confirmation', 'success'].includes(currentStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              1
            </div>
            <span className="ml-2 font-medium">Select Doctor</span>
          </div>
          
          <div className={`flex items-center ${
            ['time-selection'].includes(currentStep) ? 'text-blue-600' : 
            ['confirmation', 'success'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              ['time-selection'].includes(currentStep) ? 'border-blue-600 bg-blue-50' :
              ['confirmation', 'success'].includes(currentStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Select Time</span>
          </div>
          
          <div className={`flex items-center ${
            ['confirmation'].includes(currentStep) ? 'text-blue-600' : 
            ['success'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              ['confirmation'].includes(currentStep) ? 'border-blue-600 bg-blue-50' :
              ['success'].includes(currentStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              3
            </div>
            <span className="ml-2 font-medium">Confirm</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'doctor-selection' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Doctor</h2>
          
          {doctorsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading doctors...</span>
            </div>
          )}
          
          {doctorsError && (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{doctorsError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          
          {!doctorsLoading && !doctorsError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.filter(doctor => doctor.is_active).map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onClick={() => handleDoctorSelect(doctor)}
                />
              ))}
            </div>
          )}
          
          {!doctorsLoading && !doctorsError && doctors.filter(doctor => doctor.is_active).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No active doctors available for booking.</p>
            </div>
          )}
        </div>
      )}

      {currentStep === 'time-selection' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Appointment Time</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-2">Selected Doctor:</p>
            <p className="font-semibold text-lg">{formData.selectedDoctor?.name}</p>
            {formData.selectedDoctor?.specialty && (
              <p className="text-gray-500">{formData.selectedDoctor.specialty.name}</p>
            )}
          </div>
          
          <div className="mb-6">
            <label htmlFor="appointment-date" className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              id="appointment-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading available times...</span>
            </div>
          )}
          
          {!loading && selectedDate && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Available Time Slots</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {generateTimeSlots().map((slot) => {
                  const slotDate = new Date(slot);
                  const timeString = slotDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  
                  return (
                    <button
                      key={slot}
                      onClick={() => handleTimeSelect(slot)}
                      className="p-3 text-center border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {timeString}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep === 'confirmation' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Appointment</h2>
          
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appointment Details</h3>
            
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Doctor:</span>
                <span className="ml-2">{formData.selectedDoctor?.name}</span>
              </div>
              
              {formData.selectedDoctor?.specialty && (
                <div>
                  <span className="font-medium text-gray-700">Specialty:</span>
                  <span className="ml-2">{formData.selectedDoctor.specialty.name}</span>
                </div>
              )}
              
              <div>
                <span className="font-medium text-gray-700">Date & Time:</span>
                <span className="ml-2">{formatDateTime(formData.appointment_time)}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Patient:</span>
                <span className="ml-2">{authState.user?.username}</span>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information or special requests..."
            />
          </div>
        </div>
      )}

      {currentStep === 'success' && bookingResult && (
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Appointment Booked Successfully!</h2>
          
          <div className="bg-green-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Confirmation</h3>
            
            <div className="space-y-2 text-left">
              <div>
                <span className="font-medium text-gray-700">Appointment ID:</span>
                <span className="ml-2">#{bookingResult.appointment_id}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className="ml-2 capitalize">{bookingResult.status}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Scheduled:</span>
                <span className="ml-2">{formatDateTime(bookingResult.appointment_time)}</span>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">{bookingResult.message}</p>
        </div>
      )}

      {currentStep === 'error' && (
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Failed</h2>
          <p className="text-gray-600 mb-6">We encountered an issue while booking your appointment. Please try again.</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <div>
          {currentStep !== 'doctor-selection' && currentStep !== 'success' && (
            <button
              onClick={handleBack}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          )}
        </div>
        
        <div className="flex space-x-3">
          {currentStep === 'success' && (
            <>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Book Another
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </>
          )}
          
          {currentStep === 'error' && (
            <>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </>
          )}
          
          {currentStep === 'confirmation' && (
            <button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          )}
          
          {(currentStep === 'doctor-selection' || currentStep === 'time-selection') && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};