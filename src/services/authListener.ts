/**
 * Auth Listener Service
 * Sets up Supabase auth state change listener to keep Zustand store in sync
 */

import { createClient } from "@supabase/supabase-js";
import { useAuthStore } from "../store/authStore";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let listenerUnsubscribe: (() => void) | null = null;

/**
 * Initialize auth state change listener
 * This ensures the Zustand store stays in sync with Supabase auth state
 */
export function initializeAuthListener() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase credentials not configured");
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Subscribe to auth state changes
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, "Session:", !!session);

      // Ignore INITIAL_SESSION event - it fires on listener setup and can have stale data
      // We handle initial auth state in initializeAuth() instead
      if (event === 'INITIAL_SESSION') {
        console.log('[AuthListener] Ignoring INITIAL_SESSION event');
        return;
      }

      if (session && session.user) {
        // User is logged in
        useAuthStore.setState({
          user: {
            id: session.user.id,
            email: session.user.email || "",
            created_at: session.user.created_at || "",
            updated_at: session.user.updated_at || "",
          },
          session: session.access_token,
          isLoading: false,
          error: null,
        });
      } else if (event === 'SIGNED_OUT') {
        // Only clear user on explicit sign out
        useAuthStore.setState({
          user: null,
          session: null,
          isLoading: false,
          error: null,
        });
      }
    });

    // Store unsubscribe function in case we need to clean up later
    if (data && data.subscription) {
      listenerUnsubscribe = data.subscription.unsubscribe;
    }
  } catch (error) {
    console.error("Error initializing auth listener:", error);
  }
}

/**
 * Clean up auth listener
 */
export function cleanupAuthListener() {
  if (listenerUnsubscribe) {
    listenerUnsubscribe();
    listenerUnsubscribe = null;
  }
}
