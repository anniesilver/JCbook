/**
 * JC Court Booking Automation Server - DUAL-MODE VERSION
 *
 * This server runs 24/7 on a Windows PC and executes pending court bookings
 * automatically using the verified Playwright solution.
 *
 * TWO EXECUTION MODES:
 * 1. IMMEDIATE: Target date ≤ 6 days from 8am → Execute immediately
 * 2. PRECISION: Target date > 6 days from 8am → Wait until 8am opening, precise timing
 *
 * How it works:
 * 1. Polls Supabase every 1 hour for new bookings
 * 2. For each booking, determines mode (immediate vs precision)
 * 3. IMMEDIATE mode: Executes right away
 * 4. PRECISION mode: Schedules for 8:00 AM with millisecond precision
 * 5. Updates database with confirmation ID or error
 */

const { createClient } = require('@supabase/supabase-js');
const { executeBooking, executeBookingPrecisionTimed } = require('./playwrightBooking');
const { decryptPassword } = require('./decryptPassword');
const { getBookingStrategy, formatInGameTimeZone } = require('./bookingWindowCalculator');
const { syncWithGameTimeServer, isTimeSyncFresh } = require('./timeSync');
require('dotenv').config();

// Track scheduled bookings to avoid double-scheduling
const scheduledBookings = new Set();

// Get username filter from command line argument
const filterUsername = process.argv[2];

console.log('========================================');
console.log('JC Court Booking Automation Server');
console.log('========================================');
console.log('');

// Check if username parameter is provided
if (!filterUsername) {
  console.error('[Server] ERROR: Username parameter required!');
  console.error('');
  console.error('Usage: node server.js <gametime_username>');
  console.error('Example: node server.js annieyang');
  console.error('');
  console.error('This will only process bookings for the specified GameTime username.');
  process.exit(1);
}

console.log(`[Server] Starting with username filter: ${filterUsername}`);
console.log('[Server] Will ONLY process bookings for this user');
console.log('');

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  console.error('[Server] ERROR: SUPABASE_URL not found in .env file');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Server] ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env file');
  process.exit(1);
}

// Initialize Supabase with SERVICE_ROLE_KEY (full database access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('[Server] Supabase client initialized');
console.log(`[Server] Connected to: ${process.env.SUPABASE_URL}`);
console.log('');

/**
 * Convert time string (HH:MM) to minutes from midnight
 * @param {string} timeStr - Time in HH:MM format (e.g., "09:00")
 * @returns {string} Minutes from midnight (e.g., "540")
 */
function convertTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60 + minutes).toString();
}

/**
 * Schedule a single booking using appropriate mode (immediate vs precision)
 */
async function scheduleBooking(booking) {
  const strategy = getBookingStrategy(booking.booking_date);

  console.log('========================================');
  console.log(`[Scheduler] Booking ${booking.id}`);
  console.log(`[Scheduler] Target date: ${booking.booking_date}`);
  console.log(`[Scheduler] Target time: ${booking.booking_time}`);
  console.log(`[Scheduler] Mode: ${strategy.mode.toUpperCase()}`);
  console.log(`[Scheduler] Execute at: ${strategy.executeAt.toISOString()}`);
  console.log(`[Scheduler] (GameTime TZ: ${formatInGameTimeZone(strategy.executeAt.getTime())})`);
  console.log(`[Scheduler] Reason: ${strategy.reason}`);
  console.log('========================================');
  console.log('');

  if (strategy.mode === 'immediate') {
    // ===================================================================
    // MODE 1: IMMEDIATE EXECUTION
    // ===================================================================
    console.log('[Scheduler] Executing IMMEDIATELY...');
    console.log('');

    await executeBookingWrapper(booking);

  } else {
    // ===================================================================
    // MODE 2: PRECISION-TIMED EXECUTION
    // ===================================================================
    const now = Date.now();
    const delayMs = strategy.executeAt.getTime() - now;

    const hours = Math.floor(delayMs / 3600000);
    const minutes = Math.floor((delayMs % 3600000) / 60000);
    console.log(`[Scheduler] Scheduling for ${hours}h ${minutes}m from now`);

    // Sync time 10 minutes before execution
    const syncTime = delayMs - (10 * 60 * 1000);
    if (syncTime > 0) {
      setTimeout(async () => {
        console.log('[Scheduler] Pre-execution time sync (T-10min)...');
        await syncWithGameTimeServer();
      }, syncTime);
    } else {
      // Less than 10 minutes away, sync NOW
      console.log('[Scheduler] Booking soon - syncing time now...');
      await syncWithGameTimeServer();
    }

    // Schedule the precision execution
    setTimeout(async () => {
      console.log('[Scheduler] Time reached! Starting precision execution...');
      await executePrecisionBookingWrapper(booking, strategy.executeAt.getTime());
    }, delayMs);

    console.log(`[Scheduler] Booking ${booking.id} scheduled successfully`);
    console.log('');
  }
}

