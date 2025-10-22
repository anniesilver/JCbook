/**
 * Custom useAuth Hook
 * Provides easy access to auth store and auth operations
 */

import { useAuthStore } from "../store/authStore";
import { User, LoginCredentials, RegisterCredentials } from "../types/index";

/**
 * Custom hook for authentication
 * Provides auth state and operations
 */
export function useAuth() {
  // Select state from store
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  // Select actions from store
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);
  const setUser = useAuthStore((state) => state.setUser);

  const isAuthenticated = !!user && !!session;

  return {
    // State
    user,
    session,
    isLoading,
    error,
    isAuthenticated,

    // Actions
    initializeAuth,
    login,
    register,
    logout,
    clearError,
    setUser,
  };
}
