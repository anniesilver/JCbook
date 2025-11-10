/**
 * Booking Window Calculator
 *
 * GameTime opens booking slots 6 days before the target date at 8:00 AM
 * All calculations are done in GameTime server's timezone (EST/EDT)
 */

// GameTime server timezone (US Eastern Time)
const GAMETIME_TIMEZONE = 'America/New_York';

/**
 * Calculate when a booking slot opens for reservation
 *
 * @param {string} targetDate - Booking date in YYYY-MM-DD format
 * @returns {Date} When the booking slot opens (local time)
 *
 * Example:
 * - Target: Nov 21, 2025
 * - Opens: Nov 15, 2025 at 8:00 AM EST
 */
function calculateBookingOpenTime(targetDate) {
  // Parse target date at 8:00 AM in GameTime timezone
  // We need to create a date object that represents 8:00 AM on the target date
  // in GameTime's timezone, then convert to local time

  const [year, month, day] = targetDate.split('-').map(Number);

  // Create date in UTC, then we'll adjust for GameTime timezone
  const targetDate8AM = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)); // Noon UTC as starting point

  // Get the actual time in GameTime timezone by creating a formatter
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: GAMETIME_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Parse the target date at 8:00 AM in GameTime timezone
  const targetStr = `${targetDate}T08:00:00`;
  const targetParts = targetStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);

  // Create date string that will be interpreted in local time, but represents GameTime timezone
  // This is tricky - we need to figure out what local time equals 8am GameTime timezone
  const targetDateInGameTimeZone = new Date(targetStr);

  // Booking opens 6 days before at 8:00 AM GameTime timezone
  const openTime = new Date(targetDateInGameTimeZone);
  openTime.setDate(openTime.getDate() - 6);
  openTime.setHours(8, 0, 0, 0);

  return openTime;
}

/**
 * Determine booking strategy (immediate vs precision-timed)
 *
 * @param {string} targetDate - Booking date in YYYY-MM-DD format
 * @returns {Object} Strategy object with mode, executeAt, and reason
 */
function getBookingStrategy(targetDate) {
  const now = new Date();
  const bookingOpenTime = calculateBookingOpenTime(targetDate);

  if (now >= bookingOpenTime) {
    // Booking slot is already open - execute immediately
    return {
      mode: 'immediate',
      executeAt: now,
      reason: 'Booking slot is already open (within 6-day window)'
    };
  } else {
    // Booking slot not open yet - schedule for 8:00 AM on opening day
    const msUntilOpen = bookingOpenTime.getTime() - now.getTime();
    const hoursUntilOpen = Math.floor(msUntilOpen / 3600000);
    const minutesUntilOpen = Math.floor((msUntilOpen % 3600000) / 60000);

    return {
      mode: 'precision',
      executeAt: bookingOpenTime,
      reason: `Booking opens in ${hoursUntilOpen}h ${minutesUntilOpen}m at ${bookingOpenTime.toISOString()}`
    };
  }
}

/**
 * Format a timestamp in GameTime timezone for display
 *
 * @param {number|Date} timestamp - Timestamp to format
 * @returns {string} Formatted time string
 */
function formatInGameTimeZone(timestamp) {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;

  return date.toLocaleString('en-US', {
    timeZone: GAMETIME_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }) + ' EST/EDT';
}

module.exports = {
  calculateBookingOpenTime,
  getBookingStrategy,
  formatInGameTimeZone,
  GAMETIME_TIMEZONE
};
