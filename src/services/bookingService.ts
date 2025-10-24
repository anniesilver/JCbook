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

import { createClient } from "@supabase/supabase-js";
import { Booking, BookingInput, APIError } from "../types/index";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials not configured");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const now = new Date();

    // Update auto_book_status for bookings where scheduled execution time has passed
    // This reflects the actual state: if execution time passed and it's still pending,
    // it means the automation service should have executed it
    for (const booking of bookings) {
      const scheduledTime = new Date(booking.scheduled_execute_time);

      // If the scheduled execution time has passed but status is still pending,
      // update the display status to "processing" to show it's being/should be executed
      if (
        booking.auto_book_status === "pending" &&
        booking.status === "pending" &&
        scheduledTime <= now
      ) {
        // In production, there would be a background job that updates this
        // For now, we update it to "processing" to reflect the actual state
        booking.auto_book_status = "processing";
      }
    }

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
 * Get all pending bookings that should be executed (used by scheduler service)
 * Returns bookings where:
 * - auto_book_status is 'pending'
 * - scheduled_execute_time is <= current time OR booking_date is <= today + 7 days (within booking window)
 * - status is 'pending' (not cancelled)
 */
export async function getPendingBookingsToExecute(): Promise<{
  bookings: Booking[] | null;
  error: APIError | null;
}> {
  try {
    const now = new Date();
    const nowISO = now.toISOString();

    // Calculate 7 days from now (booking window cutoff)
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysISO = sevenDaysFromNow.toISOString().split('T')[0]; // Get YYYY-MM-DD

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("auto_book_status", "pending")
      .eq("status", "pending")
      .or(`scheduled_execute_time.lte.${nowISO},booking_date.lte.${sevenDaysISO}`)
      .order("scheduled_execute_time", { ascending: true });

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

    return {
      bookings: (data as Booking[]) || [],
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
 * Update booking with GameTime confirmation details after successful booking
 */
export async function updateBookingWithGameTimeConfirmation(
  bookingId: string,
  gametimeConfirmationId: string,
  actualCourt: number
): Promise<{ booking: Booking | null; error: APIError | null }> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({
        auto_book_status: "success",
        status: "confirmed",
        gametime_confirmation_id: gametimeConfirmationId,
        actual_court: actualCourt,
      })
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
 * Update booking with error details after failed booking attempt
 */
export async function updateBookingWithError(
  bookingId: string,
  errorMessage: string,
  retryCount: number
): Promise<{ booking: Booking | null; error: APIError | null }> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({
        auto_book_status: retryCount < 3 ? "pending" : "failed", // Allow 3 retries
        error_message: errorMessage,
        retry_count: retryCount,
      })
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
