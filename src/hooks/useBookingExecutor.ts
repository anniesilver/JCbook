/**
 * useBookingExecutor Hook
 *
 * NOTE: This hook is now DISABLED since booking execution is handled by the PC backend server.
 * The mobile app only creates bookings and displays status.
 *
 * Previously managed:
 * - Booking executor lifecycle (start/stop)
 * - Keep-awake functionality for pending bookings
 *
 * Now:
 * - Does nothing (placeholder for potential future use)
 * - Backend server handles all booking execution
 *
 * @param intervalMs Unused (kept for API compatibility)
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useBookingExecutor(intervalMs: number = 60000): void {
  const { user } = useAuthStore();

  // Hook is disabled - booking execution handled by PC backend server
  useEffect(() => {
    if (user?.id) {
      console.log('[useBookingExecutor] Hook disabled - bookings executed by PC backend server');
    }
  }, [user?.id]);

  // No keep-awake needed - mobile app doesn't execute bookings
  // Backend server runs 24/7 on Windows PC
}