/**
 * Wrapper for immediate booking execution
 */
async function executeBookingWrapper(booking) {
  try {
    // Fetch credentials
    const { data: credentials, error: credError } = await supabase
      .from('user_credentials')
      .select('id, gametime_username, gametime_password, user_id')
      .eq('user_id', booking.user_id)
      .maybeSingle();

    if (credError || !credentials) {
      console.error(`[Server] Failed to fetch credentials for user ${booking.user_id}`);
      return;
    }

    const decryptedPassword = decryptPassword(
      credentials.gametime_password,
      booking.user_id
    );

    const timeInMinutes = convertTimeToMinutes(booking.booking_time);

    // Build courts array
    const courtsToTry = [booking.preferred_court.toString()];
    if (booking.accept_any_court) {
      const allCourts = ['1', '2', '3', '4', '5', '6'];
      const alternateCourts = allCourts.filter(c => c !== booking.preferred_court.toString());
      courtsToTry.push(...alternateCourts);
    }

    console.log(`[Server] Courts to attempt: ${courtsToTry.join(', ')}`);

    // Execute immediate booking
    const result = await executeBooking({
      username: credentials.gametime_username,
      password: decryptedPassword,
      courts: courtsToTry,
      date: booking.booking_date,
      time: timeInMinutes,
      guestName: 'G'
    });

    // Update database
    await updateBookingResult(booking, result, courtsToTry);

  } catch (error) {
    console.error(`[Server] Error in immediate execution:`, error.message);
  } finally {
    scheduledBookings.delete(booking.id);
  }
}

/**
 * Wrapper for precision-timed booking execution
 */
async function executePrecisionBookingWrapper(booking, targetTimestamp) {
  try {
    // Fetch credentials
    const { data: credentials, error: credError } = await supabase
      .from('user_credentials')
      .select('id, gametime_username, gametime_password, user_id')
      .eq('user_id', booking.user_id)
      .maybeSingle();

    if (credError || !credentials) {
      console.error(`[Server] Failed to fetch credentials for user ${booking.user_id}`);
      return;
    }

    const decryptedPassword = decryptPassword(
      credentials.gametime_password,
      booking.user_id
    );

    const timeInMinutes = convertTimeToMinutes(booking.booking_time);

    // Build courts array
    const courtsToTry = [booking.preferred_court.toString()];
    if (booking.accept_any_court) {
      const allCourts = ['1', '2', '3', '4', '5', '6'];
      const alternateCourts = allCourts.filter(c => c !== booking.preferred_court.toString());
      courtsToTry.push(...alternateCourts);
    }

    console.log(`[Server] Courts to attempt: ${courtsToTry.join(', ')}`);

    // Execute precision-timed booking
    const result = await executeBookingPrecisionTimed({
      username: credentials.gametime_username,
      password: decryptedPassword,
      courts: courtsToTry,
      date: booking.booking_date,
      time: timeInMinutes,
      guestName: 'G'
    }, targetTimestamp);

    // Update database
    await updateBookingResult(booking, result, courtsToTry);

  } catch (error) {
    console.error(`[Server] Error in precision execution:`, error.message);
  } finally {
    scheduledBookings.delete(booking.id);
  }
}

