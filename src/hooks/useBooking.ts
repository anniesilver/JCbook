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
    getBookings: storeGetBookings,
    updateBooking: storeUpdateBooking,
    deleteBooking: storeDeleteBooking,
    setCurrentBooking,
    clearError,
    clearBookings,
  } = useBookingStore();

  /**
   * Create a new booking
   */
  const createBooking = useCallback(
    async (userId: string, bookingData: BookingInput) => {
      await storeCreateBooking(userId, bookingData);
    },
    [storeCreateBooking]
  );

  /**
   * Get user's bookings
   */
  const getBookings = useCallback(
    async (userId: string) => {
      await storeGetBookings(userId);
    },
    [storeGetBookings]
  );

  /**
   * Update an existing booking
   */
  const updateBooking = useCallback(
    async (bookingId: string, updates: Partial<BookingInput>) => {
      await storeUpdateBooking(bookingId, updates);
    },
    [storeUpdateBooking]
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
    deleteBooking,
    selectBooking,
    clearError,
    clearBookings,
  };
}
