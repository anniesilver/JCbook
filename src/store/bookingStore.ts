/**
 * Zustand Booking Store
 * Manages booking state globally across the app
 * Handles:
 * - Loading user's bookings
 * - Creating new bookings
 * - Updating booking status
 * - Deleting bookings
 * - Filtering bookings by status
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Booking, BookingState, BookingInput } from '../types/index';
import * as bookingService from '../services/bookingService';
import { useAuthStore } from './authStore';

/**
 * Booking store type extending BookingState
 */
interface BookingStore extends BookingState {
  /**
   * Load all bookings for the current user
   * Uses current auth user from authStore
   */
  loadUserBookings: () => Promise<void>;

  /**
   * Create a new booking
   */
  createBooking: (userId: string, bookingInput: BookingInput) => Promise<Booking | null>;

  /**
   * Update a booking's status
   */
  updateBookingStatus: (
    bookingId: string,
    status: 'pending' | 'confirmed' | 'cancelled'
  ) => Promise<void>;

  /**
   * Retry a failed booking
   */
  retryBooking: (bookingId: string) => Promise<void>;

  /**
   * Cancel a booking
   */
  cancelBooking: (bookingId: string) => Promise<void>;

  /**
   * Delete a booking
   */
  deleteBooking: (bookingId: string) => Promise<void>;

  /**
   * Get upcoming bookings (pending status)
   */
  getUpcomingBookings: () => Booking[];

  /**
   * Get confirmed bookings
   */
  getConfirmedBookings: () => Booking[];

  /**
   * Clear error message
   */
  clearError: () => void;

  /**
   * Set current booking for detailed view
   */
  setCurrentBooking: (booking: Booking | null) => void;
}

/**
 * Create booking store with Zustand
 */
export const useBookingStore = create<BookingStore>()(
  immer((set, get) => ({
    bookings: [],
    isLoading: false,
    error: null,
    currentBooking: null,

    loadUserBookings: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const authState = useAuthStore.getState();
        if (!authState.user?.id) {
          set((state) => {
            state.error = 'User not authenticated';
            state.isLoading = false;
          });
          return;
        }

        const { bookings, error } = await bookingService.getUserBookings(authState.user.id);

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          // Ensure bookings array is properly typed and has all required fields
          // Use array mutation instead of reassignment to work properly with immer
          state.bookings.length = 0; // Clear the array
          (bookings || []).forEach(booking => {
            state.bookings.push({
              ...booking,
              retry_count: booking.retry_count ?? 0,
              created_at: booking.created_at || new Date().toISOString(),
              updated_at: booking.updated_at || new Date().toISOString(),
            });
          });
          state.isLoading = false;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load bookings';
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    createBooking: async (userId: string, bookingInput: BookingInput) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Just save to database - PC backend server handles all scheduling
        const { booking, error } = await bookingService.createBooking(
          userId,
          bookingInput,
          new Date().toISOString() // Placeholder - PC server will handle actual scheduling
        );

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return null;
        }

        if (!booking) {
          set((state) => {
            state.error = 'Failed to create booking';
            state.isLoading = false;
          });
          return null;
        }

        set((state) => {
          state.bookings.push(booking);
          state.isLoading = false;
        });

        return booking;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create booking';
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
        return null;
      }
    },

    updateBookingStatus: async (
      bookingId: string,
      status: 'pending' | 'confirmed' | 'cancelled'
    ) => {
      try {
        const { booking, error } = await bookingService.updateBookingStatus(
          bookingId,
          status
        );

        if (error) {
          set((state) => {
            state.error = error.message;
          });
          return;
        }

        if (booking) {
          set((state) => {
            const index = state.bookings.findIndex((b) => b.id === bookingId);
            if (index !== -1) {
              // Use Object.assign to mutate the existing object (works with immer)
              Object.assign(state.bookings[index], booking);
            }
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update booking';
        set((state) => {
          state.error = message;
        });
      }
    },

    retryBooking: async (bookingId: string) => {
      try {
        // Reset booking status to 'pending' and clear error
        const { booking, error } = await bookingService.updateBookingStatus(
          bookingId,
          'pending'
        );

        if (error) {
          set((state) => {
            state.error = error.message;
          });
          return;
        }

        if (booking) {
          set((state) => {
            const index = state.bookings.findIndex((b) => b.id === bookingId);
            if (index !== -1) {
              // Use Object.assign to mutate the existing object (works with immer)
              Object.assign(state.bookings[index], booking);
              state.bookings[index].auto_book_status = 'pending';
              state.bookings[index].error_message = null;
            }
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to retry booking';
        set((state) => {
          state.error = message;
        });
      }
    },

    cancelBooking: async (bookingId: string) => {
      try {
        const { success, error } = await bookingService.cancelBooking(bookingId);

        if (error) {
          set((state) => {
            state.error = error.message;
          });
          return;
        }

        if (success) {
          set((state) => {
            const index = state.bookings.findIndex((b) => b.id === bookingId);
            if (index !== -1) {
              state.bookings[index].status = 'cancelled';
            }
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to cancel booking';
        set((state) => {
          state.error = message;
        });
      }
    },

    deleteBooking: async (bookingId: string) => {
      try {
        const { success, error } = await bookingService.deleteBooking(bookingId);

        if (error) {
          set((state) => {
            state.error = error.message;
          });
          return;
        }

        if (success) {
          set((state) => {
            // Find and remove the booking (don't reassign the array)
            const index = state.bookings.findIndex((b) => b.id === bookingId);
            if (index !== -1) {
              state.bookings.splice(index, 1);
            }
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete booking';
        set((state) => {
          state.error = message;
        });
      }
    },

    getUpcomingBookings: () => {
      const state = get();
      return state.bookings.filter(
        (b) => b.status === 'pending' && b.auto_book_status === 'pending'
      );
    },

    getConfirmedBookings: () => {
      const state = get();
      return state.bookings.filter((b) => b.status === 'confirmed');
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    setCurrentBooking: (booking: Booking | null) => {
      set((state) => {
        state.currentBooking = booking;
      });
    },
  }))
);
