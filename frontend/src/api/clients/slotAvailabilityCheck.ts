/**
 * Slot Availability Check Utility
 * 
 * This module provides a TypeScript client function for checking appointment slot availability
 * during the booking flow. It's designed to be used inline with form input validators.
 */

// API response interface for slot availability check
interface SlotAvailabilityResponse {
  available: boolean;
  doctorId: number;
  requestedTime: string;
  conflictingAppointments?: {
    id: number;
    startTime: string;
    endTime: string;
  }[];
  message?: string;
}

// Result interface for the client function
interface SlotAvailabilityResult {
  available: boolean;
  error?: string;
  details?: SlotAvailabilityResponse;
}

/**
 * Checks if a specific time slot is available for a doctor
 * 
 * @param doctorId - The ID of the doctor
 * @param time - The requested appointment time (ISO 8601 format)
 * @returns Promise<boolean> - True if slot is available, false otherwise
 * 
 * @example
 * ```typescript
 * // Basic usage in form validation
 * const isAvailable = await checkSlotAvailability(1, '2024-01-20T10:00:00Z');
 * if (!isAvailable) {
 *   setError('This time slot is not available');
 * }
 * 
 * // Usage with async form validator
 * const validateSlot = async (value: string) => {
 *   const available = await checkSlotAvailability(doctorId, value);
 *   return available ? undefined : 'Time slot is not available';
 * };
 * ```
 */
export const checkSlotAvailability = async (
  doctorId: number,
  time: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `/api/v1/appointments/check-availability?doctorId=${doctorId}&time=${encodeURIComponent(time)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout for form validation responsiveness
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.warn(`Slot availability check failed: ${response.status} ${response.statusText}`);
      return false; // Assume unavailable on API error for safety
    }

    const data: SlotAvailabilityResponse = await response.json();
    return data.available;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false; // Assume unavailable on network error for safety
  }
};

/**
 * Enhanced version that returns detailed information about availability
 * Useful for debugging or providing detailed feedback to users
 * 
 * @param doctorId - The ID of the doctor
 * @param time - The requested appointment time (ISO 8601 format)
 * @returns Promise<SlotAvailabilityResult> - Detailed availability result
 */
export const checkSlotAvailabilityDetailed = async (
  doctorId: number,
  time: string
): Promise<SlotAvailabilityResult> => {
  try {
    const response = await fetch(
      `/api/v1/appointments/check-availability?doctorId=${doctorId}&time=${encodeURIComponent(time)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      return {
        available: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data: SlotAvailabilityResponse = await response.json();
    return {
      available: data.available,
      details: data,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

/**
 * Debounced version for real-time form validation
 * Prevents excessive API calls while user is typing
 * 
 * @param doctorId - The ID of the doctor
 * @param time - The requested appointment time
 * @param debounceMs - Debounce delay in milliseconds (default: 500)
 * @returns Promise<boolean> - True if slot is available
 */
export const checkSlotAvailabilityDebounced = (() => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return async (
    doctorId: number,
    time: string,
    debounceMs: number = 500
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(async () => {
        const result = await checkSlotAvailability(doctorId, time);
        resolve(result);
      }, debounceMs);
    });
  };
})();

/**
 * Utility function to validate time format before checking availability
 * 
 * @param time - Time string to validate
 * @returns boolean - True if time format is valid
 */
export const isValidTimeFormat = (time: string): boolean => {
  try {
    const date = new Date(time);
    return !isNaN(date.getTime()) && date.toISOString() === time;
  } catch {
    return false;
  }
};

/**
 * Form validator function that can be used directly with form libraries
 * 
 * @param doctorId - The ID of the doctor
 * @param time - The requested appointment time
 * @returns Promise<string | undefined> - Error message if invalid, undefined if valid
 */
export const validateSlotAvailability = async (
  doctorId: number,
  time: string
): Promise<string | undefined> => {
  if (!time) {
    return 'Please select a time';
  }
  
  if (!isValidTimeFormat(time)) {
    return 'Invalid time format';
  }
  
  const available = await checkSlotAvailability(doctorId, time);
  return available ? undefined : 'This time slot is not available';
};

export default checkSlotAvailability;