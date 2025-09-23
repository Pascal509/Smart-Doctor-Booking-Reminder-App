import { useState, useEffect, useCallback } from 'react';
import { getAvailableSlots } from '../api/clients/appointmentApi';

interface TimeSlot {
  time: string; // ISO 8601 format
  available: boolean;
  displayTime: string; // Formatted time for display
}

interface UseDoctorAvailabilityReturn {
  timeSlots: TimeSlot[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Custom hook for fetching doctor availability time slots
 * 
 * @param doctorId - The ID of the doctor to fetch availability for
 * @param date - The date to check availability (YYYY-MM-DD format)
 * @returns Object containing time slots, loading state, error state, and refresh function
 */
export const useDoctorAvailability = (
  doctorId: number | null,
  date: string
): UseDoctorAvailabilityReturn => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch available time slots from the API
   */
  const fetchAvailability = useCallback(async () => {
    if (!doctorId || !date) {
      setTimeSlots([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const availableSlots = await getAvailableSlots(doctorId, date);
      
      // Generate all possible time slots for the day (9 AM to 5 PM, 30-minute intervals)
      const allSlots = generateTimeSlots(date);
      
      // Mark slots as available or unavailable based on API response
      const slotsWithAvailability = allSlots.map(slot => ({
        time: slot,
        available: availableSlots.includes(slot),
        displayTime: formatTimeForDisplay(slot)
      }));
      
      setTimeSlots(slotsWithAvailability);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch available time slots';
      setError(errorMessage);
      setTimeSlots([]);
      console.error('Error fetching doctor availability:', err);
    } finally {
      setLoading(false);
    }
  }, [doctorId, date]);

  /**
   * Generate all possible time slots for a given date
   * @param date - Date in YYYY-MM-DD format
   * @returns Array of ISO 8601 time strings
   */
  const generateTimeSlots = (date: string): string[] => {
    const slots: string[] = [];
    const baseDate = new Date(date + 'T00:00:00');
    
    // Generate slots from 9 AM to 5 PM (30-minute intervals)
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(baseDate);
        slotTime.setHours(hour, minute, 0, 0);
        slots.push(slotTime.toISOString());
      }
    }
    
    return slots;
  };

  /**
   * Format ISO time string for display
   * @param isoTime - ISO 8601 time string
   * @returns Formatted time string (e.g., "2:30 PM")
   */
  const formatTimeForDisplay = (isoTime: string): string => {
    const date = new Date(isoTime);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  /**
   * Refresh the availability data
   */
  const refresh = () => {
    fetchAvailability();
  };

  // Fetch availability when doctorId or date changes
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return {
    timeSlots,
    loading,
    error,
    refresh
  };
};

/**
 * Helper function to check if a time slot is in the past
 * @param isoTime - ISO 8601 time string
 * @returns True if the time slot is in the past
 */
export const isTimeSlotInPast = (isoTime: string): boolean => {
  const slotTime = new Date(isoTime);
  const now = new Date();
  return slotTime <= now;
};

/**
 * Helper function to get the next available time slot
 * @param timeSlots - Array of time slots
 * @returns The next available time slot or null if none available
 */
export const getNextAvailableSlot = (timeSlots: TimeSlot[]): TimeSlot | null => {
  const now = new Date();
  
  for (const slot of timeSlots) {
    const slotTime = new Date(slot.time);
    if (slot.available && slotTime > now) {
      return slot;
    }
  }
  
  return null;
};