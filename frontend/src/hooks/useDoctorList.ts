import { useState, useEffect } from 'react';
import { Doctor, ApiError } from '../api/types/api';
import apiClient from '../api/clients/apiClient';

/**
 * Custom hook for fetching and managing all doctors data
 * 
 * @returns Object containing doctors array, loading state, error state, and refresh function
 */
export const useDoctorList = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all doctors from the API
   */
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/v1/doctors');
      setDoctors(response.data || []);
    } catch (err: any) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to fetch doctors';
      setError(errorMessage);
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh the doctors list
   */
  const refresh = () => {
    fetchDoctors();
  };

  // Fetch doctors on component mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  return {
    doctors,
    loading,
    error,
    refresh
  };
};

export default useDoctorList;