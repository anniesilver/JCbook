/**
 * Password Decryption Utility
 *
 * This module decrypts passwords that were encrypted by the mobile app using
 * the encryptionService.ts XOR + Base64 encryption scheme.
 *
 * Encryption algorithm (from mobile app):
 * 1. Generate key from userId (first 32 chars, padded with "0")
 * 2. XOR encrypt plaintext with key
 * 3. Base64 encode the result
 *
 * This module reverses that process:
 * 1. Base64 decode
 * 2. XOR decrypt with same key
 * 3. Return plaintext
 */

/**
 * Generate a deterministic key from user ID (same as mobile app)
 * @param {string} userId - User ID from Supabase
 * @returns {string} 32-character encryption key
 */
function generateKeyFromUserId(userId) {
  return userId.substring(0, 32).padEnd(32, "0");
}

/**
 * XOR decrypt (symmetric cipher - same as encryption)
 * @param {string} encrypted - Encrypted string
 * @param {string} key - Encryption key
 * @returns {string} Decrypted string
 */
function xorDecrypt(encrypted, key) {
  let result = "";
  for (let i = 0; i < encrypted.length; i++) {
    result += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Decrypt a password that was encrypted by the mobile app
 *
 * @param {string} encryptedPassword - Base64 encoded encrypted password
 * @param {string} userId - User ID for key generation
 * @returns {string} Decrypted plaintext password
 */
function decryptPassword(encryptedPassword, userId) {
  try {
    // Generate the same key used during encryption
    const key = generateKeyFromUserId(userId);

    // Base64 decode
    const encrypted = Buffer.from(encryptedPassword, 'base64').toString('binary');

    // XOR decrypt (symmetric operation)
    const decrypted = xorDecrypt(encrypted, key);

    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt password: ${error.message}`);
  }
}

module.exports = { decryptPassword };
