/**
 * Booking Executor Service
 * Executes pending bookings when their scheduled execution time arrives
 *
 * This service runs in the background and:
 * 1. Checks for bookings ready to execute (scheduled_execute_time <= now)
 * 2. Authenticates with GameTime.net using stored credentials
 * 3. Checks court availability and submits booking if available
 * 4. Updates booking status to "confirmed" or "failed"
 * 5. Retries up to 3 times if execution fails
 *
 * Workflow:
 * - Client user creates booking and specifies execution time
 * - BookingExecutor checks database every 60 seconds
 * - When scheduled time arrives, BookingExecutor executes the booking
 * - Updates database with confirmation ID or error message
 * - Frontend UI updates to show booking status
 *
 * Currently runs on the client when the app is active.
 */

import * as bookingService from './bookingService';
import * as credentialsService from './credentialsService';
import * as encryptionService from './encryptionService';
import * as playwrightBookingService from './playwrightBookingService';
import { Booking } from '../types/index';

export interface BookingExecutionResult {
  bookingId: string;
  success: boolean;
  confirmationId?: string;
  actualCourt?: number;
  error?: string;
}

/**
 * Execute a single booking immediately
 *
 * Steps:
 * 1. Login to GameTime with provided credentials
 * 2. Check court availability for the booking date
 * 3. Verify preferred court is available at the requested time
 * 4. Submit booking to GameTime
 * 5. Update database with confirmation ID or error
 * 6. Logout from GameTime
 *
 * @param booking Booking to execute
 * @param username GameTime username
 * @param gametimePassword GameTime password
 * @returns Booking execution result with confirmation ID if successful
 */
export async function executeBooking(
  booking: Booking,
  username: string,
  gametimePassword: string
): Promise<BookingExecutionResult> {
  try {
    console.log(`[BookingExecutor] Executing booking ${booking.id}`);
    console.log(`[BookingExecutor] Details: Court ${booking.preferred_court}, ${booking.booking_date} at ${booking.booking_time}`);

    // Map court number to court ID (Court 1 = 52, Court 3 = 52, Court 6 = 55)
    // Note: You may need to adjust this mapping based on actual court IDs
    const courtIdMap: Record<number, string> = {
      1: '52',
      2: '52',
      3: '52',
      4: '55',
      5: '55',
      6: '55'
    };

    const courtId = courtIdMap[booking.preferred_court] || booking.preferred_court.toString();

    // Execute booking using verified Playwright automation
    const result = await playwrightBookingService.executeBooking({
      username,
      password: gametimePassword,
      court: courtId,
      date: booking.booking_date,
      time: booking.booking_time,
      guestName: 'Guest Player'
    });

    if (result.success && result.bookingId) {
      // Update database with confirmation
      console.log(`[BookingExecutor] Booking confirmed! GameTime ID: ${result.bookingId}`);
      await bookingService.updateBookingWithGameTimeConfirmation(
        booking.id,
        result.bookingId,
        booking.preferred_court
      );

      return {
        bookingId: booking.id,
        success: true,
        confirmationId: result.bookingId,
        actualCourt: booking.preferred_court,
      };
    } else {
      throw new Error(result.error || 'Booking failed without specific error');
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
 *
 * This function:
 * - Queries database for bookings with scheduled_execute_time <= now
 * - Executes each booking with a small delay between requests
 * - Updates the Zustand store with new booking statuses
 * - Allows up to 3 retry attempts for failed bookings
 *
 * Called every 60 seconds by the booking executor interval
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

    if (bookings.length === 0) {
      console.log('[BookingExecutor] No pending bookings to execute');
      return [];
    }

    console.log(`[BookingExecutor] Found ${bookings.length} bookings to execute`);

    const results: BookingExecutionResult[] = [];

    // Execute each booking
    for (const booking of bookings) {
      // Get GameTime credentials from credentials table
      const { credential, error: credError } = await credentialsService.getCredentials(userId);

      if (credError || !credential) {
        console.warn(`[BookingExecutor] No GameTime credentials found for user ${userId}`);
        results.push({
          bookingId: booking.id,
          success: false,
          error: 'GameTime credentials not found',
        });
        continue;
      }

      // Credentials are already decrypted by credentialsService.getCredentials()
      const username = credential.username;
      const password = credential.password;

      console.log(`[BookingExecutor] Executing booking for user: ${username}`);

      const result = await executeBooking(booking, username, password);
      results.push(result);
      console.log(`[BookingExecutor] Booking ${booking.id} execution result:`, result);

      // Small delay between bookings to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[BookingExecutor] Executed ${results.length} bookings`);

    // Refresh the booking list in the Zustand store to show updated statuses
    try {
      // Dynamically import to avoid circular dependency
      const { useBookingStore } = await import('../store/bookingStore');
      const store = useBookingStore.getState();
      await store.loadUserBookings();
      console.log('[BookingExecutor] Refreshed booking list in Zustand store');
    } catch (refreshError) {
      console.error('[BookingExecutor] Error refreshing booking list:', refreshError);
    }

    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BookingExecutor] Error executing pending bookings:', message);
    return [];
  }
}


/**
 * Start the booking execution scheduler
 *
 * Starts a recurring timer that checks for pending bookings every 60 seconds.
 * Should be called when user authenticates in the app.
 * Stopped when user logs out.
 *
 * @param userId User ID to execute bookings for
 * @param intervalMs How often to check for pending bookings (default 60 seconds)
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
