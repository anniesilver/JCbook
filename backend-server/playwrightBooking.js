/**
 * Playwright Booking Module
 *
 * This module ports the EXACT working solution from test-G-auto-fresh-token.js
 * to execute court bookings using Playwright automation.
 *
 * Success Rate: 100% (verified with Test G - Booking ID: 278886)
 * Method: Fresh reCAPTCHA token + HTTP POST
 */

const { chromium } = require('playwright');

/**
 * Random delay helper (mimics human behavior)
 */
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Execute a court booking using Playwright automation
 *
 * @param {Object} params - Booking parameters
 * @param {string} params.username - GameTime username
 * @param {string} params.password - GameTime password (decrypted)
 * @param {string} params.court - Court ID (e.g., "52")
 * @param {string} params.date - Booking date in YYYY-MM-DD format
 * @param {string} params.time - Time in minutes from midnight (e.g., "540" = 9:00 AM)
 * @param {string} [params.guestName] - Guest player name (default: "Guest Player")
 *
 * @returns {Promise<Object>} Result object { success: boolean, bookingId?: string, error?: string }
 */
async function executeBooking(params) {
  const { username, password, court, date, time, guestName = 'Guest Player' } = params;

  console.log(`[PlaywrightBooking] Starting booking execution for court ${court} on ${date} at ${time}`);

  let browser = null;
  let context = null;
  let page = null;

  try {
    // ===================================================================
    // PHASE 1: AUTOMATED LOGIN
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 1: Automated Login');

    browser = await chromium.launch({
      headless: true, // Run headless in production
      args: ['--disable-blink-features=AutomationControlled']
    });

    context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('[PlaywrightBooking] Loading login page...');
    await page.goto('https://jct.gametime.net/auth', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('[PlaywrightBooking] Waiting for login form...');
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    await new Promise(r => setTimeout(r, 500));

    console.log('[PlaywrightBooking] Entering username...');
    const usernameField = await page.$('input[type="text"]');
    if (!usernameField) throw new Error('Username field not found');

    await usernameField.click();
    await new Promise(r => setTimeout(r, randomDelay(200, 400)));
    await usernameField.type(username, { delay: randomDelay(50, 150) });

    await new Promise(r => setTimeout(r, randomDelay(500, 800)));

    console.log('[PlaywrightBooking] Entering password...');
    const passwordField = await page.$('input[type="password"]');
    if (!passwordField) throw new Error('Password field not found');

    await passwordField.click();
    await new Promise(r => setTimeout(r, randomDelay(200, 400)));
    await passwordField.type(password, { delay: randomDelay(50, 150) });

    await new Promise(r => setTimeout(r, randomDelay(500, 1000)));

    console.log('[PlaywrightBooking] Clicking login button...');
    const loginButton = await page.$('input[type="submit"]') ||
                        await page.$('button[type="submit"]') ||
                        await page.$('button.btn-primary') ||
                        await page.$('form button');

    if (!loginButton) throw new Error('Login button not found');

    await loginButton.click();

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      // Navigation might complete without full networkidle
    }

    console.log('[PlaywrightBooking] Login completed');
    await new Promise(r => setTimeout(r, 2000));

    // ===================================================================
    // PHASE 2: CAPTURE COOKIES
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 2: Capturing Session Cookies');

    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    console.log(`[PlaywrightBooking] Captured ${cookies.length} cookies`);

    // ===================================================================
    // PHASE 3: LOAD BOOKING FORM
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 3: Loading Booking Form');

    // Format date without leading zeros (e.g., 2025-11-07 -> 2025-11-7)
    // GameTime.net requires dates without leading zeros in the URL
    const dateParts = date.split('-');
    const formattedDate = `${dateParts[0]}-${parseInt(dateParts[1])}-${parseInt(dateParts[2])}`;

    const bookingFormUrl = `https://jct.gametime.net/scheduling/index/book/sport/1/court/${court}/date/${formattedDate}/time/${time}`;

    console.log(`[PlaywrightBooking] Navigating to booking form: ${bookingFormUrl}`);
    await page.goto(bookingFormUrl, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('[PlaywrightBooking] Waiting for form fields...');
    // Hidden inputs need state: 'attached' instead of 'visible'
    await page.waitForSelector('input[name="temp"]', { timeout: 10000, state: 'attached' });
    await page.waitForSelector('input[name="players[1][user_id]"]', { timeout: 10000, state: 'attached' });

    console.log('[PlaywrightBooking] Waiting for reCAPTCHA to load...');

    await page.waitForFunction(() => {
      return typeof window.grecaptcha !== 'undefined';
    }, { timeout: 10000 }).catch(() => {
      console.log('[PlaywrightBooking] WARNING: grecaptcha not loaded');
    });

    console.log('[PlaywrightBooking] reCAPTCHA loaded');
    await new Promise(r => setTimeout(r, 1000));

    // ===================================================================
    // PHASE 4: GENERATE FRESH TOKEN (CRITICAL!)
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 4: Generating FRESH reCAPTCHA Token');
    console.log('[PlaywrightBooking] Calling grecaptcha.execute({action: "homepage"})...');

    const freshToken = await page.evaluate(async () => {
      const siteKey = '6LeW9NsUAAAAAC9KRF2JvdLtGMSds7hrBdxuOnLH';

      // Call grecaptcha.execute() and wait for the promise
      const token = await window.grecaptcha.execute(siteKey, {action: 'homepage'});
      return token;
    }).catch(err => {
      console.error('[PlaywrightBooking] Failed to execute grecaptcha:', err.message);
      return null;
    });

    if (!freshToken) {
      throw new Error('Failed to generate fresh reCAPTCHA token');
    }

    console.log(`[PlaywrightBooking] Fresh token generated: ${freshToken.substring(0, 50)}...`);

    // ===================================================================
    // PHASE 5: EXTRACT OTHER FORM FIELDS
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 5: Extracting Form Fields');

    const temp = await page.$eval('input[name="temp"]', el => el.value).catch(() => '');
    console.log(`[PlaywrightBooking] temp: ${temp}`);

    const userId = await page.$eval('input[name="players[1][user_id]"]', el => el.value).catch(() => '');
    console.log(`[PlaywrightBooking] user_id: ${userId}`);

    const userName = await page.$eval('input[name="players[1][name]"]', el => el.value).catch(() => '');
    console.log(`[PlaywrightBooking] user_name: ${userName}`);

    const tokenExtractedTime = Date.now();

    // ===================================================================
    // PHASE 6: CLOSE BROWSER
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 6: Closing Browser');

    await browser.close();
    browser = null;

    console.log('[PlaywrightBooking] Browser closed');
    console.log('[PlaywrightBooking] From this point: PURE HTTP POST with FRESH token!');

    await new Promise(r => setTimeout(r, 500));

    // ===================================================================
    // PHASE 7: SUBMIT VIA HTTP POST
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 7: Submitting via HTTP POST');

    if (!userId) {
      throw new Error('Missing user_id from form extraction');
    }

    // Build form data with FRESH token
    // CRITICAL: Use URLSearchParams.append() to preserve duplicate 'duration' fields
    const formData = new URLSearchParams();
    formData.append('edit', '');
    formData.append('is_register', '');
    formData.append('rt_key', '');
    formData.append('temp', temp);
    formData.append('upd', 'true');
    formData.append('duration', '30');              // First duration
    formData.append('g-recaptcha-response', freshToken);  // FRESH TOKEN!
    formData.append('court', court);
    formData.append('date', date);
    formData.append('time', time);
    formData.append('sportSel', '1');
    formData.append('duration', '60');              // Second duration (duplicate key!)
    formData.append('rtype', '13');
    formData.append('invite_for', 'Singles');
    formData.append('players[1][user_id]', userId);
    formData.append('players[1][name]', userName);
    formData.append('players[2][user_id]', '');
    formData.append('players[2][name]', guestName);
    formData.append('players[2][guest]', 'on');
    formData.append('players[2][guestof]', '1');
    formData.append('payee_hide', userId);
    formData.append('bookingWaiverPolicy', 'true');

    console.log('[PlaywrightBooking] Form data prepared with FRESH token');

    console.log('[PlaywrightBooking] Submitting to: /scheduling/index/save?errs=');

    const submitResponse = await fetch('https://jct.gametime.net/scheduling/index/save?errs=', {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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

    console.log(`[PlaywrightBooking] Response Status: ${submitResponse.status} ${submitResponse.statusText}`);
    console.log(`[PlaywrightBooking] Time gap (token generation → submission): ${timeGap}ms`);

    // ===================================================================
    // PHASE 8: CHECK RESULT
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 8: Checking Result');

    let finalUrl = submitResponse.url;
    let success = false;
    let bookingId = null;

    if (submitResponse.status === 302) {
      const location = submitResponse.headers.get('location');
      console.log(`[PlaywrightBooking] Redirect detected: ${location}`);

      if (location) {
        finalUrl = location.startsWith('http') ? location : 'https://jct.gametime.net' + location;

        if (finalUrl.includes('/confirmation')) {
          success = true;
          // Extract booking ID from URL
          const bookingIdMatch = finalUrl.match(/id\/(\d+)/);
          bookingId = bookingIdMatch ? bookingIdMatch[1] : null;
        } else if (finalUrl.includes('/bookerror')) {
          success = false;
        }
      }
    }

    // ===================================================================
    // FINAL RESULT
    // ===================================================================
    if (success) {
      console.log(`[PlaywrightBooking] ✅ SUCCESS - Booking confirmed with FRESH token!`);
      console.log(`[PlaywrightBooking] Booking ID: ${bookingId}`);
      console.log(`[PlaywrightBooking] Confirmation URL: ${finalUrl}`);
      console.log(`[PlaywrightBooking] Token submitted within ${timeGap}ms (very fresh!)`);

      return {
        success: true,
        bookingId: bookingId,
        confirmationUrl: finalUrl,
        timeGap: timeGap
      };
    } else {
      console.log(`[PlaywrightBooking] ❌ FAILED - Booking rejected`);
      console.log(`[PlaywrightBooking] Redirect URL: ${finalUrl}`);

      return {
        success: false,
        error: 'Booking rejected by GameTime server',
        redirectUrl: finalUrl,
        timeGap: timeGap
      };
    }

  } catch (error) {
    console.error(`[PlaywrightBooking] ERROR: ${error.message}`);
    console.error(error.stack);

    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { executeBooking };
