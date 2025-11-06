/**
 * Playwright Booking Module - OPTIMIZED VERSION
 *
 * Key optimization: Keeps browser session open for all court attempts
 * instead of logging in fresh for each court.
 */

const { chromium } = require('playwright');

/**
 * Static mapping of court display numbers to GameTime court IDs
 */
const COURT_ID_MAPPING = {
  '1': '50',
  '2': '51',
  '3': '52',
  '4': '53',
  '5': '54',
  '6': '55'
};

/**
 * Random delay helper (mimics human behavior)
 */
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Try booking a single court with existing browser session
 */
async function tryBookCourt(page, context, court, date, time, guestName) {
  try {
    console.log(`[PlaywrightBooking] === Attempting Court ${court} ===`);

    // Map court number to GameTime court ID
    const gameTimeCourtId = COURT_ID_MAPPING[court];
    if (!gameTimeCourtId) {
      console.log(`[PlaywrightBooking] ❌ Court ${court} not found in mapping`);
      return { success: false, error: `Court ${court} not configured` };
    }

    console.log(`[PlaywrightBooking] Court ${court} → GameTime Court ID: ${gameTimeCourtId}`);

    // Format date without leading zeros
    const dateParts = date.split('-');
    const formattedDate = `${dateParts[0]}-${parseInt(dateParts[1])}-${parseInt(dateParts[2])}`;

    const bookingFormUrl = `https://jct.gametime.net/scheduling/index/book/sport/1/court/${gameTimeCourtId}/date/${formattedDate}/time/${time}`;

    console.log(`[PlaywrightBooking] Loading booking form: ${bookingFormUrl}`);
    await page.goto(bookingFormUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for form fields
    await page.waitForSelector('input[name="temp"]', { timeout: 10000, state: 'attached' });
    await page.waitForSelector('input[name="players[1][user_id]"]', { timeout: 10000, state: 'attached' });

    // Wait for reCAPTCHA
    await page.waitForFunction(() => {
      return typeof window.grecaptcha !== 'undefined';
    }, { timeout: 10000 }).catch(() => {
      console.log('[PlaywrightBooking] WARNING: grecaptcha not loaded');
    });

    await new Promise(r => setTimeout(r, 1000));

    // Generate fresh reCAPTCHA token
    console.log(`[PlaywrightBooking] Generating fresh reCAPTCHA token for Court ${court}...`);
    const freshToken = await page.evaluate(async () => {
      const siteKey = '6LeW9NsUAAAAAC9KRF2JvdLtGMSds7hrBdxuOnLH';
      const token = await window.grecaptcha.execute(siteKey, {action: 'homepage'});
      return token;
    }).catch(err => {
      console.error('[PlaywrightBooking] Failed to execute grecaptcha:', err.message);
      return null;
    });

    if (!freshToken) {
      return { success: false, error: 'Failed to generate reCAPTCHA token' };
    }

    console.log(`[PlaywrightBooking] Token generated: ${freshToken.substring(0, 50)}...`);

    // Extract form fields
    const temp = await page.$eval('input[name="temp"]', el => el.value).catch(() => '');
    const userId = await page.$eval('input[name="players[1][user_id]"]', el => el.value).catch(() => '');
    const userName = await page.$eval('input[name="players[1][name]"]', el => el.value).catch(() => '');

    const tokenExtractedTime = Date.now();

    // Get cookies for HTTP POST
    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Submit via HTTP POST
    console.log(`[PlaywrightBooking] Submitting booking for Court ${court}...`);

    if (!userId) {
      return { success: false, error: 'Missing user_id from form extraction' };
    }

    // Build form data
    const formData = new URLSearchParams();
    formData.append('edit', '');
    formData.append('is_register', '');
    formData.append('rt_key', '');
    formData.append('temp', temp);
    formData.append('upd', 'true');
    formData.append('duration', '30');
    formData.append('g-recaptcha-response', freshToken);
    formData.append('court', gameTimeCourtId);
    formData.append('date', date);
    formData.append('time', time);
    formData.append('sportSel', '1');
    formData.append('duration', '60');
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
    console.log(`[PlaywrightBooking] Time gap: ${timeGap}ms`);

    // Check result
    let finalUrl = submitResponse.url;
    let success = false;
    let bookingId = null;

    if (submitResponse.status === 302) {
      const location = submitResponse.headers.get('location');
      if (location) {
        finalUrl = location.startsWith('http') ? location : 'https://jct.gametime.net' + location;

        if (finalUrl.includes('/confirmation')) {
          success = true;
          const bookingIdMatch = finalUrl.match(/id\/(\d+)/);
          bookingId = bookingIdMatch ? bookingIdMatch[1] : null;
        }
      }
    }

    if (success) {
      console.log(`[PlaywrightBooking] ✅ Court ${court} booking SUCCESSFUL!`);
      console.log(`[PlaywrightBooking] Booking ID: ${bookingId}`);
      return {
        success: true,
        bookingId: bookingId,
        courtBooked: court,
        actualCourtId: gameTimeCourtId,
        confirmationUrl: finalUrl,
        timeGap: timeGap
      };
    } else {
      console.log(`[PlaywrightBooking] ❌ Court ${court} booking failed (likely unavailable)`);
      return {
        success: false,
        error: `Court ${court} is unavailable`,
        courtTried: court
      };
    }

  } catch (error) {
    console.error(`[PlaywrightBooking] Error trying Court ${court}:`, error.message);
    return {
      success: false,
      error: error.message,
      courtTried: court
    };
  }
}

/**
 * Execute a court booking using Playwright automation
 * OPTIMIZED: Keeps browser session open for all court attempts
 *
 * @param {Object} params - Booking parameters
 * @param {string} params.username - GameTime username
 * @param {string} params.password - GameTime password (decrypted)
 * @param {Array<string>} params.courts - Array of court IDs to try in order (e.g., ["3", "1", "2"])
 * @param {string} params.date - Booking date in YYYY-MM-DD format
 * @param {string} params.time - Time in minutes from midnight (e.g., "540" = 9:00 AM)
 * @param {string} [params.guestName] - Guest player name (default: "Guest Player")
 *
 * @returns {Promise<Object>} Result object
 */
async function executeBooking(params) {
  const { username, password, courts, date, time, guestName = 'Guest Player' } = params;

  console.log(`[PlaywrightBooking] ========================================`);
  console.log(`[PlaywrightBooking] Starting booking execution`);
  console.log(`[PlaywrightBooking] Courts to try: ${courts.join(', ')}`);
  console.log(`[PlaywrightBooking] Date: ${date}, Time: ${time}`);
  console.log(`[PlaywrightBooking] Username: ${username}`);
  console.log(`[PlaywrightBooking] ========================================`);

  let browser = null;
  let context = null;
  let page = null;

  try {
    // ===================================================================
    // PHASE 1: LOGIN ONCE
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 1: Logging in (ONE TIME)');

    browser = await chromium.launch({
      headless: false, // TEMPORARILY non-headless for debugging
      args: ['--disable-blink-features=AutomationControlled']
    });

    context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('[PlaywrightBooking] Loading login page...');
    await page.goto('https://jct.gametime.net/auth', { waitUntil: 'networkidle', timeout: 30000 });

    await new Promise(r => setTimeout(r, randomDelay(1000, 2000)));

    console.log('[PlaywrightBooking] Entering credentials...');
    const usernameField = await page.$('input[type="text"]');
    if (!usernameField) throw new Error('Username field not found');

    await usernameField.click();
    await new Promise(r => setTimeout(r, randomDelay(200, 400)));
    await usernameField.type(username, { delay: randomDelay(50, 150) });

    await new Promise(r => setTimeout(r, randomDelay(500, 800)));

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

    await new Promise(r => setTimeout(r, 2000));

    // Verify login succeeded
    const currentUrl = page.url();
    console.log(`[PlaywrightBooking] Current URL after login: ${currentUrl}`);

    if (currentUrl.includes('/auth')) {
      throw new Error('Login failed - still on auth page. Please check credentials.');
    }

    console.log('[PlaywrightBooking] ✅ Login successful! Session established.');
    console.log('');

    // ===================================================================
    // PHASE 2: TRY EACH COURT WITH SAME SESSION
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 2: Trying courts sequentially with same session');
    console.log('');

    let finalResult = null;

    for (const court of courts) {
      const result = await tryBookCourt(page, context, court, date, time, guestName);

      if (result.success) {
        console.log('');
        console.log(`[PlaywrightBooking] 🎉 SUCCESS! Booked Court ${court}`);
        console.log('');
        finalResult = result;
        break; // Stop trying once we succeed
      } else {
        console.log('');
        console.log(`[PlaywrightBooking] Court ${court} failed, trying next...`);
        console.log('');
        // Small delay before trying next court
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // ===================================================================
    // PHASE 3: CLOSE BROWSER (FINALLY!)
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 3: Closing browser session');
    await browser.close();
    browser = null;
    console.log('[PlaywrightBooking] ✅ Browser closed');
    console.log('');

    if (finalResult && finalResult.success) {
      return finalResult;
    } else {
      return {
        success: false,
        error: `All courts unavailable. Tried: ${courts.join(', ')}`
      };
    }

  } catch (error) {
    console.error(`[PlaywrightBooking] FATAL ERROR: ${error.message}`);
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
