/**
 * Booking Scheduler Service
 * Calculates when bookings should be executed based on GameTime's 7-day rolling window
 *
 * LOGIC:
 * GameTime allows booking up to 7 days in advance.
 * New slots open at 8:00 AM UTC each day for that day + 7 days ahead.
 *
 * Examples:
 * - User wants to book for Friday (2025-10-31)
 * - 7 days before Friday is the previous Friday (2025-10-24)
 * - At 8:00 AM on 2025-10-24, that Friday slot becomes available on GameTime
 * - So we schedule the booking automation for 8:00 AM on 2025-10-24
 *
 * For recurring bookings:
 * - User wants to book every Friday at 6 PM
 * - Generate individual booking instances for each Friday within recurrence_end_date
 * - Calculate execute time for each instance (7 days before that Friday at 8:00 AM)
 */

import { BookingInput, BookingRecurrence, Booking } from "../types/index";
import * as bookingService from "./bookingService";

/**
 * Calculate the scheduled execute time for a booking
 * This is when the automation should run (8:00 AM on the 7-days-before date)
 *
 * @param bookingDate - The date user wants to book (YYYY-MM-DD format)
 * @returns ISO timestamp for when to execute the booking
 */
export function calculateScheduledExecuteTime(bookingDate: string): string {
  // Parse the booking date as UTC to avoid timezone issues
  const [year, month, day] = bookingDate.split("-").map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  // Calculate 7 days before
  const executeDate = new Date(targetDate);
  executeDate.setUTCDate(executeDate.getUTCDate() - 7);

  // Set time to 8:00 AM UTC
  executeDate.setUTCHours(8, 0, 0, 0);

  return executeDate.toISOString();
}

/**
 * Calculate the scheduled execute time with explicit UTC timezone
 * Ensures we're working in UTC consistently
 */
export function calculateScheduledExecuteTimeUTC(
  bookingDate: string
): string {
  // Parse YYYY-MM-DD format
  const [year, month, day] = bookingDate.split("-").map(Number);

  // Create date in UTC (this is the date the user wants to book)
  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  // Calculate 7 days before
  const executeDate = new Date(targetDate);
  executeDate.setUTCDate(executeDate.getUTCDate() - 7);

  // Set time to 8:00 AM UTC
  executeDate.setUTCHours(8, 0, 0, 0);
  executeDate.setUTCMinutes(0);
  executeDate.setUTCSeconds(0);

  return executeDate.toISOString();
}

/**
 * Generate individual booking dates for a recurring booking
 * Creates an array of dates based on recurrence pattern
 *
 * @param startDate - First booking date (YYYY-MM-DD)
 * @param recurrence - Recurrence pattern (once, weekly, bi-weekly, monthly)
 * @param endDate - Optional end date for recurrence (YYYY-MM-DD)
 * @param maxInstances - Maximum number of instances to generate (safety limit)
 * @returns Array of booking dates
 */
export function generateRecurringBookingDates(
  startDate: string,
  recurrence: BookingRecurrence,
  endDate?: string,
  maxInstances: number = 52 // Default: 1 year of weekly bookings
): string[] {
  if (recurrence === 'once') {
    return [startDate];
  }

  const dates: string[] = [];
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  let currentDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));

  // Determine recurrence interval in days
  let intervalDays = 7; // Default to weekly
  if (recurrence === 'bi-weekly') {
    intervalDays = 14;
  } else if (recurrence === 'monthly') {
    intervalDays = 30; // Approximate; will adjust for actual months
  }

  // Parse end date if provided (use UTC to avoid timezone issues)
  let endDateTime: Date | null = null;
  if (endDate) {
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
    endDateTime = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));
  }

  // Add start date
  dates.push(formatDate(currentDate));

  // Generate recurring dates
  while (dates.length < maxInstances) {
    if (recurrence === 'monthly') {
      // For monthly, add one month instead of 30 days (use UTC methods)
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    } else {
      // For weekly and bi-weekly, add the interval (use UTC methods)
      currentDate.setUTCDate(currentDate.getUTCDate() + intervalDays);
    }

    const dateString = formatDate(currentDate);
    dates.push(dateString);

    // Stop if we've reached the end date
    if (endDateTime && currentDate > endDateTime) {
      dates.pop(); // Remove the last date that exceeded end date
      break;
    }
  }

  return dates;
}

