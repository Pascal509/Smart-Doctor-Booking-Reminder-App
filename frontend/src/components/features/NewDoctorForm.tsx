import React, { useState, useEffect } from 'react';
import { DoctorData, Specialty } from '../../api/types/api';
import { createDoctor } from '../../api/clients/doctorApi';
import { getActiveSpecialties } from '../../api/clients/specialtyApi';

interface NewDoctorFormProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * NewDoctorForm component for creating new doctors
 * 
 * @param onSuccess - Callback function called when doctor is created successfully
 * @param onError - Callback function called when an error occurs
 * @param onCancel - Callback function called when form is cancelled
 * @param className - Additional CSS classes
 */
export const NewDoctorForm: React.FC<NewDoctorFormProps> = ({
  onSuccess,
  onError,
  onCancel,
  className = ''
}) => {
  const [formData, setFormData] = useState<DoctorData>({
    name: '',
    specialty_id: 0,
    is_active: true
  });
  
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSpecialties, setIsLoadingSpecialties] = useState(true);
  const [errors, setErrors] = useState<{
    name?: string;
    specialty_id?: string;
    general?: string;
  }>({});

  // Load specialties on component mount
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        setIsLoadingSpecialties(true);
        const specialtiesData = await getActiveSpecialties();
        setSpecialties(specialtiesData);
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load specialties';
        setErrors(prev => ({ ...prev, general: errorMessage }));
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setIsLoadingSpecialties(false);
      }
    };

    loadSpecialties();
  }, [onError]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Doctor name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Doctor name must be at least 2 characters long';
    }

    if (!formData.specialty_id || formData.specialty_id <= 0) {
      newErrors.specialty_id = 'Please select a specialty';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await createDoctor(formData);
      
      // Reset form
      setFormData({
        name: '',
        specialty_id: 0,
        is_active: true
      });
      
      const successMessage = `Doctor "${formData.name}" has been created successfully!`;
      if (onSuccess) {
        onSuccess(successMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create doctor';
      setErrors(prev => ({ ...prev, general: errorMessage }));
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof DoctorData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Doctor</h2>
        <p className="text-gray-600">Fill in the information below to create a new doctor profile.</p>
      </div>

      {/* General Error Message */}
      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{errors.general}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Doctor Name */}
        <div>
          <label htmlFor="doctorName" className="block text-sm font-medium text-gray-700 mb-2">
            Doctor Name *
          </label>
          <input
            type="text"
            id="doctorName"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter doctor's full name"
            disabled={isSubmitting}
            required
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Specialty Selection */}
        <div>
          <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-2">
            Medical Specialty *
          </label>
          <select
            id="specialty"
            value={formData.specialty_id}
            onChange={(e) => handleInputChange('specialty_id', parseInt(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.specialty_id ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isSubmitting || isLoadingSpecialties}
            required
          >
            <option value={0}>Select a specialty</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
          {errors.specialty_id && (
            <p className="mt-1 text-sm text-red-600">{errors.specialty_id}</p>
          )}
          {isLoadingSpecialties && (
            <p className="mt-1 text-sm text-gray-500">Loading specialties...</p>
          )}
        </div>

        {/* Active Status */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <span className="ml-2 text-sm text-gray-700">
              Active (doctor can accept new appointments)
            </span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            disabled={isSubmitting || isLoadingSpecialties}
          >
            {isSubmitting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? 'Creating...' : 'Create Doctor'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDoctorForm;