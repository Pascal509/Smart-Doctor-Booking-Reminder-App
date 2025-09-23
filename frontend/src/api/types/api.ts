// API Response Types
export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// Authentication Types
export interface LoginData {
  username: string;
  password: string;
}

// Doctor and Specialty Types
export interface Specialty {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialty_id: number;
  email?: string;
  phone?: string;
  license_number?: string;
  years_of_experience?: number;
  consultation_fee?: number;
  bio?: string;
  profile_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  specialty?: Specialty;
  appointments?: Appointment[];
}

// Data for creating a new doctor
export interface DoctorData {
  name: string;
  specialty_id: number;
  is_active?: boolean; // Optional, defaults to true
}

// API Client Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: ErrorResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Appointment Booking Types
export interface BookingData {
  doctor_id: number;
  appointment_time: string; // ISO 8601 format
  duration: number; // Duration in minutes (15-180)
  appointment_type?: 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY' | 'ROUTINE';
  notes?: string;
  reminder_type?: 'EMAIL' | 'SMS' | 'PUSH' | 'NONE';
  reminder_time?: number; // Minutes before appointment (5-1440)
}

export interface BookingResponse {
  appointment_id: number;
  doctor_id: number;
  patient_id: number;
  appointment_time: string;
  status: string;
  notes?: string;
  created_at: string;
  message: string;
}

export interface AppointmentStatus {
  id: number;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  appointment_time: string;
  doctor_name?: string;
  patient_name?: string;
}

// Complete Appointment interface for appointment lists
export interface Appointment {
  id: number;
  user_id: number;
  doctor_id: number;
  appointment_time: string;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  appointment_type: 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY' | 'ROUTINE';
  patient_notes?: string;
  doctor_notes?: string;
  is_recurring: boolean;
  recurring_pattern?: string;
  reminder_type: 'EMAIL' | 'SMS' | 'PUSH' | 'NONE';
  reminder_time: number;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Related entities (populated via joins)
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  doctor?: Doctor;
  
  // Smart scheduling fields
  priority_score?: number;
  conflict_resolution?: string;
  auto_scheduled?: boolean;
}

// Appointment list API response
export interface AppointmentListResponse extends ApiResponse<Appointment[]> {
  appointments: Appointment[];
  total: number;
}

// Cancellation request payload
export interface CancellationRequest {
  reason?: string;
}

// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api/v1';