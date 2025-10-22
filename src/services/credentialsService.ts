/**
 * Supabase Credentials Service
 * Handles saving, retrieving, updating, and deleting gametime.net credentials
 * All credentials are encrypted before storage and decrypted on retrieval
 */

import { createClient } from "@supabase/supabase-js";
import { Credential, CredentialInput, APIError } from "../types/index";
import * as encryptionService from "./encryptionService";

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
 * Save new credentials to Supabase
 * @param userId User ID
 * @param credentials Username and password
 * @returns Saved credential or error
 */
export async function saveCredentials(
  userId: string,
  credentials: CredentialInput
): Promise<{
  credential: Credential | null;
  error: APIError | null;
}> {
  try {
    // Validate input
    if (!credentials.username || !credentials.password) {
      return {
        credential: null,
        error: {
          message: "Username and password are required",
        },
      };
    }

    if (credentials.username.trim().length === 0) {
      return {
        credential: null,
        error: {
          message: "Username cannot be empty",
        },
      };
    }

    if (credentials.password.length < 4) {
      return {
        credential: null,
        error: {
          message: "Password must be at least 4 characters",
        },
      };
    }

    // Encrypt password
    const encryptedPassword = await encryptionService.encryptCredential(
      credentials.password,
      userId
    );

    // Save to Supabase
    const { data, error } = await supabase
      .from("credentials")
      .insert([
        {
          user_id: userId,
          username: credentials.username,
          password: encryptedPassword,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return {
        credential: null,
        error: {
          message: error.message || "Failed to save credentials",
          code: error.code,
        },
      };
    }

    // Decrypt password for response
    const decryptedPassword = await encryptionService.decryptCredential(
      data.password,
      userId
    );

    const credential: Credential = {
      ...data,
      password: decryptedPassword,
    };

    return {
      credential,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save credentials";
    return {
      credential: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Get credentials for current user
 * @param userId User ID
 * @returns Credential or error
 */
export async function getCredentials(userId: string): Promise<{
  credential: Credential | null;
  error: APIError | null;
}> {
  try {
    const { data, error } = await supabase
      .from("credentials")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // Not found is not an error state for us
      if (error.code === "PGRST116") {
        return {
          credential: null,
          error: null,
        };
      }
      return {
        credential: null,
        error: {
          message: error.message || "Failed to retrieve credentials",
          code: error.code,
        },
      };
    }

    if (!data) {
      return {
        credential: null,
        error: null,
      };
    }

    // Decrypt password
    const decryptedPassword = await encryptionService.decryptCredential(data.password, userId);

    const credential: Credential = {
      ...data,
      password: decryptedPassword,
    };

    return {
      credential,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve credentials";
    return {
      credential: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Update existing credentials
 * @param userId User ID
 * @param credentialId Credential ID
 * @param newCredentials New username and password
 * @returns Updated credential or error
 */
export async function updateCredentials(
  userId: string,
  credentialId: string,
  newCredentials: CredentialInput
): Promise<{
  credential: Credential | null;
  error: APIError | null;
}> {
  try {
    // Validate input
    if (!newCredentials.username || !newCredentials.password) {
      return {
        credential: null,
        error: {
          message: "Username and password are required",
        },
      };
    }

    if (newCredentials.username.trim().length === 0) {
      return {
        credential: null,
        error: {
          message: "Username cannot be empty",
        },
      };
    }

    if (newCredentials.password.length < 4) {
      return {
        credential: null,
        error: {
          message: "Password must be at least 4 characters",
        },
      };
    }

    // Encrypt password
    const encryptedPassword = await encryptionService.encryptCredential(
      newCredentials.password,
      userId
    );

    // Update in Supabase
    const { data, error } = await supabase
      .from("credentials")
      .update({
        username: newCredentials.username,
        password: encryptedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq("id", credentialId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return {
        credential: null,
        error: {
          message: error.message || "Failed to update credentials",
          code: error.code,
        },
      };
    }

    // Decrypt password for response
    const decryptedPassword = await encryptionService.decryptCredential(
      data.password,
      userId
    );

    const credential: Credential = {
      ...data,
      password: decryptedPassword,
    };

    return {
      credential,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update credentials";
    return {
      credential: null,
      error: {
        message,
      },
    };
  }
}

/**
 * Delete credentials
 * @param userId User ID
 * @param credentialId Credential ID
 * @returns Error if any
 */
export async function deleteCredentials(
  userId: string,
  credentialId: string
): Promise<APIError | null> {
  try {
    const { error } = await supabase
      .from("credentials")
      .delete()
      .eq("id", credentialId)
      .eq("user_id", userId);

    if (error) {
      return {
        message: error.message || "Failed to delete credentials",
        code: error.code,
      };
    }

    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete credentials";
    return {
      message,
    };
  }
}
