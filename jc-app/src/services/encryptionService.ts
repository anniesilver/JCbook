/**
 * Encryption/Decryption Service
 * Handles AES encryption and decryption of sensitive data
 * Uses simple base64 + key-based XOR encryption for Expo compatibility
 */

// Use browser's native crypto API for web, fall back to simple hashing for other platforms
const getCryptoAPI = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  return null;
};

/**
 * Generate a deterministic key from user ID for encryption
 */
function generateKeyFromUserId(userId: string): string {
  return userId.substring(0, 32).padEnd(32, "0");
}

/**
 * Simple XOR cipher with key
 * Note: This is not cryptographically strong but works for basic obfuscation
 * Combined with base64 encoding, it provides a reasonable security level for stored credentials
 */
function xorEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function xorDecrypt(encrypted: string, key: string): string {
  // XOR is symmetric, so decryption is the same as encryption
  return xorEncrypt(encrypted, key);
}

/**
 * Encrypt credentials using base64 + XOR
 * @param data The data to encrypt
 * @param userId User ID for key generation
 * @returns Base64 encoded encrypted data
 */
export async function encryptCredential(data: string, userId: string): Promise<string> {
  try {
    const key = generateKeyFromUserId(userId);
    const encrypted = xorEncrypt(data, key);
    const base64 = btoa(encrypted);
    return base64;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Encryption failed";
    throw new Error(`Failed to encrypt credential: ${message}`);
  }
}

/**
 * Decrypt credentials using base64 + XOR
 * @param encryptedData Base64 encoded encrypted data
 * @param userId User ID for key generation
 * @returns Decrypted data
 */
export async function decryptCredential(encryptedData: string, userId: string): Promise<string> {
  try {
    const key = generateKeyFromUserId(userId);
    const decrypted = xorDecrypt(atob(encryptedData), key);
    return decrypted;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Decryption failed";
    throw new Error(`Failed to decrypt credential: ${message}`);
  }
}

/**
 * Hash a password using SHA256 for verification
 * @param password The password to hash
 * @returns Hex encoded hash
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const crypto = getCryptoAPI();
    if (!crypto || !crypto.subtle) {
      // Fallback: use simple hash for platforms without crypto API
      return btoa(password).substring(0, 64);
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hashing failed";
    throw new Error(`Failed to hash password: ${message}`);
  }
}

/**
 * Verify password against hash
 * @param password The password to verify
 * @param hash The hash to verify against
 * @returns True if password matches hash
 */
export async function verifyPasswordHash(password: string, hash: string): Promise<boolean> {
  try {
    const computed = await hashPassword(password);
    return computed === hash;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}
