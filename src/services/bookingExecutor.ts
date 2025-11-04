/**
 * Booking Executor Service
 *
 * NOTE: This service is now DISABLED in the mobile app.
 * All booking execution is handled by the Windows PC backend server.
 *
 * The backend server:
 * - Runs 24/7 on Windows PC at C:\ANNIE-PROJECT\jc\backend-server
 * - Checks database every 60 seconds for pending bookings
 * - Executes bookings using Playwright automation
 * - Updates database with confirmation IDs
 *
 * This mobile app only:
 * - Creates bookings and stores them in database
 * - Displays booking status from database
 * - Does NOT execute bookings (server handles that)
 */

import * as bookingService from './bookingService';
import * as credentialsService from './credentialsService';
import * as encryptionService from './encryptionService';
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
  // THIS FUNCTION IS NOW DISABLED
  // Booking execution is handled by the Windows PC backend server
  // The mobile app just creates bookings and displays status

  console.log(`[BookingExecutor] Mobile app does not execute bookings`);
  console.log(`[BookingExecutor] Booking ${booking.id} will be executed by PC server`);
  console.log(`[BookingExecutor] Server checks database every 60 seconds`);

  return {
    bookingId: booking.id,
    success: false,
    error: 'Execution handled by backend server',
  };
}

/**
 * Execute all pending bookings that are ready
 *
 * THIS FUNCTION IS NOW DISABLED - execution handled by backend server
 */
export async function executePendingBookings(userId: string): Promise<BookingExecutionResult[]> {
  // Mobile app does not execute bookings
  // Backend server handles all execution
  console.log(`[BookingExecutor] Execution disabled - handled by PC backend server`);
  return [];
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
