/**
 * Custom Hook: useBooking
 * Provides booking management functionality with Zustand store
 */

import { useCallback } from 'react';
import { useBookingStore } from '../store/bookingStore';
import { Booking, BookingInput } from '../types/index';

/**
 * Hook for managing bookings
 */
export function useBooking() {
  const {
    bookings,
    isLoading,
    error,
    currentBooking,
    createBooking: storeCreateBooking,
    loadUserBookings,
    updateBookingStatus,
    cancelBooking: storeCancelBooking,
    deleteBooking: storeDeleteBooking,
    getUpcomingBookings,
    getConfirmedBookings,
    setCurrentBooking,
    clearError,
  } = useBookingStore();

  /**
   * Create a new booking
   */
  const createBooking = useCallback(
    async (userId: string, bookingData: BookingInput) => {
      return await storeCreateBooking(userId, bookingData);
    },
    [storeCreateBooking]
  );

  /**
   * Load user's bookings
   */
  const getBookings = useCallback(
    async (userId: string) => {
      await loadUserBookings(userId);
    },
    [loadUserBookings]
  );

  /**
   * Update booking status
   */
  const updateBooking = useCallback(
    async (bookingId: string, status: 'pending' | 'confirmed' | 'cancelled') => {
      await updateBookingStatus(bookingId, status);
    },
    [updateBookingStatus]
  );

  /**
   * Cancel a booking
   */
  const cancelBooking = useCallback(
    async (bookingId: string) => {
      await storeCancelBooking(bookingId);
    },
    [storeCancelBooking]
  );

  /**
   * Delete a booking
   */
  const deleteBooking = useCallback(
    async (bookingId: string) => {
      await storeDeleteBooking(bookingId);
    },
    [storeDeleteBooking]
  );

  /**
   * Set the current booking for editing
   */
  const selectBooking = useCallback(
    (booking: Booking | null) => {
      setCurrentBooking(booking);
    },
    [setCurrentBooking]
  );

  return {
    bookings,
    isLoading,
    error,
    currentBooking,
    createBooking,
    getBookings,
    updateBooking,
    cancelBooking,
    deleteBooking,
    selectBooking,
    getUpcomingBookings,
    getConfirmedBookings,
    clearError,
  };
}
