/**
 * useBookingExecutor Hook
 * Starts the booking executor service when user is authenticated
 * Executes pending bookings every 60 seconds
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import * as bookingExecutor from '../services/bookingExecutor';

export function useBookingExecutor(intervalMs: number = 60000): void {
  const { user } = useAuthStore();

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
}
