/**
 * Test Script for Playwright Booking Automation (JavaScript version)
 *
 * This script tests the executeBooking function with real credentials
 * to verify the booking automation works correctly.
 *
 * Usage:
 *   node scripts/test-playwright-booking.js
 *
 * Environment:
 *   - Requires Playwright to be installed
 *   - Requires GameTime.net account credentials
 *   - Tests against real GameTime.net API
 */

const { chromium } = require('playwright');

// Inline implementation of executeBooking for testing
async function executeBooking(params) {
  let browser = null;

  try {
    console.log('[PlaywrightBooking] Starting booking automation');
    console.log(`[PlaywrightBooking] Court: ${params.court}, Date: ${params.date}, Time: ${params.time}`);

    // Convert time to minutes
    const [hours, minutes] = params.time.split(':').map(Number);
    const timeInMinutes = (hours * 60 + minutes).toString();

    // Launch headless browser
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    console.log('[PlaywrightBooking] Logging in to GameTime...');
    await page.goto('https://jct.gametime.net/auth', { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    const usernameField = await page.$('input[type="text"]');
    await usernameField.type(params.username, { delay: 100 });

    const passwordField = await page.$('input[type="password"]');
    await passwordField.type(params.password, { delay: 100 });

    const loginButton = await page.$('input[type="submit"]') || await page.$('button[type="submit"]');
    await loginButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});

    console.log('[PlaywrightBooking] Login successful');

    // Capture cookies
    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`[PlaywrightBooking] Captured ${cookies.length} cookies`);

    // Load booking form
    const bookingFormUrl = `https://jct.gametime.net/scheduling/index/book/sport/1/court/${params.court}/date/${params.date}/time/${timeInMinutes}`;

    console.log('[PlaywrightBooking] Loading booking form...');
    await page.goto(bookingFormUrl, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('input[name="temp"]', { timeout: 10000, state: 'attached' });
    await page.waitForSelector('input[name="players[1][user_id]"]', { timeout: 10000, state: 'attached' });

    // Wait for reCAPTCHA
    console.log('[PlaywrightBooking] Waiting for reCAPTCHA...');
    await page.waitForFunction(() => typeof window.grecaptcha !== 'undefined', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate fresh token
    console.log('[PlaywrightBooking] Generating fresh reCAPTCHA token...');
    const freshToken = await page.evaluate(async () => {
      const siteKey = '6LeW9NsUAAAAAC9KRF2JvdLtGMSds7hrBdxuOnLH';
      return await window.grecaptcha.execute(siteKey, { action: 'homepage' });
    });

    if (!freshToken) {
      throw new Error('Failed to generate fresh reCAPTCHA token');
    }

    console.log(`[PlaywrightBooking] Fresh token generated: ${freshToken.substring(0, 50)}...`);

    // Extract form fields
    const temp = await page.$eval('input[name="temp"]', el => el.value).catch(() => '');
    const userId = await page.$eval('input[name="players[1][user_id]"]', el => el.value).catch(() => '');
    const userName = await page.$eval('input[name="players[1][name]"]', el => el.value).catch(() => '');

    console.log('[PlaywrightBooking] Extracted form fields');
    console.log(`[PlaywrightBooking] temp: ${temp}, userId: ${userId}, userName: ${userName}`);

    const tokenExtractedTime = Date.now();

    // Close browser
    await browser.close();
    browser = null;
    console.log('[PlaywrightBooking] Browser closed - switching to HTTP POST');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Submit via HTTP POST
    const formData = new URLSearchParams();
    formData.append('edit', '');
    formData.append('is_register', '');
    formData.append('rt_key', '');
    formData.append('temp', temp);
    formData.append('upd', 'true');
    formData.append('duration', '30');
    formData.append('g-recaptcha-response', freshToken);
    formData.append('court', params.court);
    formData.append('date', params.date);
    formData.append('time', timeInMinutes);
    formData.append('sportSel', '1');
    formData.append('duration', '60');
    formData.append('rtype', '13');
    formData.append('invite_for', 'Singles');
    formData.append('players[1][user_id]', userId);
    formData.append('players[1][name]', userName);
    formData.append('players[2][user_id]', '');
    formData.append('players[2][name]', params.guestName || 'Guest Player');
    formData.append('players[2][guest]', 'on');
    formData.append('players[2][guestof]', '1');
    formData.append('payee_hide', userId);
    formData.append('bookingWaiverPolicy', 'true');

    console.log('[PlaywrightBooking] Submitting booking via HTTP POST...');

    const submitResponse = await fetch('https://jct.gametime.net/scheduling/index/save?errs=', {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://jct.gametime.net',
        'Referer': bookingFormUrl,
        'Upgrade-Insecure-Requests': '1'
      },
      body: formData.toString(),
      redirect: 'manual'
    });

    const submissionTime = Date.now();
    const timeGap = submissionTime - tokenExtractedTime;

    console.log(`[PlaywrightBooking] Token submitted in ${timeGap}ms`);
    console.log(`[PlaywrightBooking] Response status: ${submitResponse.status}`);

    if (submitResponse.status === 302) {
      const location = submitResponse.headers.get('location');
      const finalUrl = location?.startsWith('http') ? location : `https://jct.gametime.net${location}`;

      console.log(`[PlaywrightBooking] Redirect to: ${finalUrl}`);

      if (finalUrl && finalUrl.includes('/confirmation')) {
        const bookingIdMatch = finalUrl.match(/id\/(\d+)/);
        const bookingId = bookingIdMatch ? bookingIdMatch[1] : undefined;

        console.log(`[PlaywrightBooking] SUCCESS - Booking confirmed! ID: ${bookingId}`);

        return {
          success: true,
          bookingId: bookingId,
          url: finalUrl
        };
      } else if (finalUrl && finalUrl.includes('/bookerror')) {
        console.log('[PlaywrightBooking] FAILED - Booking rejected by server');
        return {
          success: false,
          error: 'Booking rejected by GameTime server',
          url: finalUrl
        };
      }
    }

    console.log(`[PlaywrightBooking] FAILED - Unexpected response: ${submitResponse.status}`);
    return {
      success: false,
      error: `Unexpected response: ${submitResponse.status}`
    };

  } catch (error) {
    const message = error.message || 'Unknown error';
    console.error('[PlaywrightBooking] Error:', message);

    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      error: message
    };
  }
}

async function test() {
  console.log('========================================');
  console.log('Playwright Booking Automation Test');
  console.log('========================================\n');

  // Test parameters
  const testParams = {
    username: 'annieyang',
    password: 'jc333666',
    court: '52',          // Court 3 (ID 52)
    date: '2025-11-05',   // Tomorrow's date
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
    console.error('Error:', error.message || String(error));
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack || 'N/A');
    console.error('\n========================================\n');
    process.exit(1);
  }
}

// Run test
test();
