import React, { useState } from 'react';
import { useDoctorAvailability, isTimeSlotInPast, getNextAvailableSlot } from '../../hooks/useDoctorAvailability';

interface TimeSlotPickerProps {
  doctorId: number | null;
  date: string;
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * TimeSlotPicker component for selecting available appointment time slots
 * 
 * @param doctorId - The ID of the doctor to show availability for
 * @param date - The date to show availability for (YYYY-MM-DD format)
 * @param selectedTime - Currently selected time slot (ISO 8601 format)
 * @param onTimeSelect - Callback function when a time slot is selected
 * @param className - Additional CSS classes
 * @param disabled - Whether the picker is disabled
 */
export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  doctorId,
  date,
  selectedTime,
  onTimeSelect,
  className = '',
  disabled = false
}) => {
  const { timeSlots, loading, error, refresh } = useDoctorAvailability(doctorId, date);
  const [showUnavailable, setShowUnavailable] = useState(false);

  // Filter slots based on availability and past time
  const availableSlots = timeSlots.filter(slot => 
    slot.available && !isTimeSlotInPast(slot.time)
  );
  
  const unavailableSlots = timeSlots.filter(slot => 
    !slot.available || isTimeSlotInPast(slot.time)
  );

  const handleTimeSelect = (time: string) => {
    if (disabled) return;
    onTimeSelect(time);
  };

  const handleQuickSelect = () => {
    const nextSlot = getNextAvailableSlot(timeSlots);
    if (nextSlot && !disabled) {
      onTimeSelect(nextSlot.time);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!doctorId || !date) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        <p>Please select a doctor and date to view available time slots.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Available Time Slots</h3>
            <p className="text-sm text-gray-600">{formatDate(date)}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {availableSlots.length > 0 && (
              <button
                onClick={handleQuickSelect}
                disabled={disabled}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Available
              </button>
            )}
            
            <button
              onClick={refresh}
              disabled={loading || disabled}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh availability"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading available time slots...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={refresh}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Time Slots */}
        {!loading && !error && (
          <div>
            {/* Available Slots */}
            {availableSlots.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Available ({availableSlots.length})
                  </h4>
                  {selectedTime && (
                    <span className="text-xs text-gray-500">
                      Selected: {timeSlots.find(slot => slot.time === selectedTime)?.displayTime}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    
                    return (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSelect(slot.time)}
                        disabled={disabled}
                        className={`
                          p-2 text-sm rounded-md border transition-all duration-200
                          ${isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                          }
                          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                        `}
                      >
                        {slot.displayTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="mb-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">No Available Slots</h4>
                <p className="text-sm text-gray-500">There are no available time slots for this date.</p>
              </div>
            )}

            {/* Show/Hide Unavailable Slots Toggle */}
            {unavailableSlots.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => setShowUnavailable(!showUnavailable)}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <svg 
                    className={`w-4 h-4 mr-2 transition-transform ${showUnavailable ? 'rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showUnavailable ? 'Hide' : 'Show'} unavailable slots ({unavailableSlots.length})
                </button>

                {/* Unavailable Slots */}
                {showUnavailable && (
                  <div className="mt-3">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {unavailableSlots.map((slot) => {
                        const isPast = isTimeSlotInPast(slot.time);
                        
                        return (
                          <div
                            key={slot.time}
                            className="p-2 text-sm rounded-md border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed relative"
                          >
                            {slot.displayTime}
                            {isPast && (
                              <span className="absolute top-0 right-0 -mt-1 -mr-1 w-2 h-2 bg-red-400 rounded-full" title="Past time" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <div className="flex items-center mr-4">
                        <div className="w-2 h-2 bg-red-400 rounded-full mr-1"></div>
                        Past time
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mr-1"></div>
                        Booked
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && timeSlots.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {availableSlots.length} of {timeSlots.length} slots available
            </span>
            <span>
              Times shown in your local timezone
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact version of TimeSlotPicker for use in smaller spaces
 */
export const CompactTimeSlotPicker: React.FC<TimeSlotPickerProps> = (props) => {
  return (
    <TimeSlotPicker
      {...props}
      className={`${props.className} compact-time-picker`}
    />
  );
};