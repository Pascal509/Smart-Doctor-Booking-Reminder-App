import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cancelAppointment } from '../../api/clients/appointmentApi';
import { Appointment } from '../../api/types/api';
import apiClient from '../../api/clients/apiClient';

interface AppointmentListProps {
  className?: string;
  showOnlyUpcoming?: boolean;
}

/**
 * AppointmentList component for displaying user's appointments with cancel functionality
 * 
 * @param className - Additional CSS classes
 * @param showOnlyUpcoming - Whether to show only upcoming appointments (default: false)
 */
export const AppointmentList: React.FC<AppointmentListProps> = ({ 
  className = '',
  showOnlyUpcoming = false 
}) => {
  const { authState } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  /**
   * Fetch appointments from the API
   */
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = showOnlyUpcoming 
        ? '/appointments/upcoming'
        : '/appointments/patient';
      
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        appointments: Appointment[];
        total: number;
      }>(endpoint);
      
      setAppointments(response.appointments || []);
    } catch (err: any) {
      const errorMessage = err.response?.message || err.message || 'Failed to fetch appointments';
      setError(errorMessage);
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [showOnlyUpcoming]);

  /**
   * Handle appointment cancellation
   */
  const handleCancelAppointment = async (appointmentId: number, reason?: string) => {
    try {
      setCancellingId(appointmentId);
      
      await cancelAppointment(appointmentId, reason);
      
      // Remove the cancelled appointment from the list or refetch
      await fetchAppointments();
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to cancel appointment';
      setError(errorMessage);
      console.error('Error cancelling appointment:', err);
    } finally {
      setCancellingId(null);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /**
   * Format time for display
   */
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Check if appointment can be cancelled
   */
  const canCancelAppointment = (appointment: Appointment): boolean => {
    const appointmentDate = new Date(appointment.appointment_time);
    const now = new Date();
    const hoursDifference = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Can cancel if appointment is in the future and status is scheduled or confirmed
    return hoursDifference > 2 &&
           (appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED');
  };

  // Fetch appointments on component mount
  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchAppointments();
    }
  }, [authState.isAuthenticated, fetchAppointments]);

  // Show loading state
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading appointments</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={fetchAppointments}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (appointments.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {showOnlyUpcoming ? 'No upcoming appointments' : 'No appointments found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {showOnlyUpcoming 
              ? 'You don\'t have any upcoming appointments scheduled.'
              : 'You haven\'t scheduled any appointments yet.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {showOnlyUpcoming ? 'Upcoming Appointments' : 'My Appointments'}
          </h2>
          <p className="text-sm text-gray-600">
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={fetchAppointments}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Doctor and Specialty */}
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    Dr. {appointment.doctor?.name || 'Unknown Doctor'}
                  </h3>
                  {appointment.doctor?.specialty && (
                    <span className="text-sm text-gray-500">
                      • {appointment.doctor.specialty.name}
                    </span>
                  )}
                </div>

                {/* Date and Time */}
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
                    </svg>
                    {formatDate(appointment.appointment_time)}
                  </div>
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(appointment.appointment_time)}
                  </div>
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {appointment.duration} minutes
                  </div>
                </div>

                {/* Notes */}
                {appointment.patient_notes && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Notes:</span> {appointment.patient_notes}
                  </p>
                )}

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    ID: {appointment.id}
                  </span>
                </div>
              </div>

              {/* Cancel Button */}
              {canCancelAppointment(appointment) && (
                <div className="ml-4">
                  <button
                    onClick={() => {
                      const reason = prompt('Please provide a reason for cancellation (optional):');
                      if (reason !== null) { // User didn't cancel the prompt
                        handleCancelAppointment(appointment.id, reason || undefined);
                      }
                    }}
                    disabled={cancellingId === appointment.id}
                    className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancellingId === appointment.id ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cancelling...
                      </div>
                    ) : (
                      'Cancel Appointment'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppointmentList;