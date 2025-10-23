/**
 * Supabase Bookings Service
 * Handles all booking operations with Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { Booking, BookingInput, APIError } from '../types/index';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Parse booking data from Supabase response
 */
function parseBooking(data: any): Booking {
  return {
    id: data.id,
    user_id: data.user_id,
    court: data.court,
    booking_date: data.booking_date,
    booking_time: data.booking_time,
    number_of_players: data.number_of_players,
    recurrence: data.recurrence,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Create a new booking
 */
export async function createBooking(
  userId: string,
  bookingData: BookingInput
): Promise<{
  booking: Booking | null;
  error: APIError | null;
}> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          user_id: userId,
          court: bookingData.court,
          booking_date: bookingData.booking_date,
          booking_time: bookingData.booking_time,
          number_of_players: bookingData.number_of_players,
          recurrence: bookingData.recurrence,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      return {
        booking: null,
        error: {
          message: error.message || 'Failed to create booking',
          code: error.code,
        },
      };
    }

    return {
      booking: parseBooking(data),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create booking';
    return {
      booking: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Get user's bookings
 */
export async function getUserBookings(userId: string): Promise<{
  bookings: Booking[];
  error: APIError | null;
}> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('booking_date', { ascending: false });

    if (error) {
      return {
        bookings: [],
        error: {
          message: error.message || 'Failed to fetch bookings',
          code: error.code,
        },
      };
    }

    return {
      bookings: (data || []).map(parseBooking),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch bookings';
    return {
      bookings: [],
      error: {
        message,
      },
    };
  }
}

/**
 * Update a booking
 */
export async function updateBooking(
  bookingId: string,
  updates: Partial<BookingInput>
): Promise<{
  booking: Booking | null;
  error: APIError | null;
}> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return {
        booking: null,
        error: {
          message: error.message || 'Failed to update booking',
          code: error.code,
        },
      };
    }

    return {
      booking: parseBooking(data),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update booking';
    return {
      booking: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Delete a booking
 */
export async function deleteBooking(bookingId: string): Promise<APIError | null> {
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);

    if (error) {
      return {
        message: error.message || 'Failed to delete booking',
        code: error.code,
      };
    }

    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete booking';
    return {
      message,
    };
  }
}

/**
 * Get a single booking by ID
 */
export async function getBookingById(bookingId: string): Promise<{
  booking: Booking | null;
  error: APIError | null;
}> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      return {
        booking: null,
        error: {
          message: error.message || 'Failed to fetch booking',
          code: error.code,
        },
      };
    }

    return {
      booking: parseBooking(data),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch booking';
    return {
      booking: null,
      error: {
        message,
      },
    };
  }
}
