/**
 * Booking Executor Service
 * Executes pending bookings when their scheduled execution time arrives
 *
 * This service runs in the background and:
 * 1. Checks for bookings ready to execute (scheduled_execute_time <= now)
 * 2. Attempts to book on GameTime.net (via backend API)
 * 3. Updates booking status to "confirmed" or "failed"
 *
 * In production, this would run as a cron job on a backend server.
 * For now, it runs on the client when the app is active.
 */

import * as bookingService from './bookingService';
import * as credentialsService from './credentialsService';
import { Booking } from '../types/index';

export interface BookingExecutionResult {
  bookingId: string;
  success: boolean;
  confirmationId?: string;
  actualCourt?: number;
  error?: string;
}

/**
 * Execute a single booking
 * This would call a backend API that uses Puppeteer to book on GameTime
 */
export async function executeBooking(
  booking: Booking,
  gametimePassword: string
): Promise<BookingExecutionResult> {
  try {
    console.log(`[BookingExecutor] Executing booking ${booking.id} for ${booking.booking_date} at ${booking.booking_time}`);

    // In production, this would call a backend API:
    // const response = await fetch('/api/execute-booking', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     bookingId: booking.id,
    //     username: booking.user_email,
    //     password: gametimePassword,
    //     preferredCourt: booking.preferred_court,
    //     acceptAnyCourtIfPreferred: booking.accept_any_court,
    //     bookingDate: booking.booking_date,
    //     bookingTime: booking.booking_time,
    //     bookingType: booking.booking_type,
    //     durationHours: booking.duration_hours,
    //   })
    // });

    // For now, simulate the execution
    const simulatedResult = simulateBookingExecution(booking);

    if (simulatedResult.success) {
      // Update booking with success
      await bookingService.updateBookingWithGameTimeConfirmation(
        booking.id,
        simulatedResult.confirmationId || `CONF-${booking.id}`,
        simulatedResult.actualCourt || booking.preferred_court
      );

      return {
        bookingId: booking.id,
        success: true,
        confirmationId: simulatedResult.confirmationId,
        actualCourt: simulatedResult.actualCourt,
      };
    } else {
      // Update booking with error
      const retryCount = (booking.retry_count || 0) + 1;
      await bookingService.updateBookingWithError(
        booking.id,
        simulatedResult.error || 'Booking failed',
        retryCount
      );

      return {
        bookingId: booking.id,
        success: false,
        error: simulatedResult.error,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[BookingExecutor] Error executing booking ${booking.id}:`, message);

    // Update booking with error
    const retryCount = (booking.retry_count || 0) + 1;
    await bookingService.updateBookingWithError(
      booking.id,
      message,
      retryCount
    );

    return {
      bookingId: booking.id,
      success: false,
      error: message,
    };
  }
}

/**
 * Execute all pending bookings that are ready
 * Call this periodically (every minute) to check for bookings to execute
 */
export async function executePendingBookings(userId: string): Promise<BookingExecutionResult[]> {
  try {
    console.log(`[BookingExecutor] Checking for pending bookings to execute...`);

    // Get pending bookings for this user
    const { bookings, error } = await bookingService.getPendingBookingsToExecute();

    if (error || !bookings) {
      console.error('[BookingExecutor] Error fetching pending bookings:', error);
      return [];
    }

    const results: BookingExecutionResult[] = [];

    // Execute each booking
    for (const booking of bookings) {
      // Get GameTime password from credentials
      const password = await credentialsService.getGameTimePassword(userId);

      if (!password) {
        console.warn(`[BookingExecutor] No GameTime password found for user ${userId}`);
        results.push({
          bookingId: booking.id,
          success: false,
          error: 'GameTime credentials not found',
        });
        continue;
      }

      const result = await executeBooking(booking, password);
      results.push(result);

      // Small delay between bookings to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[BookingExecutor] Executed ${results.length} bookings`);
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BookingExecutor] Error executing pending bookings:', message);
    return [];
  }
}

/**
 * Simulate booking execution for testing
 * In production, this would actually interact with GameTime.net via Puppeteer
 *
 * For now:
 * - 80% chance of success (confirmed)
 * - 20% chance of failure (no available courts)
 */
function simulateBookingExecution(booking: Booking): {
  success: boolean;
  confirmationId?: string;
  actualCourt?: number;
  error?: string;
} {
  const random = Math.random();

  // 80% success rate
  if (random < 0.8) {
    // Randomly assign a court (preferred or any available)
    const assignedCourt = booking.accept_any_court
      ? Math.floor(Math.random() * 6) + 1
      : booking.preferred_court;

    return {
      success: true,
      confirmationId: `CONF-${booking.id.substring(0, 8).toUpperCase()}`,
      actualCourt: assignedCourt,
    };
  } else {
    // 20% failure rate
    return {
      success: false,
      error: 'No courts available at this time',
    };
  }
}

/**
 * Start the booking execution scheduler
 * This should be called when the app starts
 * In production, this would run on a backend server
 */
let executorInterval: NodeJS.Timeout | null = null;

export function startBookingExecutor(userId: string, intervalMs: number = 60000): void {
  if (executorInterval) {
    console.warn('[BookingExecutor] Executor already running');
    return;
  }

  console.log(`[BookingExecutor] Starting booking executor (interval: ${intervalMs}ms)`);

  // Execute immediately
  executePendingBookings(userId);

  // Then execute at regular intervals
  executorInterval = setInterval(() => {
    executePendingBookings(userId);
  }, intervalMs);
}

export function stopBookingExecutor(): void {
  if (executorInterval) {
    clearInterval(executorInterval);
    executorInterval = null;
    console.log('[BookingExecutor] Booking executor stopped');
  }
}

export function isBookingExecutorRunning(): boolean {
  return executorInterval !== null;
}
