/**
 * Zustand Booking Store
 * Manages booking state globally
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Booking, BookingState, BookingInput } from '../types/index';
import * as bookingsService from '../services/bookingsService';

/**
 * Booking store type
 */
interface BookingStore extends BookingState {
  /**
   * Create a new booking
   */
  createBooking: (userId: string, bookingData: BookingInput) => Promise<void>;

  /**
   * Get user's bookings
   */
  getBookings: (userId: string) => Promise<void>;

  /**
   * Update an existing booking
   */
  updateBooking: (bookingId: string, updates: Partial<BookingInput>) => Promise<void>;

  /**
   * Delete a booking
   */
  deleteBooking: (bookingId: string) => Promise<void>;

  /**
   * Set current booking for editing
   */
  setCurrentBooking: (booking: Booking | null) => void;

  /**
   * Clear error message
   */
  clearError: () => void;

  /**
   * Clear all bookings
   */
  clearBookings: () => void;
}

/**
 * Create booking store with Zustand
 */
export const useBookingStore = create<BookingStore>()(
  immer((set) => ({
    bookings: [],
    isLoading: false,
    error: null,
    currentBooking: null,

    createBooking: async (userId: string, bookingData: BookingInput) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { booking, error } = await bookingsService.createBooking(userId, bookingData);

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        if (booking) {
          set((state) => {
            state.bookings.unshift(booking);
            state.isLoading = false;
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create booking';
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    getBookings: async (userId: string) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { bookings, error } = await bookingsService.getUserBookings(userId);

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          state.bookings = bookings;
          state.isLoading = false;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch bookings';
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    updateBooking: async (bookingId: string, updates: Partial<BookingInput>) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { booking, error } = await bookingsService.updateBooking(bookingId, updates);

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        if (booking) {
          set((state) => {
            const index = state.bookings.findIndex((b) => b.id === bookingId);
            if (index !== -1) {
              state.bookings[index] = booking;
            }
            state.isLoading = false;
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update booking';
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    deleteBooking: async (bookingId: string) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const error = await bookingsService.deleteBooking(bookingId);

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          state.bookings = state.bookings.filter((b) => b.id !== bookingId);
          state.isLoading = false;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete booking';
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    setCurrentBooking: (booking: Booking | null) => {
      set((state) => {
        state.currentBooking = booking;
      });
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    clearBookings: () => {
      set((state) => {
        state.bookings = [];
        state.currentBooking = null;
      });
    },
  }))
);
