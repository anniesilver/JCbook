/**
 * JC Court Booking Automation Server
 *
 * This server runs 24/7 on a Windows PC and executes pending court bookings
 * automatically using the verified Playwright solution.
 *
 * How it works:
 * 1. Checks Supabase database every 60 seconds for pending bookings
 * 2. Finds bookings where scheduled_execute_time <= now
 * 3. Decrypts GameTime password
 * 4. Executes booking using Playwright automation
 * 5. Updates database with confirmation ID or error
 */

const { createClient } = require('@supabase/supabase-js');
const { executeBooking } = require('./playwrightBooking');
const { decryptPassword } = require('./decryptPassword');
require('dotenv').config();

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
 * Main function to check and execute pending bookings
 */
async function checkAndExecuteBookings() {
  const now = new Date().toISOString();
  console.log(`[Server] [${now}] Checking for pending bookings...`);

  try {
    // Query bookings that are ready to execute
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .in('auto_book_status', ['pending', 'failed'])
      .lte('scheduled_execute_time', now)
      .lt('retry_count', 3)
      .order('scheduled_execute_time', { ascending: true });

    if (error) {
      console.error('[Server] Database query error:', error.message);
      console.error(error);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Server] No pending bookings found');
      return;
    }

    console.log(`[Server] Found ${bookings.length} booking(s) to execute`);
    console.log('');

    // Execute each booking sequentially
    for (const booking of bookings) {
      console.log('----------------------------------------');
      console.log(`[Server] Processing booking ${booking.id}`);

      // Fetch credentials for this user
      const { data: credentials, error: credError } = await supabase
        .from('user_credentials')
        .select('id, gametime_username, gametime_password, user_id')
        .eq('user_id', booking.user_id)
        .maybeSingle();

      if (credError || !credentials) {
        console.error(`[Server] Failed to fetch credentials for user ${booking.user_id}:`, credError?.message);
        await supabase
          .from('bookings')
          .update({
            auto_book_status: 'failed',
            status_message: 'Credentials not found for user',
            retry_count: booking.retry_count + 1
          })
          .eq('id', booking.id);
        continue;
      }

      booking.credentials = credentials;
      console.log(`[Server] Court: ${booking.preferred_court}`);
      console.log(`[Server] Date: ${booking.booking_date}`);
      console.log(`[Server] Time: ${booking.booking_time}`);
      console.log('');

      // Mark as in_progress immediately
      await supabase
        .from('bookings')
        .update({
          auto_book_status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      try {
        // Validate credentials exist
        if (!booking.credentials) {
          throw new Error('User credentials not found');
        }

        if (!booking.credentials.gametime_username || !booking.credentials.gametime_password) {
          throw new Error('GameTime username or password not configured');
        }

        // Decrypt GameTime password
        console.log('[Server] Decrypting GameTime password...');
        const decryptedPassword = decryptPassword(
          booking.credentials.gametime_password,
          booking.user_id  // Use USER ID, not credential ID!
        );

        console.log('[Server] Fetched credentials from database:');
        console.log(`[Server] - Username: ${booking.credentials.gametime_username}`);
        console.log(`[Server] - Password length: ${decryptedPassword ? decryptedPassword.length : 0} chars`);
        console.log(`[Server] - Password starts with: ${decryptedPassword ? decryptedPassword.substring(0, 3) + '...' : 'EMPTY'}`);

        // Convert time to minutes (e.g., "09:00" -> "540")
        const timeInMinutes = convertTimeToMinutes(booking.booking_time);

        // Execute booking with Playwright (OPTIMIZED VERSION)
        console.log('[Server] Executing booking with Playwright automation...');
        console.log(`[Server] Preferred court: ${booking.preferred_court}`);
        console.log(`[Server] Accept any court: ${booking.accept_any_court}`);

        // Build courts array: preferred first, then alternatives if accept_any_court is true
        const courtsToTry = [booking.preferred_court.toString()];
        if (booking.accept_any_court) {
          const allCourts = ['1', '2', '3', '4', '5', '6'];
          const alternateCourts = allCourts.filter(c => c !== booking.preferred_court.toString());
          courtsToTry.push(...alternateCourts);
        }

        console.log(`[Server] Courts to attempt: ${courtsToTry.join(', ')}`);
        console.log('[Server] Browser will stay open for all attempts (optimized!)');

        // Execute booking ONCE with all courts - browser stays open for all attempts
        const result = await executeBooking({
          username: booking.credentials.gametime_username,
          password: decryptedPassword,
          courts: courtsToTry,  // Pass array of courts
          date: booking.booking_date,
          time: timeInMinutes,
          guestName: 'Guest Player'
        });

        // Extract successful court from result
        const successfulCourt = result.courtBooked ? parseInt(result.courtBooked) : null;

        // Update database based on result
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
          console.log(`[Server] Message: ${successMessage}`);
          console.log(`[Server] Token submission time: ${result.timeGap}ms`);
          console.log('');
        } else {
          const errorMessage = booking.accept_any_court
            ? `No courts available. Attempted: Courts ${courtsToTry.join(', ')}`
            : `Court ${booking.preferred_court} is not available`;

          await supabase
            .from('bookings')
            .update({
              auto_book_status: 'failed',
              status_message: errorMessage,
              retry_count: booking.retry_count + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', booking.id);

          console.log('');
          console.log(`[Server] ❌ Booking ${booking.id} FAILED`);
          console.log(`[Server] Error: ${errorMessage}`);
          console.log(`[Server] Retry count: ${booking.retry_count + 1}/3`);
          console.log('');
        }
      } catch (error) {
        console.error(`[Server] Error executing booking ${booking.id}:`, error.message);
        console.error(error.stack);

        await supabase
          .from('bookings')
          .update({
            auto_book_status: 'failed',
            status_message: error.message,
            retry_count: booking.retry_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        console.log('');
        console.log(`[Server] ❌ Booking ${booking.id} FAILED with exception`);
        console.log(`[Server] Error: ${error.message}`);
        console.log('');
      }

      // Delay between bookings to avoid rate limiting
      console.log('[Server] Waiting 2 seconds before next booking...');
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log('========================================');
    console.log('[Server] Booking execution cycle completed');
    console.log('========================================');
    console.log('');

  } catch (error) {
    console.error('[Server] Fatal error in main loop:', error.message);
    console.error(error.stack);
  }
}

// Check for pending bookings every 60 seconds
const CHECK_INTERVAL_MS = 60000; // 60 seconds

setInterval(async () => {
  await checkAndExecuteBookings();
}, CHECK_INTERVAL_MS);

console.log('[Server] ✅ Server started successfully');
console.log(`[Server] Checking for bookings every ${CHECK_INTERVAL_MS / 1000} seconds...`);
console.log('[Server] Press Ctrl+C to stop');
console.log('');

// Run initial check immediately on startup
checkAndExecuteBookings();