/**
 * Format a Date object to YYYY-MM-DD string (timezone-safe using UTC)
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if a booking date is in the future (for validation) - timezone-safe
 */
export function isDateInFuture(bookingDate: string): boolean {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const bookingDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));

  return bookingDateObj >= todayUTC;
}

/**
 * Validate that the scheduled execute time is not in the past
 * (should be at least a few minutes in the future to allow for processing)
 */
export function isScheduleTimeValid(scheduledExecuteTime: string): boolean {
  const scheduleTime = new Date(scheduledExecuteTime);
  const now = new Date();

  // Must be at least 5 minutes in the future
  const minAllowedTime = new Date(now.getTime() + 5 * 60 * 1000);

  return scheduleTime > minAllowedTime;
}

/**
 * Create a booking with all recurring instances (if applicable)
 * This is called when the user submits the booking form
 *
 * LOGIC:
 * - If booking is < 7 days away: Execute immediately in background (5 min from now)
 * - If booking is >= 7 days away: Schedule for 8:00 AM UTC (7 days before target date)
 * - Maximum booking window: 90 days in advance
 *
 * @param userId - User ID
 * @param bookingInput - Booking form input
 * @returns Created booking or null if error
 */
export async function createBookingWithSchedule(
  userId: string,
  bookingInput: BookingInput
): Promise<{ booking: Booking | null; error: string | null }> {
  try {
    // Validate booking date is in the future
    if (!isDateInFuture(bookingInput.booking_date)) {
      return {
        booking: null,
        error: "Booking date must be in the future",
      };
    }

    // Validate booking is not too far in advance (90-day max window) - use UTC to avoid timezone issues
    const [year, month, day] = bookingInput.booking_date.split("-").map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
    const maxDate = new Date(todayUTC);
    maxDate.setUTCDate(maxDate.getUTCDate() + 90);

    if (bookingDate > maxDate) {
      return {
        booking: null,
        error: "Booking date must be within 90 days from now",
      };
    }

    // Calculate days until booking (using UTC to avoid timezone issues)
    const daysUntilBooking = Math.floor(
      (bookingDate.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine execution time based on booking window
    let scheduledExecuteTime: string;

    if (daysUntilBooking < 7) {
      // Booking is within 7 days: Execute immediately in background (5 seconds from now)
      // The court slot is already available on GameTime now
      const now = new Date();
      scheduledExecuteTime = new Date(now.getTime() + 5 * 1000).toISOString();
    } else {
      // Booking is 7+ days away: Schedule for 8:00 AM UTC (7 days before target date)
      // When this time arrives, the court slot will become available on GameTime
      scheduledExecuteTime = calculateScheduledExecuteTimeUTC(
        bookingInput.booking_date
      );

      // Validate that scheduled execute time is not in the past (edge case)
      if (!isScheduleTimeValid(scheduledExecuteTime)) {
        return {
          booking: null,
          error: "Invalid booking date - scheduled execution would be in the past",
        };
      }
    }

    // Create the main booking
    const { booking, error: createError } = await bookingService.createBooking(
      userId,
      bookingInput,
      scheduledExecuteTime
    );

    if (createError) {
      return {
        booking: null,
        error: createError.message,
      };
    }

    if (!booking) {
      return {
        booking: null,
        error: "Failed to create booking",
      };
    }

    // If this is a recurring booking, generate future instances
    // (The actual creation of individual booking instances would happen
    // in the scheduler service when executing each one)

    return {
      booking,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      booking: null,
      error: message,
    };
  }
}

/**
 * Get booking statistics (for UI display)
 */
export function getBookingStatistics(booking: Booking): {
  daysUntilBooking: number;
  daysUntilExecution: number;
  isUpcoming: boolean;
} {
  const now = new Date();
  const [year, month, day] = booking.booking_date.split("-").map(Number);
  const bookingDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const daysUntilBooking = Math.ceil(
    (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const executeDate = new Date(booking.scheduled_execute_time);
  const daysUntilExecution = Math.ceil(
    (executeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    daysUntilBooking,
    daysUntilExecution,
    isUpcoming: booking.status === "pending" && booking.auto_book_status === "pending",
  };
}
