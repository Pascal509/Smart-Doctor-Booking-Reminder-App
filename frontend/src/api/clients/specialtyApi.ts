import { Specialty } from '../types/api';
import apiClient from './apiClient';

/**
 * Fetches all specialties from the backend API
 * 
 * @returns Promise<Specialty[]> - Array of all specialties
 * @throws Error - When the API request fails or returns an error
 */
export const getSpecialties = async (): Promise<Specialty[]> => {
  try {
    const response = await apiClient.get<Specialty[]>('/specialties');
    return response;
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Authentication failed - please log in again');
    }
    
    const message = error.response?.message || error.message || 'Failed to fetch specialties';
    throw new Error(message);
  }
};

/**
 * Fetches active specialties only
 * 
 * @returns Promise<Specialty[]> - Array of active specialties
 * @throws Error - When the API request fails or returns an error
 */
export const getActiveSpecialties = async (): Promise<Specialty[]> => {
  try {
    const specialties = await getSpecialties();
    return specialties.filter(specialty => specialty.is_active);
  } catch (error: any) {
    throw error; // Re-throw the error from getSpecialties
  }
};