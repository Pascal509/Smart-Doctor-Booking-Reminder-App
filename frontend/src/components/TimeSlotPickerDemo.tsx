import React, { useState } from 'react';
import { TimeSlotPicker } from './ui/TimeSlotPicker';
import { DoctorsList } from './features/DoctorsList';
import { Doctor } from '../api/types/api';

/**
 * Demo component to showcase the TimeSlotPicker functionality
 */
export const TimeSlotPickerDemo: React.FC = () => {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState<string>('');

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedTime(''); // Reset selected time when doctor changes
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
    setSelectedTime(''); // Reset selected time when date changes
  };

  const formatSelectedTime = (timeString: string) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 days from now
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Doctor Availability Demo
        </h1>
        <p className="text-gray-600">
          Select a doctor and date to view available appointment time slots
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Doctor Selection */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              1. Select a Doctor
            </h2>
            <DoctorsList
              onDoctorSelect={handleDoctorSelect}
              showActiveOnly={true}
              className="max-h-96 overflow-y-auto"
            />
          </div>

          {/* Date Selection */}
          {selectedDoctor && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                2. Select a Date
              </h2>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label htmlFor="appointment-date" className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Date
                </label>
                <input
                  type="date"
                  id="appointment-date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Select a date up to 30 days in advance
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Time Slot Selection */}
        <div className="space-y-4">
          {selectedDoctor && selectedDate && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                3. Select a Time Slot
              </h2>
              <TimeSlotPicker
                doctorId={selectedDoctor.id}
                date={selectedDate}
                selectedTime={selectedTime}
                onTimeSelect={handleTimeSelect}
              />
            </div>
          )}

          {/* Selection Summary */}
          {(selectedDoctor || selectedDate || selectedTime) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-3">
                Appointment Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700 font-medium">Doctor:</span>
                  <span className="text-blue-900">
                    {selectedDoctor ? `Dr. ${selectedDoctor.name}` : 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 font-medium">Date:</span>
                  <span className="text-blue-900">
                    {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 font-medium">Time:</span>
                  <span className="text-blue-900">
                    {selectedTime ? formatSelectedTime(selectedTime) : 'Not selected'}
                  </span>
                </div>
                {selectedDoctor && (
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">Specialty:</span>
                    <span className="text-blue-900">{selectedDoctor.specialty?.name || 'Not specified'}</span>
                  </div>
                )}
              </div>

              {selectedDoctor && selectedDate && selectedTime && (
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium">
                    Book Appointment
                  </button>
                  <p className="mt-2 text-xs text-blue-600 text-center">
                    This is a demo - booking functionality would be implemented separately
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      {!selectedDoctor && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Get Started
          </h3>
          <p className="text-gray-600">
            Select a doctor from the list on the left to begin viewing their available appointment slots.
          </p>
        </div>
      )}
    </div>
  );
};