/**
 * Booking Service
 * Handles all booking-related database operations through Supabase
 * This service manages:
 * - Creating new booking requests
 * - Fetching user's bookings
 * - Updating booking status
 * - Deleting/cancelling bookings
 * - Querying bookings by status for scheduler
 */

import { Booking, BookingInput, APIError } from "../types/index";
import { supabase } from "./authService";

/**
 * Create a new booking request
 * The scheduler service will later calculate scheduled_execute_time based on booking_date
 */
export async function createBooking(
  userId: string,
  bookingInput: BookingInput,
  scheduledExecuteTime: string
): Promise<{ booking: Booking | null; error: APIError | null }> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          user_id: userId,
          preferred_court: bookingInput.preferred_court,
          accept_any_court: bookingInput.accept_any_court,
          booking_date: bookingInput.booking_date,
          booking_time: bookingInput.booking_time,
          booking_type: bookingInput.booking_type,
          duration_hours: bookingInput.duration_hours,
          recurrence: bookingInput.recurrence,
          recurrence_end_date: bookingInput.recurrence_end_date,
          scheduled_execute_time: scheduledExecuteTime,
          status: "pending",
          auto_book_status: "pending",
          retry_count: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      return {
        booking: null,
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
        },
      };
    }

    return {
      booking: data as Booking,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      booking: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Get all bookings for a specific user
 * Also updates status for bookings where scheduled execution time has passed
 */
export async function getUserBookings(
  userId: string
): Promise<{ bookings: Booking[] | null; error: APIError | null }> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("booking_date", { ascending: true });

    if (error) {
      return {
        bookings: null,
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
        },
      };
    }

    const bookings = (data as Booking[]) || [];

    // Just return bookings as-is from database
    // PC backend server is responsible for updating status
    return {
      bookings,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      bookings: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Get a single booking by ID
 */
export async function getBookingById(
  bookingId: string
): Promise<{ booking: Booking | null; error: APIError | null }> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error) {
      return {
        booking: null,
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
        },
      };
    }

    return {
      booking: data as Booking,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      booking: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Update booking status (e.g., from 'pending' to 'confirmed' or 'cancelled')
 */
export async function updateBookingStatus(
  bookingId: string,
  status: "pending" | "confirmed" | "cancelled",
  autoBookStatus?: "pending" | "in_progress" | "success" | "failed"
): Promise<{ booking: Booking | null; error: APIError | null }> {
  try {
    const updateData: any = { status };

    if (autoBookStatus) {
      updateData.auto_book_status = autoBookStatus;
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      return {
        booking: null,
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
        },
      };
    }

    return {
      booking: data as Booking,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      booking: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Cancel a booking (set status to 'cancelled')
 */
export async function cancelBooking(
  bookingId: string
): Promise<{ success: boolean; error: APIError | null }> {
  try {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", auto_book_status: "failed" })
      .eq("id", bookingId);

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
        },
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: {
        message,
      },
    };
  }
}


/**
 * Delete a booking
 */
export async function deleteBooking(
  bookingId: string
): Promise<{ success: boolean; error: APIError | null }> {
  try {
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
        },
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: {
        message,
      },
    };
  }
}
