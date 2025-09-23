import { useState, useEffect, useCallback } from 'react';
import { Doctor, ApiError } from '../api/types/api';
import { getDoctorsBySpecialty } from '../api/clients/doctorApi';

/**
 * Custom hook for managing doctors data with loading and error states
 */
export interface UseDoctorsState {
  doctors: Doctor[];
  loading: boolean;
  error: string | null;
  fetchDoctors: (specialtyId: number) => Promise<void>;
  clearError: () => void;
}

export function useDoctors(): UseDoctorsState {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async (specialtyId: number) => {
    setLoading(true);
    setError(null);

    try {
      const doctorsData = await getDoctorsBySpecialty(specialtyId);
      setDoctors(doctorsData);
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle specific API errors
        switch (err.status) {
          case 404:
            setError(`No doctors found for the selected specialty.`);
            setDoctors([]); // Clear previous results
            break;
          case 401:
            setError('Authentication required. Please log in.');
            break;
          case 403:
            setError('Access denied. You do not have permission to view this data.');
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          case 0:
            setError('Network error. Please check your internet connection.');
            break;
          default:
            setError(err.message || 'An unexpected error occurred.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    doctors,
    loading,
    error,
    fetchDoctors,
    clearError
  };
}

/**
 * Hook for fetching doctors by specialty with automatic loading on mount
 */
export function useDoctorsBySpecialty(specialtyId: number | null): UseDoctorsState {
  const doctorsState = useDoctors();
  const { fetchDoctors } = doctorsState;

  useEffect(() => {
    if (specialtyId && specialtyId > 0) {
      fetchDoctors(specialtyId);
    }
  }, [specialtyId, fetchDoctors]);

  return doctorsState;
}