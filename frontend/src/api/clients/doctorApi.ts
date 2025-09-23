import { Doctor, DoctorData } from '../types/api';
import apiClient from './apiClient';

/**
 * Fetches all doctors from the backend API
 * 
 * @returns Promise<Doctor[]> - Array of all doctors
 * @throws Error - When the API request fails or returns an error
 */
export const getDoctors = async (): Promise<Doctor[]> => {
  try {
    const response = await apiClient.get<Doctor[]>('/doctors');
    return response;
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Authentication failed - please log in again');
    }
    
    const message = error.response?.message || error.message || 'Failed to fetch doctors';
    throw new Error(message);
  }
};

/**
 * Fetches doctors by specialty ID from the backend API
 * 
 * @param specialtyId - The ID of the specialty to filter doctors by
 * @returns Promise<Doctor[]> - Array of doctors for the specified specialty
 * @throws ApiError - When the API request fails or returns an error
 * 
 * OpenAPI Specification:
 * GET /api/v1/doctors?specialty_id={specialtyId}
 * 
 * Success Response (200):
 * {
 *   "message": "Doctors retrieved successfully",
 *   "data": Doctor[]
 * }
 * 
 * Error Response (404):
 * {
 *   "error": "Not Found",
 *   "message": "No doctors found for the specified specialty"
 * }
 */
export const getDoctorsBySpecialty = async (specialtyId: number): Promise<Doctor[]> => {
  try {
    const response = await apiClient.get<Doctor[]>(
      `/doctors?specialty_id=${specialtyId}`
    );
    return response;
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Authentication failed - please log in again');
    }
    
    if (error.status === 404) {
      throw new Error('No doctors found for this specialty');
    }
    
    const message = error.response?.message || error.message || 'Failed to fetch doctors by specialty';
    throw new Error(message);
  }
};

/**
 * Creates a new doctor in the backend API
 * 
 * @param data - The doctor data to create
 * @returns Promise<Doctor> - The created doctor object
 * @throws Error - When the API request fails or returns an error
 * 
 * OpenAPI Specification:
 * POST /api/v1/doctors
 * 
 * Request Body:
 * {
 *   "name": "string",
 *   "specialty_id": number,
 *   "is_active": boolean (optional, defaults to true)
 * }
 * 
 * Success Response (201):
 * {
 *   "message": "Doctor created successfully",
 *   "data": Doctor
 * }
 * 
 * Error Response (400):
 * {
 *   "error": "Bad Request",
 *   "message": "Invalid doctor data"
 * }
 */
export const createDoctor = async (data: DoctorData): Promise<Doctor> => {
  try {
    const response = await apiClient.post<Doctor>('/doctors', data);
    return response;
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Authentication failed - please log in again');
    }
    
    if (error.status === 400) {
      throw new Error('Invalid doctor data - please check your input');
    }
    
    const message = error.response?.message || error.message || 'Failed to create doctor';
    throw new Error(message);
  }
};

/**
 * Fetches a single doctor by ID from the backend API
 * 
 * @param id - The ID of the doctor to fetch
 * @returns Promise<Doctor> - The doctor object
 * @throws Error - When the API request fails or returns an error
 * 
 * OpenAPI Specification:
 * GET /api/v1/doctors/:id
 * 
 * Success Response (200):
 * {
 *   "message": "Doctor retrieved successfully",
 *   "data": Doctor
 * }
 * 
 * Error Response (404):
 * {
 *   "error": "Not Found",
 *   "message": "Doctor not found"
 * }
 */
export const getDoctorById = async (id: number): Promise<Doctor> => {
  try {
    const response = await apiClient.get<Doctor>(`/doctors/${id}`);
    return response;
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Authentication failed - please log in again');
    }
    
    if (error.status === 404) {
      throw new Error('Doctor not found');
    }
    
    const message = error.response?.message || error.message || 'Failed to fetch doctor';
    throw new Error(message);
  }
};

/**
 * Update a doctor's information
 * @param id - The doctor's ID
 * @param data - Partial doctor data to update
 * @returns Promise<Doctor> - The updated doctor object
 * @throws Error if update fails or unauthorized
 */
export const updateDoctor = async (id: number, data: Partial<DoctorData>): Promise<Doctor> => {
  try {
    const response = await apiClient.put<Doctor>(`/doctors/${id}`, data);
    return response;
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Authentication required. Please log in.');
    }
    if (error.status === 403) {
      throw new Error('You do not have permission to update this doctor.');
    }
    if (error.status === 404) {
      throw new Error('Doctor not found.');
    }
    if (error.status === 400) {
      throw new Error(error.response?.message || 'Invalid data provided.');
    }
    throw new Error(error.response?.message || error.message || 'Failed to update doctor');
  }
};

/**
 * Alternative implementation using axios (commented out)
 * Uncomment and install axios if preferred: npm install axios
 */
/*
import axios, { AxiosError } from 'axios';

export async function fetchDoctorsBySpecialtyAxios(specialtyId: number): Promise<Doctor[]> {
  if (!specialtyId || specialtyId <= 0) {
    throw new ApiError('Invalid specialty ID. Must be a positive number.', 400);
  }

  try {
    const response = await axios.get<ApiResponse<Doctor[]>>(
      `${API_BASE_URL}/doctors`,
      {
        params: { specialty_id: specialtyId },
        headers: {
          ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` })
        }
      }
    );

    return response.data.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      
      if (axiosError.response?.status === 404) {
        throw new ApiError(
          `No doctors found for specialty ID ${specialtyId}`,
          404,
          axiosError.response.data
        );
      }

      throw new ApiError(
        axiosError.response?.data?.message || axiosError.message,
        axiosError.response?.status || 500,
        axiosError.response?.data
      );
    }

    throw new ApiError(
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      500
    );
  }
}
*/



/**
 * Example usage:
 * 
 * try {
 *   const doctors = await fetchDoctorsBySpecialty(5);
 *   console.log('Doctors found:', doctors);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     if (error.status === 404) {
 *       console.log('No doctors found for this specialty');
 *     } else {
 *       console.error('API Error:', error.message);
 *     }
 *   }
 * }
 */