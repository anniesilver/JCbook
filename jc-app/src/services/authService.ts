/**
 * Supabase Authentication Service
 * Handles all authentication operations with Supabase
 */

import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { LoginCredentials, RegisterCredentials, User, APIError } from "../types/index";

// Platform-specific secure storage
let SecureStore: any = null;
if (Platform.OS !== "web") {
  try {
    SecureStore = require("expo-secure-store");
  } catch (e) {
    console.warn("SecureStore not available on this platform");
  }
}

// Initialize Supabase client
// Try to get from expo-constants first (works in builds), then fall back to process.env (dev)
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Export Supabase client for use in other services
 * This ensures all services share the same authenticated session
 */
export { supabase };

/**
 * Parse user data from Supabase auth response
 */
function parseUser(authUser: any): User {
  return {
    id: authUser.id,
    email: authUser.email,
    created_at: authUser.created_at,
    updated_at: authUser.updated_at,
  };
}

/**
 * Get the current session from Supabase
 */
export async function getCurrentSession(): Promise<{
  user: User | null;
  session: string | null;
}> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
      return { user: null, session: null };
    }

    if (!data.session) {
      return { user: null, session: null };
    }

    const user = data.session.user ? parseUser(data.session.user) : null;
    return {
      user,
      session: data.session.access_token,
    };
  } catch (error) {
    console.error("Unexpected error getting session:", error);
    return { user: null, session: null };
  }
}

/**
 * Login user with email and password
 */
export async function login(credentials: LoginCredentials): Promise<{
  user: User | null;
  session: string | null;
  error: APIError | null;
}> {
  try {
    console.log(`[AuthService] Login attempt for email: ${credentials.email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      console.error(`[AuthService] Login failed - Error:`, error.message, `Code: ${error.code}`);
      return {
        user: null,
        session: null,
        error: {
          message: error.message || "Login failed",
          code: error.code,
        },
      };
    }

    if (!data.session || !data.user) {
      console.error(`[AuthService] Login failed - No session or user returned`);
      console.log(`[AuthService] Data returned:`, { hasSession: !!data.session, hasUser: !!data.user });
      return {
        user: null,
        session: null,
        error: {
          message: "No session or user data returned",
        },
      };
    }

    console.log(`[AuthService] Login successful for user: ${data.user.email}`);
    const user = parseUser(data.user);

    // Store token on native platforms
    if (SecureStore && SecureStore.setItemAsync) {
      try {
        await SecureStore.setItemAsync("auth_token", data.session.access_token);
      } catch (e) {
        console.warn("Failed to store auth token:", e);
      }
    }

    return {
      user,
      session: data.session.access_token,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return {
      user: null,
      session: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Register a new user with email and password
 */
export async function register(credentials: RegisterCredentials): Promise<{
  user: User | null;
  session: string | null;
  error: APIError | null;
}> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error.message || "Registration failed",
          code: error.code,
        },
      };
    }

    if (!data.user) {
      return {
        user: null,
        session: null,
        error: {
          message: "No user data returned from registration",
        },
      };
    }

    const user = parseUser(data.user);

    // Store session token if available (on native platforms)
    if (data.session && SecureStore && SecureStore.setItemAsync) {
      try {
        await SecureStore.setItemAsync("auth_token", data.session.access_token);
      } catch (e) {
        console.warn("Failed to store auth token:", e);
      }
    }

    return {
      user,
      session: data.session?.access_token || null,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return {
      user: null,
      session: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Logout the current user
 */
export async function logout(): Promise<APIError | null> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        message: error.message || "Logout failed",
        code: error.code,
      };
    }

    // Delete token on native platforms
    if (SecureStore && SecureStore.deleteItemAsync) {
      try {
        await SecureStore.deleteItemAsync("auth_token");
      } catch (e) {
        console.warn("Failed to delete auth token:", e);
      }
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed";
    return {
      message,
    };
  }
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<{
  user: User | null;
  session: string | null;
  error: APIError | null;
}> {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error.message || "Session refresh failed",
          code: error.code,
        },
      };
    }

    if (!data.session) {
      return {
        user: null,
        session: null,
        error: {
          message: "No session data returned",
        },
      };
    }

    const user = data.session.user ? parseUser(data.session.user) : null;

    // Store token on native platforms
    if (data.session.access_token && SecureStore && SecureStore.setItemAsync) {
      try {
        await SecureStore.setItemAsync("auth_token", data.session.access_token);
      } catch (e) {
        console.warn("Failed to store auth token:", e);
      }
    }

    return {
      user,
      session: data.session.access_token,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session refresh failed";
    return {
      user: null,
      session: null,
      error: {
        message,
      },
    };
  }
}