/**
 * Update booking result in database
 */
async function updateBookingResult(booking, result, courtsToTry) {
  const successfulCourt = result.courtBooked ? parseInt(result.courtBooked) : null;

  if (result.success) {
    let successMessage = '';
    if (successfulCourt === booking.preferred_court) {
      successMessage = `Booking confirmed on Court ${successfulCourt}`;
    } else {
      successMessage = `Court ${booking.preferred_court} was unavailable. Booking confirmed on Court ${successfulCourt} instead`;
    }

    await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        auto_book_status: 'success',
        gametime_confirmation_id: result.bookingId,
        actual_court: successfulCourt,
        status_message: successMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    console.log('');
    console.log(`[Server] ✅ Booking ${booking.id} CONFIRMED`);
    console.log(`[Server] Confirmation ID: ${result.bookingId}`);
    console.log(`[Server] Actual Court: ${successfulCourt}`);
    console.log('');
  } else {
    const errorMessage = result.error || (booking.accept_any_court
      ? `No courts available. Attempted: Courts ${courtsToTry.join(', ')}`
      : `Court ${booking.preferred_court} is not available`);

    const newRetryCount = result.nonRetryable ? 99 : booking.retry_count + 1;

    await supabase
      .from('bookings')
      .update({
        auto_book_status: 'failed',
        status_message: errorMessage,
        retry_count: newRetryCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    console.log('');
    console.log(`[Server] ❌ Booking ${booking.id} FAILED`);
    console.log(`[Server] Error: ${errorMessage}`);
    if (result.nonRetryable) {
      console.log(`[Server] Non-retryable failure - will not retry`);
    } else {
      console.log(`[Server] Retry count: ${newRetryCount}/3`);
    }
    console.log('');
  }
}

// Check for pending bookings every 1 hour
const CHECK_INTERVAL_MS = 3600000; // 1 hour

async function checkForNewBookings() {
  console.log(`[Server] Checking for new pending bookings (username: ${filterUsername})...`);

  try {
    // First, get the user_id for the specified username
    const { data: credentials, error: credError } = await supabase
      .from('user_credentials')
      .select('user_id')
      .eq('gametime_username', filterUsername)
      .limit(1);

    if (credError) {
      console.error(`[Server] Database error when looking up username: ${credError.message}`);
      return;
    }

    if (!credentials || credentials.length === 0) {
      console.error(`[Server] ERROR: Username '${filterUsername}' not found in user_credentials table`);
      console.error('[Server] Please check the username and try again');
      return;
    }

    const userId = credentials[0].user_id;
    console.log(`[Server] Found user ID: ${userId}`);

    // Now fetch bookings for this user only
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .in('auto_book_status', ['pending', 'failed'])
      .lt('retry_count', 3)
      .order('scheduled_execute_time', { ascending: true });

    if (error) {
      console.error('[Server] Database query error:', error.message);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Server] No new bookings found for this user');
      return;
    }

    console.log(`[Server] Found ${bookings.length} booking(s) for user ${filterUsername}`);
    console.log('');

    for (const booking of bookings) {
      // Skip if already scheduled
      if (scheduledBookings.has(booking.id)) {
        console.log(`[Server] Booking ${booking.id} already scheduled, skipping`);
        continue;
      }

      // Mark as scheduled
      scheduledBookings.add(booking.id);

      // Schedule the booking
      await scheduleBooking(booking);
    }

  } catch (error) {
    console.error('[Server] Error in checkForNewBookings:', error.message);
  }
}

console.log('[Server] ✅ Server started successfully');
console.log(`[Server] Polling interval: ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
console.log('[Server] Press Ctrl+C to stop');
console.log('');

// Run initial check immediately on startup
(async () => {
  console.log('[Server] Running initial check...');
  console.log('');
  await checkForNewBookings();

  // Then poll every hour
  setInterval(async () => {
    console.log('');
    console.log('[Server] ========== Hourly Check ==========');
    console.log('');
    await checkForNewBookings();
  }, CHECK_INTERVAL_MS);
})();
