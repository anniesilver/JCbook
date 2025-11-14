/**
 * Error Message Utilities
 * Converts technical error messages from backend to user-friendly messages
 */

/**
 * Maps technical error messages to user-friendly messages
 * @param technicalError - The raw error message from the backend
 * @returns A user-friendly error message
 */
export function getUserFriendlyErrorMessage(technicalError: string | null | undefined): string {
  if (!technicalError) {
    return 'Booking failed. Please try again.';
  }

  const errorLower = technicalError.toLowerCase();

  // Credentials and authentication issues
  if (
    errorLower.includes('credentials not found') ||
    errorLower.includes('username or password not configured')
  ) {
    return 'GameTime credentials not set up. Please add your credentials.';
  }

  if (
    errorLower.includes('login failed') ||
    errorLower.includes('still on auth page') ||
    errorLower.includes('check credentials')
  ) {
    return 'Invalid GameTime credentials. Please update your credentials.';
  }

  // Court availability issues
  if (
    errorLower.includes('booking rejected') ||
    errorLower.includes('gametime server') ||
    errorLower.includes('bookerror')
  ) {
    return 'Court not available. All courts may be booked.';
  }

  // ReCAPTCHA issues
  if (
    errorLower.includes('recaptcha') ||
    errorLower.includes('token')
  ) {
    return 'Security verification failed. Please try again.';
  }

  // Browser/automation issues
  if (
    errorLower.includes('browser') ||
    errorLower.includes('playwright') ||
    errorLower.includes('timeout') ||
    errorLower.includes('navigation')
  ) {
    return 'Booking system temporarily unavailable. Please try again.';
  }

  // Network issues
  if (
    errorLower.includes('network') ||
    errorLower.includes('connection') ||
    errorLower.includes('fetch') ||
    errorLower.includes('econnrefused') ||
    errorLower.includes('enotfound')
  ) {
    return 'Network connection issue. Please check your internet.';
  }

  // Form/validation issues
  if (
    errorLower.includes('form') ||
    errorLower.includes('field') ||
    errorLower.includes('missing')
  ) {
    return 'Booking information incomplete. Please try again.';
  }

  // Timing issues
  if (
    errorLower.includes('time has passed') ||
    errorLower.includes('expired') ||
    errorLower.includes('too late')
  ) {
    return 'Booking time has passed. Please schedule a new booking.';
  }

  // Court mapping issues
  if (
    errorLower.includes('court') &&
    (errorLower.includes('not found') || errorLower.includes('not configured'))
  ) {
    return 'Selected court is unavailable. Please choose another court.';
  }

  // Generic server errors
  if (
    errorLower.includes('500') ||
    errorLower.includes('internal server') ||
    errorLower.includes('server error')
  ) {
    return 'GameTime server error. Please try again later.';
  }

  // If error is short and simple, show it as-is (might already be user-friendly)
  if (technicalError.length < 60 && !technicalError.includes('Error:')) {
    return technicalError;
  }

  // Default fallback for unknown errors
  return 'Booking failed. Please try again or contact support.';
}

/**
 * Determines if an error is actionable by the user
 * @param technicalError - The raw error message from the backend
 * @returns Object with isActionable flag and suggested action
 */
export function getErrorActionability(
  technicalError: string | null | undefined
): {
  isActionable: boolean;
  suggestedAction: string | null;
} {
  if (!technicalError) {
    return {
      isActionable: true,
      suggestedAction: 'Try booking again',
    };
  }

  const errorLower = technicalError.toLowerCase();

  // Credentials issues - user can fix
  if (
    errorLower.includes('credentials') ||
    errorLower.includes('login failed') ||
    errorLower.includes('username') ||
    errorLower.includes('password')
  ) {
    return {
      isActionable: true,
      suggestedAction: 'Update your GameTime credentials',
    };
  }

  // Court availability - user can choose different court/time
  if (errorLower.includes('booking rejected') || errorLower.includes('not available')) {
    return {
      isActionable: true,
      suggestedAction: 'Try a different court or time',
    };
  }

  // Network issues - user can check connection
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return {
      isActionable: true,
      suggestedAction: 'Check your internet connection',
    };
  }

  // Timing issues - user can reschedule
  if (errorLower.includes('time has passed') || errorLower.includes('expired')) {
    return {
      isActionable: true,
      suggestedAction: 'Schedule a new booking',
    };
  }

  // Technical/system issues - not directly actionable
  if (
    errorLower.includes('browser') ||
    errorLower.includes('playwright') ||
    errorLower.includes('server error') ||
    errorLower.includes('recaptcha')
  ) {
    return {
      isActionable: false,
      suggestedAction: 'Wait a few minutes and try again',
    };
  }

  // Default
  return {
    isActionable: true,
    suggestedAction: 'Try booking again',
  };
}
