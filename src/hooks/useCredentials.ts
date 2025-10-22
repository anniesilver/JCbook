/**
 * Zustand Credentials Store Hook
 * Manages credential state globally
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Credential, CredentialState, CredentialInput } from "../types/index";
import * as credentialsService from "../services/credentialsService";

/**
 * Credentials store type
 */
interface CredentialsStore extends CredentialState {
  /**
   * Save new credentials
   */
  saveCredentials: (userId: string, credentials: CredentialInput) => Promise<void>;

  /**
   * Fetch current credentials
   */
  fetchCredentials: (userId: string) => Promise<void>;

  /**
   * Update existing credentials
   */
  updateCredentials: (
    userId: string,
    credentialId: string,
    credentials: CredentialInput
  ) => Promise<void>;

  /**
   * Delete credentials
   */
  deleteCredentials: (userId: string, credentialId: string) => Promise<void>;

  /**
   * Clear error message
   */
  clearError: () => void;

  /**
   * Clear all credentials data
   */
  clearCredentials: () => void;
}

/**
 * Create credentials store with Zustand
 */
export const useCredentialsStore = create<CredentialsStore>()(
  immer((set) => ({
    credentials: null,
    isLoading: false,
    error: null,

    saveCredentials: async (userId: string, credentials: CredentialInput) => {
      // Validate credentials
      if (!credentials.username || !credentials.password) {
        set((state) => {
          state.error = "Username and password are required";
        });
        return;
      }

      if (credentials.username.trim().length === 0) {
        set((state) => {
          state.error = "Username cannot be empty";
        });
        return;
      }

      if (credentials.password.length < 4) {
        set((state) => {
          state.error = "Password must be at least 4 characters";
        });
        return;
      }

      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { credential, error } = await credentialsService.saveCredentials(
          userId,
          credentials
        );

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          state.credentials = credential;
          state.isLoading = false;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save credentials";
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    fetchCredentials: async (userId: string) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { credential, error } = await credentialsService.getCredentials(userId);

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          state.credentials = credential;
          state.isLoading = false;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch credentials";
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    updateCredentials: async (
      userId: string,
      credentialId: string,
      credentials: CredentialInput
    ) => {
      // Validate credentials
      if (!credentials.username || !credentials.password) {
        set((state) => {
          state.error = "Username and password are required";
        });
        return;
      }

      if (credentials.username.trim().length === 0) {
        set((state) => {
          state.error = "Username cannot be empty";
        });
        return;
      }

      if (credentials.password.length < 4) {
        set((state) => {
          state.error = "Password must be at least 4 characters";
        });
        return;
      }

      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { credential, error } = await credentialsService.updateCredentials(
          userId,
          credentialId,
          credentials
        );

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          state.credentials = credential;
          state.isLoading = false;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update credentials";
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
      }
    },

    deleteCredentials: async (userId: string, credentialId: string) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const error = await credentialsService.deleteCredentials(userId, credentialId);

        if (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
          return;
        }

        set((state) => {
          state.credentials = null;
          state.isLoading = false;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete credentials";
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

    clearCredentials: () => {
      set((state) => {
        state.credentials = null;
        state.error = null;
        state.isLoading = false;
      });
    },
  }))
);
