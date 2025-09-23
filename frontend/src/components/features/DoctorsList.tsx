import React from 'react';
import { useDoctorList } from '../../hooks/useDoctorList';
import { DoctorCard } from '../ui/DoctorCard';
import { Doctor } from '../../api/types/api';

interface DoctorsListProps {
  onDoctorSelect?: (doctor: Doctor) => void;
  showActiveOnly?: boolean;
  className?: string;
}

/**
 * DoctorsList component for displaying all doctors in a grid layout
 * 
 * @param onDoctorSelect - Optional callback when a doctor is selected
 * @param showActiveOnly - Whether to show only active doctors (default: false)
 * @param className - Additional CSS classes
 */
export const DoctorsList: React.FC<DoctorsListProps> = ({ 
  onDoctorSelect, 
  showActiveOnly = false,
  className = '' 
}) => {
  const { doctors, loading, error, refresh } = useDoctorList();

  // Filter doctors based on active status if needed
  const filteredDoctors = showActiveOnly 
    ? doctors.filter(doctor => doctor.is_active)
    : doctors;

  const handleDoctorClick = (doctor: Doctor) => {
    if (onDoctorSelect) {
      onDoctorSelect(doctor);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading doctors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <svg 
              className="mx-auto h-12 w-12 text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Doctors</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (filteredDoctors.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {showActiveOnly ? 'No Active Doctors Found' : 'No Doctors Found'}
          </h3>
          <p className="text-gray-600 mb-4">
            {showActiveOnly 
              ? 'There are currently no active doctors available.'
              : 'No doctors have been added to the system yet.'
            }
          </p>
          <button 
            onClick={refresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {showActiveOnly ? 'Active Doctors' : 'All Doctors'}
          </h2>
          <p className="text-gray-600">
            {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button 
          onClick={refresh}
          className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors duration-200"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDoctors.map((doctor) => (
          <DoctorCard 
            key={doctor.id} 
            doctor={doctor} 
            onClick={onDoctorSelect ? handleDoctorClick : undefined}
          />
        ))}
      </div>
    </div>
  );
};



export default DoctorsList;