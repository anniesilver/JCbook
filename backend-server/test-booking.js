/**
 * Test Booking Script
 *
 * This script tests the Playwright booking automation without connecting to Supabase.
 * Use this to verify the server can execute bookings successfully.
 *
 * IMPORTANT: Update the credentials and booking details below before running!
 */

const { executeBooking } = require('./playwrightBooking');

async function testBooking() {
  console.log('========================================');
  console.log('Testing Playwright Booking Automation');
  console.log('========================================');
  console.log('');

  // ===================================================================
  // CONFIGURE TEST BOOKING PARAMETERS
  // ===================================================================
  const testParams = {
    // GameTime credentials
    username: 'annieyang',           // CHANGE THIS to your GameTime username
    password: 'jc333666',            // CHANGE THIS to your GameTime password

    // Booking details
    court: '52',                     // Court ID (52 = specific court at JCT)
    date: '2025-11-05',              // Booking date (YYYY-MM-DD)
    time: '540',                     // Time in minutes from midnight (540 = 9:00 AM)
    guestName: 'Test Guest'          // Guest player name
  };

  console.log('Test Parameters:');
  console.log('  Username:', testParams.username);
  console.log('  Password:', '***' + testParams.password.substring(testParams.password.length - 3));
  console.log('  Court:', testParams.court);
  console.log('  Date:', testParams.date);
  console.log('  Time:', testParams.time, '(minutes from midnight)');
  console.log('  Guest:', testParams.guestName);
  console.log('');

  // Convert time to human-readable format
  const timeMinutes = parseInt(testParams.time);
  const hours = Math.floor(timeMinutes / 60);
  const minutes = timeMinutes % 60;
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  console.log(`  Human-readable time: ${timeStr}`);
  console.log('');

  // Confirm before executing
  console.log('WARNING: This will attempt to book a REAL court!');
  console.log('Press Ctrl+C within 5 seconds to cancel...');
  console.log('');

  await new Promise(r => setTimeout(r, 5000));

  console.log('Starting booking execution...');
  console.log('');

  try {
    const result = await executeBooking(testParams);

    console.log('');
    console.log('========================================');
    console.log('TEST RESULT');
    console.log('========================================');
    console.log('');

    if (result.success) {
      console.log('✅ SUCCESS!');
      console.log('');
      console.log('Booking confirmed:');
      console.log('  Booking ID:', result.bookingId);
      console.log('  Confirmation URL:', result.confirmationUrl);
      console.log('  Token submission time:', result.timeGap + 'ms');
      console.log('');
      console.log('The booking automation is working correctly!');
      console.log('You can now run the server with: npm start');
      console.log('');
    } else {
      console.log('❌ FAILED');
      console.log('');
      console.log('Error:', result.error);
      if (result.redirectUrl) {
        console.log('Redirect URL:', result.redirectUrl);
      }
      if (result.timeGap) {
        console.log('Token submission time:', result.timeGap + 'ms');
      }
      console.log('');
      console.log('Please check:');
      console.log('  - GameTime credentials are correct');
      console.log('  - Court and time are available');
      console.log('  - Internet connection is stable');
      console.log('  - Playwright is installed (npx playwright install chromium)');
      console.log('');
    }

  } catch (error) {
    console.log('');
    console.log('========================================');
    console.log('TEST ERROR');
    console.log('========================================');
    console.log('');
    console.log('❌ Test failed with exception:');
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    console.log('Stack trace:');
    console.log(error.stack);
    console.log('');
  }
}

// Run the test
testBooking().catch(console.error);
