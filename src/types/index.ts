/**
 * Core type definitions for the JC Court Booking Tool
 */

/**
 * User type representing an authenticated user
 */
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

/**
 * AuthState type representing the authentication state
 */
export interface AuthState {
  user: User | null;
  session: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Auth response type from Supabase
 */
export interface AuthResponse {
  user: User | null;
  session: string | null;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Register credentials
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * API Error response
 */
export interface APIError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Validation error for form fields
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Stored credentials for gametime.net
 */
export interface Credential {
  id: string;
  user_id: string;
  username: string;
  password: string; // Will be encrypted before storage
  created_at: string;
  updated_at: string;
}

/**
 * Credential state for Zustand store
 */
export interface CredentialState {
  credentials: Credential | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Credential input data (for UI forms)
 */
export interface CredentialInput {
  username: string;
  password: string;
}

/**
 * Booking recurrence pattern
 */
export type BookingRecurrence = 'once' | 'weekly' | 'bi-weekly' | 'monthly';

/**
 * Booking type
 */
export type BookingType = 'singles' | 'doubles';

/**
 * Duration in hours
 */
export type Duration = 1 | 1.5;

/**
 * Auto-booking status
 */
export type AutoBookStatus = 'pending' | 'in_progress' | 'success' | 'failed';

/**
 * Booking type representing a court booking
 */
export interface Booking {
  id: string;
  user_id: string;
  preferred_court: number; // 1-6
  accept_any_court: boolean;
  booking_date: string; // ISO format YYYY-MM-DD
  booking_time: string; // HH:mm format
  booking_type: BookingType; // 'singles' | 'doubles'
  duration_hours: Duration; // 1 or 1.5
  recurrence: BookingRecurrence;
  recurrence_end_date?: string; // Optional end date for recurring bookings
  actual_court?: number; // Which court was actually booked
  status: 'pending' | 'confirmed' | 'cancelled';
  auto_book_status: AutoBookStatus;
  scheduled_execute_time: string; // When to execute the auto-booking
  gametime_confirmation_id?: string;
  status_message?: string; // Success or error message
  retry_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Booking state for Zustand store
 */
export interface BookingState {
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;
  currentBooking: Booking | null;
}

/**
 * Booking input data (for UI forms)
 */
export interface BookingInput {
  preferred_court: number; // 1-6
  accept_any_court: boolean;
  booking_date: string; // ISO format YYYY-MM-DD
  booking_time: string; // HH:mm format
  booking_type: BookingType; // 'singles' | 'doubles'
  duration_hours: Duration; // 1 or 1.5
  recurrence: BookingRecurrence;
  recurrence_end_date?: string;
}
