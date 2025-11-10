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
 * @returns {Date} When the booking slot opens (as Date object, works in any timezone)
 *
 * Example:
 * - Target: Nov 21, 2025
 * - Opens: Nov 15, 2025 at 8:00 AM EST
 */
function calculateBookingOpenTime(targetDate) {
  /**
   * Helper: Get EST/EDT offset from UTC for a given date (handles DST automatically)
   * @returns {number} Offset in hours (e.g., 5 for EST, 4 for EDT)
   */
  function getESTOffsetHours(year, month, day) {
    // Create a UTC date at noon
    const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    // Format the same moment in EST timezone
    const estString = utcDate.toLocaleString('en-US', {
      timeZone: GAMETIME_TIMEZONE,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    // Parse EST hour
    const estHour = parseInt(estString.split(':')[0]);
    const utcHour = 12;

    // Calculate offset (how many hours to add to UTC to get EST)
    // EST is typically UTC-5, EDT is UTC-4
    // So if UTC is 12:00 and EST shows 07:00, offset is -5
    let offset = estHour - utcHour;

    // Handle day boundary crossing
    if (offset > 12) offset -= 24;
    if (offset < -12) offset += 24;

    return -offset; // Return positive offset (hours to ADD to EST to get UTC)
  }

  // Parse target date
  const [year, month, day] = targetDate.split('-').map(Number);

  // Get EST offset for the target date (handles DST automatically)
  const offsetHours = getESTOffsetHours(year, month, day);

  // Create UTC timestamp for "target date at 8:00 AM EST"
  // If offset is 5 (EST = UTC-5), then 8:00 AM EST = 13:00 UTC
  const targetAt8amEST_UTC = Date.UTC(year, month - 1, day, 8 + offsetHours, 0, 0, 0);

  // Subtract 6 days (in milliseconds)
  const sixDaysInMs = 6 * 24 * 60 * 60 * 1000;
  const openTime_UTC = targetAt8amEST_UTC - sixDaysInMs;

  // Return as Date object (will display correctly in any timezone)
  return new Date(openTime_UTC);
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
