/**
 * Zustand Auth Store
 * Manages authentication state globally
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { User, AuthState, LoginCredentials, RegisterCredentials } from "../types/index";
import * as authService from "../services/authService";

/**
 * Auth store type
 */
interface AuthStore extends AuthState {
  /**
   * Initialize auth state from stored session
   */
  initializeAuth: () => Promise<void>;

  /**
   * Login user with email and password
   */
  login: (credentials: LoginCredentials) => Promise<void>;

  /**
   * Register new user
   */
  register: (credentials: RegisterCredentials) => Promise<void>;

  /**
   * Logout current user
   */
  logout: () => Promise<void>;

  /**
   * Clear error message
   */
  clearError: () => void;

  /**
   * Set user manually (for testing or session restoration)
   */
  setUser: (user: User | null) => void;
}

/**
 * Create auth store with Zustand
 */
export const useAuthStore = create<AuthStore>()(
  immer((set) => ({
    user: null,
    session: null,
    isLoading: false,
    error: null,

    initializeAuth: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { user, session } = await authService.getCurrentSession();
        set((state) => {
          state.user = user;
          state.session = session;
          state.isLoading = false;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to initialize auth";
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    login: async (credentials: LoginCredentials) => {
      // Validate credentials
      if (!credentials.email || !credentials.password) {
        set((state) => {
          state.error = "Email and password are required";
        });
        return;
      }

      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { user, session, error } = await authService.login(credentials);

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          state.user = user;
          state.session = session;
          state.isLoading = false;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    register: async (credentials: RegisterCredentials) => {
      // Validate credentials
      if (!credentials.email || !credentials.password || !credentials.confirmPassword) {
        set((state) => {
          state.error = "All fields are required";
        });
        return;
      }

      if (credentials.password !== credentials.confirmPassword) {
        set((state) => {
          state.error = "Passwords do not match";
        });
        return;
      }

      if (credentials.password.length < 6) {
        set((state) => {
          state.error = "Password must be at least 6 characters long";
        });
        return;
      }

      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { user, session, error } = await authService.register(credentials);

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          state.user = user;
          state.session = session;
          state.isLoading = false;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Registration failed";
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    logout: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const error = await authService.logout();

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          state.user = null;
          state.session = null;
          state.isLoading = false;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Logout failed";
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    setUser: (user: User | null) => {
      set((state) => {
        state.user = user;
      });
    },
  }))
);
