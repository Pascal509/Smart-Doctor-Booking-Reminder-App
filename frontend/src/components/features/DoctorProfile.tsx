import React, { useState, useEffect } from 'react';
import { Doctor, DoctorData, Specialty } from '../../api/types/api';
import { updateDoctor } from '../../api/clients/doctorApi';
import { getActiveSpecialties } from '../../api/clients/specialtyApi';
import { useDoctor } from '../../hooks/useDoctor';

interface DoctorProfileProps {
  doctorId: number;
  onUpdate?: (updatedDoctor: Doctor) => void;
  onCancel?: () => void;
}

/**
 * DoctorProfile component for viewing and editing doctor information
 * 
 * @param doctorId - ID of the doctor to display/edit
 * @param onUpdate - Optional callback when doctor is successfully updated
 * @param onCancel - Optional callback when editing is cancelled
 */
export const DoctorProfile: React.FC<DoctorProfileProps> = ({ 
  doctorId, 
  onUpdate, 
  onCancel 
}) => {
  const { doctor, loading: doctorLoading, error: doctorError, refresh } = useDoctor(doctorId);
  const [isEditing, setIsEditing] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<DoctorData>>({
    name: '',
    specialty_id: 0,
    is_active: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load specialties when editing mode is enabled
  useEffect(() => {
    if (isEditing) {
      loadSpecialties();
    }
  }, [isEditing]);

  // Update form data when doctor data changes
  useEffect(() => {
    if (doctor) {
      setFormData({
        name: doctor.name,
        specialty_id: doctor.specialty_id,
        is_active: doctor.is_active
      });
    }
  }, [doctor]);

  const loadSpecialties = async () => {
    try {
      setLoadingSpecialties(true);
      const activeSpecialties = await getActiveSpecialties();
      setSpecialties(activeSpecialties);
    } catch (error) {
      console.error('Failed to load specialties:', error);
    } finally {
      setLoadingSpecialties(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Doctor name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Doctor name must be at least 2 characters';
    }
    
    if (!formData.specialty_id || formData.specialty_id === 0) {
      errors.specialty_id = 'Please select a specialty';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof DoctorData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const handleSave = async () => {
    if (!validateForm() || !doctor) return;
    
    try {
      setUpdating(true);
      setUpdateError(null);
      
      const updatedDoctor = await updateDoctor(doctor.id, formData);
      
      setUpdateSuccess(true);
      setIsEditing(false);
      
      // Refresh doctor data to get latest from server
      refresh();
      
      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate(updatedDoctor);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setUpdateSuccess(false), 3000);
      
    } catch (error: any) {
      setUpdateError(error.message || 'Failed to update doctor');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (doctor) {
      setFormData({
        name: doctor.name,
        specialty_id: doctor.specialty_id,
        is_active: doctor.is_active
      });
    }
    setFormErrors({});
    setUpdateError(null);
    setUpdateSuccess(false);
    setIsEditing(false);
    
    if (onCancel) {
      onCancel();
    }
  };

  if (doctorLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (doctorError) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-red-200 p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Doctor</h3>
          <p className="text-red-600 mb-4">{doctorError}</p>
          <button 
            onClick={refresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <p>Doctor not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {/* Doctor Avatar */}
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Dr. {doctor.name}
            </h2>
            <p className="text-sm text-gray-500">ID: {doctor.id}</p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          doctor.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {doctor.is_active ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Success Message */}
      {updateSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Doctor profile updated successfully!
          </div>
        </div>
      )}

      {/* Error Message */}
      {updateError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {updateError}
          </div>
        </div>
      )}

      {/* Doctor Information */}
      <div className="space-y-4">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Doctor Name
          </label>
          {isEditing ? (
            <div>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter doctor name"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-900">{doctor.name}</p>
          )}
        </div>

        {/* Specialty Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specialty
          </label>
          {isEditing ? (
            <div>
              <select
                value={formData.specialty_id || ''}
                onChange={(e) => handleInputChange('specialty_id', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.specialty_id ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loadingSpecialties}
              >
                <option value="">Select a specialty</option>
                {specialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </option>
                ))}
              </select>
              {formErrors.specialty_id && (
                <p className="mt-1 text-sm text-red-600">{formErrors.specialty_id}</p>
              )}
              {loadingSpecialties && (
                <p className="mt-1 text-sm text-gray-500">Loading specialties...</p>
              )}
            </div>
          ) : (
            <p className="text-gray-900">
              {doctor.specialty?.name || `Specialty ID: ${doctor.specialty_id}`}
            </p>
          )}
        </div>

        {/* Status Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          {isEditing ? (
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="is_active"
                  checked={formData.is_active === true}
                  onChange={() => handleInputChange('is_active', true)}
                  className="mr-2"
                />
                <span className="text-green-700">Active</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="is_active"
                  checked={formData.is_active === false}
                  onChange={() => handleInputChange('is_active', false)}
                  className="mr-2"
                />
                <span className="text-red-700">Inactive</span>
              </label>
            </div>
          ) : (
            <p className={`font-medium ${
              doctor.is_active ? 'text-green-700' : 'text-red-700'
            }`}>
              {doctor.is_active ? 'Active' : 'Inactive'}
            </p>
          )}
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created
            </label>
            <p className="text-gray-600 text-sm">
              {new Date(doctor.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Updated
            </label>
            <p className="text-gray-600 text-sm">
              {new Date(doctor.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        {isEditing ? (
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={updating}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {updating ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={updating}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Edit Doctor Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default DoctorProfile;