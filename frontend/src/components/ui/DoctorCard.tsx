import React from 'react';
import { Doctor } from '../../api/types/api';

interface DoctorCardProps {
  doctor: Doctor;
  onClick?: (doctor: Doctor) => void;
}

/**
 * DoctorCard component for displaying individual doctor information
 * 
 * @param doctor - Doctor object containing doctor details
 * @param onClick - Optional click handler for doctor selection
 */
export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(doctor);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg hover:border-blue-300 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={handleClick}
    >
      {/* Doctor Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Doctor Avatar */}
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-6 h-6 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>
          
          {/* Doctor Name */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Dr. {doctor.name}
            </h3>
            <p className="text-sm text-gray-500">
              ID: {doctor.id}
            </p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          doctor.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {doctor.is_active ? 'Active' : 'Inactive'}
        </div>
      </div>
      
      {/* Doctor Details */}
      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <svg 
            className="w-4 h-4 mr-2 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" 
            />
          </svg>
          <span>Specialty ID: {doctor.specialty_id}</span>
        </div>
        
        {doctor.specialty && (
          <div className="flex items-center text-sm text-gray-600">
            <svg 
              className="w-4 h-4 mr-2 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            <span>{doctor.specialty.name}</span>
          </div>
        )}
        
        <div className="flex items-center text-sm text-gray-600">
          <svg 
            className="w-4 h-4 mr-2 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-9 0a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1H7z" 
            />
          </svg>
          <span>Joined: {new Date(doctor.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      
      {/* Action Button (if clickable) */}
      {onClick && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button className="w-full bg-blue-50 text-blue-600 py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors duration-200">
            View Details
          </button>
        </div>
      )}
    </div>
  );
};

export default DoctorCard;