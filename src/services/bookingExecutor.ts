/**
 * Booking Executor Service
 * Executes pending bookings when their scheduled execution time arrives
 *
 * This service runs in the background and:
 * 1. Checks for bookings ready to execute (scheduled_execute_time <= now)
 * 2. Attempts to book on GameTime.net using real API integration
 * 3. Updates booking status to "confirmed" or "failed"
 *
 * NOTE: As of 2025-10-24, the GameTime API booking submission endpoint
 * has not yet been discovered. This service is ready to use the real API
 * once the endpoint is identified. See GAMETIME_API_RESEARCH.md for details.
 *
 * In production, this would run as a cron job on a backend server.
 * For now, it runs on the client when the app is active.
 */

import * as bookingService from './bookingService';
import * as credentialsService from './credentialsService';
import { gametimeApi } from './gametimeApiService';
import { Booking } from '../types/index';

export interface BookingExecutionResult {
  bookingId: string;
  success: boolean;
  confirmationId?: string;
  actualCourt?: number;
  error?: string;
}

/**
 * Execute a single booking using real GameTime API
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
    console.log(`[BookingExecutor] Executing booking ${booking.id} for ${booking.booking_date} at ${booking.booking_time}`);

    // Step 1: Login to GameTime
    console.log('[BookingExecutor] Authenticating with GameTime...');
    const loginSuccess = await gametimeApi.login(username, gametimePassword);

    if (!loginSuccess) {
      throw new Error('Failed to authenticate with GameTime');
    }

    // Step 2: Check court availability
    console.log(`[BookingExecutor] Checking availability for ${booking.booking_date}...`);
    const courtData = await gametimeApi.getCourtAvailability(booking.booking_date);

    if (!courtData) {
      throw new Error('Failed to fetch court availability');
    }

    // Step 3: Verify preferred court is available at requested time
    const availableSlots = gametimeApi.parseAvailableSlots(courtData, booking.booking_date);
    const durationMinutes = Math.round(booking.duration_hours * 60);

    // Find matching slot
    const matchingSlot = availableSlots.find(
      slot =>
        (slot.courtNumber === booking.preferred_court || booking.accept_any_court) &&
        slot.startTime === booking.booking_time &&
        slot.durationMinutes >= durationMinutes
    );

    if (!matchingSlot && !booking.accept_any_court) {
      throw new Error(
        `Preferred court ${booking.preferred_court} not available at ${booking.booking_time} for ${durationMinutes} minutes`
      );
    }

    const courtToBook = matchingSlot ? matchingSlot.courtNumber : booking.preferred_court;

    // Step 4: Submit booking to GameTime
    console.log(`[BookingExecutor] Submitting booking for court ${courtToBook}...`);
    const bookingResult = await gametimeApi.submitBooking(
      courtToBook,
      booking.booking_date,
      booking.booking_time,
      durationMinutes,
      booking.booking_type === 'singles' ? 2 : 4  // Player count based on booking type
    );

    if (!bookingResult) {
      throw new Error('Booking submission failed');
    }

    // Step 5: Update database with confirmation
    console.log(`[BookingExecutor] Booking confirmed! ID: ${bookingResult.confirmationId}`);
    await bookingService.updateBookingWithGameTimeConfirmation(
      booking.id,
      bookingResult.confirmationId,
      bookingResult.actualCourt
    );

    // Step 6: Logout
    await gametimeApi.logout();

    return {
      bookingId: booking.id,
      success: true,
      confirmationId: bookingResult.confirmationId,
      actualCourt: bookingResult.actualCourt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[BookingExecutor] Error executing booking ${booking.id}:`, message);

    // Logout on error
    try {
      await gametimeApi.logout();
    } catch (logoutError) {
      console.warn('[BookingExecutor] Error during logout:', logoutError);
    }

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

    if (bookings.length === 0) {
      console.log('[BookingExecutor] No pending bookings to execute');
      return [];
    }

    console.log(`[BookingExecutor] Found ${bookings.length} bookings to execute`);

    const results: BookingExecutionResult[] = [];

    // Execute each booking
    for (const booking of bookings) {
      // Get GameTime credentials from credentials table
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

      // Get username (from booking or auth context)
      // TODO: Fetch actual username from credentials table or auth context
      const username = booking.user_email || 'annieyang';  // Fallback - should come from credentials

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
