import { useState, useEffect, useCallback } from 'react';
import { Doctor, ApiError } from '../api/types/api';
import { getDoctorById } from '../api/clients/doctorApi';
import { useDoctorList } from './useDoctorList';

/**
 * Custom hook for fetching and managing a single doctor by ID with caching optimization
 * 
 * This hook first checks if the doctor exists in the useDoctorList cache to avoid
 * redundant API calls. If not found in cache, it fetches from the API.
 * 
 * @param id - The ID of the doctor to fetch
 * @returns Object containing doctor data, loading state, error state, and refresh function
 */
export const useDoctor = (id: number | null) => {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState<boolean>(false);

  // Get the doctors list cache
  const { doctors: cachedDoctors, loading: cacheLoading } = useDoctorList();

  /**
   * Fetch doctor from API
   */
  const fetchDoctorFromApi = useCallback(async (doctorId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const doctorData = await getDoctorById(doctorId);
      setDoctor(doctorData);
    } catch (err: any) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : err.message || 'Failed to fetch doctor';
      setError(errorMessage);
      setDoctor(null);
      console.error('Error fetching doctor:', err);
    } finally {
      setLoading(false);
      setHasAttemptedFetch(true);
    }
  }, []);

  /**
   * Check cache first, then fetch from API if needed
   */
  const fetchDoctor = useCallback(async (doctorId: number) => {
    // First, try to find the doctor in the cache
    const cachedDoctor = cachedDoctors.find(d => d.id === doctorId);
    
    if (cachedDoctor) {
      // Found in cache, use cached data
      setDoctor(cachedDoctor);
      setError(null);
      setLoading(false);
      setHasAttemptedFetch(true);
      return;
    }
    
    // Not in cache, fetch from API
    await fetchDoctorFromApi(doctorId);
  }, [cachedDoctors, fetchDoctorFromApi]);

  /**
   * Refresh the doctor data (always fetches from API)
   */
  const refresh = useCallback(() => {
    if (id && id > 0) {
      fetchDoctorFromApi(id);
    }
  }, [id, fetchDoctorFromApi]);

  /**
   * Clear the current doctor data
   */
  const clearDoctor = useCallback(() => {
    setDoctor(null);
    setError(null);
    setLoading(false);
    setHasAttemptedFetch(false);
  }, []);

  // Effect to fetch doctor when ID changes
  useEffect(() => {
    if (!id || id <= 0) {
      clearDoctor();
      return;
    }

    // Reset state when ID changes
    setHasAttemptedFetch(false);
    setError(null);

    // Wait for cache to load before checking
    if (!cacheLoading) {
      fetchDoctor(id);
    }
  }, [id, cacheLoading, fetchDoctor, clearDoctor]);

  // Determine the overall loading state
  const isLoading = loading || (!hasAttemptedFetch && cacheLoading && id !== null && id > 0);

  return {
    doctor,
    loading: isLoading,
    error,
    refresh,
    clearDoctor,
    // Additional metadata
    isFromCache: doctor !== null && cachedDoctors.some(d => d.id === doctor.id),
    hasAttemptedFetch
  };
};

/**
 * Hook variant that automatically fetches doctor on mount
 * 
 * @param id - The ID of the doctor to fetch
 * @returns Same as useDoctor but with automatic fetching
 */
export const useDoctorById = (id: number) => {
  return useDoctor(id);
};

export default useDoctor;