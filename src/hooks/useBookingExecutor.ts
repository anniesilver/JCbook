/**
 * useBookingExecutor Hook
 *
 * Manages the lifecycle of the booking executor service:
 * - Starts booking executor when user logs in (has user ID)
 * - Stops booking executor when user logs out (no user ID)
 * - Automatically stops when component unmounts (app closes)
 * - Activates keep-awake when pending bookings exist
 * - Deactivates keep-awake when no pending bookings
 *
 * The executor checks for pending bookings every 60 seconds and executes
 * any booking whose scheduled execution time has arrived.
 *
 * @param intervalMs How often to check for pending bookings (default 60 seconds)
 */

import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwakeAsync } from 'expo-keep-awake';
import { useAuthStore } from '../store/authStore';
import { useBookingStore } from '../store/bookingStore';
import * as bookingExecutor from '../services/bookingExecutor';

export function useBookingExecutor(intervalMs: number = 60000): void {
  const { user } = useAuthStore();
  const { bookings } = useBookingStore();

  // Effect: Manage booking executor lifecycle
  useEffect(() => {
    if (!user?.id) {
      // Stop executor if user logs out
      bookingExecutor.stopBookingExecutor();
      return;
    }

    // Start booking executor for this user
    console.log('[useBookingExecutor] Starting booking executor for user:', user.id);
    bookingExecutor.startBookingExecutor(user.id, intervalMs);

    // Cleanup: stop executor when component unmounts
    return () => {
      bookingExecutor.stopBookingExecutor();
    };
  }, [user?.id, intervalMs]);

  // Effect: Manage keep-awake based on pending bookings
  useEffect(() => {
    const hasPendingBookings = bookings.some(
      b => b.status === 'pending' || b.auto_book_status === 'pending'
    );

    if (hasPendingBookings) {
      console.log('[useBookingExecutor] Activating keep-awake - pending bookings exist');
      activateKeepAwakeAsync('booking-executor').catch(err => {
        console.warn('[useBookingExecutor] Failed to activate keep-awake:', err);
      });
    } else {
      console.log('[useBookingExecutor] Deactivating keep-awake - no pending bookings');
      deactivateKeepAwakeAsync('booking-executor').catch(err => {
        console.warn('[useBookingExecutor] Failed to deactivate keep-awake:', err);
      });
    }

    // Cleanup: deactivate keep-awake when component unmounts
    return () => {
      deactivateKeepAwakeAsync('booking-executor').catch(err => {
        console.warn('[useBookingExecutor] Failed to deactivate keep-awake on cleanup:', err);
      });
    };
  }, [bookings]);
}
