import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/clients/apiClient';
import { Appointment } from '../api/types/api';
import { useAuth } from '../contexts/AuthContext';

export interface UsePatientAppointmentsResult {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage patient appointments
 * Fetches appointments from GET /api/v1/appointments/patient
 */
export const usePatientAppointments = (): UsePatientAppointmentsResult => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { authState } = useAuth();
  const { user } = authState;

  const fetchAppointments = useCallback(async () => {
    if (!user) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<Appointment[]>('/api/v1/appointments/patient');
      
      if (Array.isArray(response)) {
        setAppointments(response);
      } else {
        setError('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error fetching patient appointments:', err);
      setError(err.response?.data?.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refetch = async () => {
    await fetchAppointments();
  };

  useEffect(() => {
    fetchAppointments();
  }, [user, fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    refetch
  };
};