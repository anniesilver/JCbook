/**
 * Form Validation Utilities
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 6 characters
 */
export function isValidPassword(password: string): boolean {
  return password && password.length >= 6;
}

/**
 * Get email validation error message
 */
export function getEmailError(email: string): string | null {
  if (!email) {
    return "Email is required";
  }
  if (!isValidEmail(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

/**
 * Get password validation error message
 */
export function getPasswordError(password: string): string | null {
  if (!password) {
    return "Password is required";
  }
  if (!isValidPassword(password)) {
    return "Password must be at least 6 characters long";
  }
  return null;
}

/**
 * Get confirm password validation error message
 */
export function getConfirmPasswordError(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) {
    return "Please confirm your password";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}
