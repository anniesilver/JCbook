/**
 * Test Script for Playwright Booking Automation
 *
 * This script tests the executeBooking function with real credentials
 * to verify the booking automation works correctly.
 *
 * Usage:
 *   npx ts-node scripts/test-playwright-booking.ts
 *
 * Environment:
 *   - Requires Playwright to be installed
 *   - Requires GameTime.net account credentials
 *   - Tests against real GameTime.net API
 */

import { executeBooking } from '../src/services/playwrightBookingService.js';

async function test() {
  console.log('========================================');
  console.log('Playwright Booking Automation Test');
  console.log('========================================\n');

  // Test parameters
  const testParams = {
    username: 'annieyang',
    password: 'jc333666',
    court: '52',          // Court 3 (ID 52)
    date: '2025-11-04',   // Today's date (update as needed)
    time: '09:00',        // 9:00 AM
    guestName: 'Test Guest'
  };

  console.log('Test Parameters:');
  console.log('  Username:', testParams.username);
  console.log('  Court ID:', testParams.court);
  console.log('  Date:', testParams.date);
  console.log('  Time:', testParams.time);
  console.log('  Guest Name:', testParams.guestName);
  console.log('');

  console.log('Starting booking automation...\n');

  try {
    // Execute booking
    const result = await executeBooking(testParams);

    console.log('\n========================================');
    console.log('Test Result');
    console.log('========================================\n');

    if (result.success) {
      console.log('✅ SUCCESS - Booking completed!');
      console.log('');
      console.log('Details:');
      console.log('  Booking ID:', result.bookingId || 'N/A');
      console.log('  Confirmation URL:', result.url || 'N/A');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Verify booking appears in GameTime.net dashboard');
      console.log('  2. Check booking confirmation email');
      console.log('  3. Confirm booking details match test parameters');
    } else {
      console.log('❌ FAILED - Booking failed');
      console.log('');
      console.log('Error:', result.error);
      console.log('URL:', result.url || 'N/A');
      console.log('');
      console.log('Troubleshooting:');
      console.log('  1. Check GameTime.net credentials are valid');
      console.log('  2. Verify court is available at specified time');
      console.log('  3. Check internet connection');
      console.log('  4. Review logs above for specific errors');
    }

    console.log('\n========================================\n');

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ FATAL ERROR');
    console.error('========================================\n');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('');
    console.error('Stack trace:');
    console.error(error instanceof Error ? error.stack : 'N/A');
    console.error('\n========================================\n');
    process.exit(1);
  }
}

// Run test
test();
