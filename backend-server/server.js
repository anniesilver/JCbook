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
const { syncWithGameTimeServer, measureNetworkLatency, isTimeSyncFresh } = require('./timeSync');
require('dotenv').config();

// Track scheduled bookings to avoid double-scheduling
const scheduledBookings = new Set();

console.log('========================================');
console.log('JC Court Booking Automation Server');
console.log('========================================');
console.log('');
console.log('[Server] Starting...');

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

    // Initial sync 10 minutes before execution
    const initialSyncTime = delayMs - (10 * 60 * 1000);
    if (initialSyncTime > 0) {
      setTimeout(async () => {
        console.log('[Scheduler] Initial time sync (T-10min)...');
        await syncWithGameTimeServer();
      }, initialSyncTime);
    } else {
      // Less than 10 minutes away, sync NOW
      console.log('[Scheduler] Booking soon - syncing time now...');
      await syncWithGameTimeServer();
    }

    // Final sync 2 minutes before execution for maximum precision
    const finalSyncTime = delayMs - (2 * 60 * 1000);
    if (finalSyncTime > 0) {
      setTimeout(async () => {
        console.log('[Scheduler] Final time sync (T-2min) for maximum precision...');
        await syncWithGameTimeServer();
      }, finalSyncTime);
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
  console.log('[Server] Checking for new pending bookings...');

  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .in('auto_book_status', ['pending', 'failed'])
      .lt('retry_count', 3)
      .order('scheduled_execute_time', { ascending: true });

    if (error) {
      console.error('[Server] Database query error:', error.message);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Server] No new bookings found');
      return;
    }

    console.log(`[Server] Found ${bookings.length} booking(s)`);
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

// Test network latency on startup
(async () => {
  console.log('[Server] Testing network latency to GameTime server...');
  console.log('');

  try {
    const rtt = await measureNetworkLatency();
    const tokenDelay = rtt + 200;

    console.log('');
    console.log('========================================');
    console.log('[Server] Network Configuration');
    console.log('========================================');
    console.log(`[Server] Baseline RTT:           ${rtt}ms`);
    console.log(`[Server] Token generation delay: T-${tokenDelay}ms (RTT + 200ms safety buffer)`);
    console.log(`[Server] This means in PRECISION mode:`);
    console.log(`[Server]   - Token will be generated ${tokenDelay}ms before T-0`);
    console.log(`[Server]   - Submit will happen at T-0 (8:00:00.000 AM)`);
    console.log(`[Server]   - Expected arrival at server: ~${Math.floor(rtt/2)}ms after T-0`);
    console.log('========================================');
    console.log('');

    if (rtt > 300) {
      console.log('⚠️  WARNING: High network latency detected!');
      console.log(`⚠️  RTT of ${rtt}ms is quite high. Consider:`);
      console.log('⚠️  1. Running server closer to US East Coast');
      console.log('⚠️  2. Using a VPN with US servers');
      console.log('⚠️  3. Checking network connection quality');
      console.log('');
    }
  } catch (error) {
    console.error('[Server] Failed to measure network latency:', error.message);
    console.log('[Server] Will use 150ms default RTT + 200ms buffer = T-350ms for token generation');
    console.log('');
  }

  console.log('[Server] ✅ Server started successfully');
  console.log(`[Server] Polling interval: ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
  console.log('[Server] Press Ctrl+C to stop');
  console.log('');

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
