/**
 * Supabase Authentication Service
 * Handles all authentication operations with Supabase
 */

import { createClient } from "@supabase/supabase-js";
import { LoginCredentials, RegisterCredentials, User, APIError } from "../types/index";
import * as SecureStore from "expo-secure-store";

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
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
      return {
        user: null,
        session: null,
        error: {
          message: "No session or user data returned",
        },
      };
    }

    const user = parseUser(data.user);
    await SecureStore.setItemAsync("auth_token", data.session.access_token);

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

    // Store session token if available
    if (data.session) {
      await SecureStore.setItemAsync("auth_token", data.session.access_token);
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

    await SecureStore.deleteItemAsync("auth_token");
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
    if (data.session.access_token) {
      await SecureStore.setItemAsync("auth_token", data.session.access_token);
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
