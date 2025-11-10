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
 * Check which courts are available at the requested date/time
 * Navigates to the Tennis schedule page and parses the availability table
 *
 * @param {Page} page - Playwright page object (already logged in)
 * @param {string} date - Booking date in YYYY-MM-DD format
 * @param {string} time - Time in minutes from midnight (e.g., "540" = 9:00 AM)
 * @returns {Promise<string[]|null>} Array of available court numbers (e.g., ["1", "3", "5"]),
 *                                    empty array [] if none available, or null if check failed
 */
async function getAvailableCourts(page, date, time) {
  try {
    console.log('[PlaywrightBooking] === Checking Court Availability ===');
    console.log(`[PlaywrightBooking] Date: ${date}, Time: ${time} minutes`);

    // Navigate to Tennis schedule page with specific date (using hash fragment)
    const scheduleUrl = `https://jct.gametime.net/scheduling/index/index/sport/1#date=${date}&group=null`;
    console.log(`[PlaywrightBooking] Loading schedule: ${scheduleUrl}`);

    await page.goto(scheduleUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for the schedule table to load
    await page.waitForSelector('table.courtViewer', { timeout: 10000 });
    // Extra wait for dynamic content to update (hash navigation might trigger AJAX)
    await new Promise(r => setTimeout(r, 2000));

    // Capture browser console logs (so we can see debug output from page.evaluate)
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.text()}`);
    });

    // Extract availability data using page.evaluate
    const availableCourts = await page.evaluate((targetTimeMinutes) => {
      const results = [];

      // Convert minutes to 12-hour format (e.g., 1320 -> "10:00 pm")
      function minutesToTimeString(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const period = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        const displayMins = mins.toString().padStart(2, '0');
        return `${displayHours}:${displayMins} ${period}`;
      }

      const targetTimeString = minutesToTimeString(targetTimeMinutes);
      console.log(`Target time: ${targetTimeMinutes} minutes = "${targetTimeString}"`);

      // Find the table
      const table = document.querySelector('table.courtViewer');
      if (!table) {
        console.log('Schedule table not found');
        return [];
      }

      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) {
        console.log('Not enough rows in table');
        return [];
      }

      // Extract court numbers from header row
      const headerRow = rows[0];
      const courtHeaders = Array.from(headerRow.querySelectorAll('th, td'));
      const courtMapping = {};

      courtHeaders.forEach((header, index) => {
        const text = header.textContent.trim();
        const courtMatch = text.match(/Court (\d+)/);
        if (courtMatch) {
          courtMapping[index] = courtMatch[1];
        }
      });

      console.log('Court mapping:', courtMapping);

      // Get the data row (only one row with all courts)
      const dataRow = rows[1];
      const courtCells = Array.from(dataRow.querySelectorAll('td'));

      console.log(`Found ${courtCells.length} court cells`);

      // Check each court cell for the target time slot
      courtCells.forEach((cell, index) => {
        const courtNumber = courtMapping[index];
        if (!courtNumber) return;

        // Find all timeslot divs inside this court cell
        const timeslots = cell.querySelectorAll('div.timeslot');
        console.log(`Court ${courtNumber}: ${timeslots.length} timeslots found`);

        // Look for the timeslot matching our target time
        timeslots.forEach(slot => {
          const timeSpan = slot.querySelector('.time-booked, .time');
          if (!timeSpan) return;

          const slotTimeText = timeSpan.textContent.trim();

          // Check if this timeslot matches our target time
          if (slotTimeText === targetTimeString) {
            console.log(`Court ${courtNumber}: Found matching timeslot "${slotTimeText}"`);

            // Check if slot is available
            const style = window.getComputedStyle(slot);
            const bgColor = style.backgroundColor;

            // Check for player names (indicates booked)
            const namesDiv = slot.querySelector('.names');
            const hasNames = namesDiv ? namesDiv.textContent.trim().length > 0 : false;

            // Check for "Instr:" text (indicates instructor booking)
            const hasInstructor = slot.textContent.includes('Instr:');

            // Parse RGB color
            const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            let isAvailableColor = false;
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1]);
              const g = parseInt(rgbMatch[2]);
              const b = parseInt(rgbMatch[3]);

              // Booked colors are typically: pink (high R, high B), blue (high B), or dark colors
              // Available colors are light/beige/yellowish with balanced RGB values
              const isPink = r > 200 && b > 150 && g < 150;
              const isBlue = b > 150 && r < 150 && g < 200;
              const isDark = r < 100 && g < 100 && b < 100;

              isAvailableColor = !isPink && !isBlue && !isDark;
            }

            console.log(`  bgColor: ${bgColor}`);
            console.log(`  hasNames: ${hasNames}`);
            console.log(`  hasInstructor: ${hasInstructor}`);
            console.log(`  isAvailableColor: ${isAvailableColor}`);

            // Available if: light background color AND no names AND no instructor
            if (isAvailableColor && !hasNames && !hasInstructor) {
              results.push(courtNumber);
              console.log(`  ✓ Court ${courtNumber} is AVAILABLE`);
            } else {
              console.log(`  ✗ Court ${courtNumber} is NOT available (booked)`);
            }
          }
        });
      });

      return results;
    }, time);

    console.log(`[PlaywrightBooking] Available courts at ${time} minutes: ${availableCourts.length > 0 ? availableCourts.join(', ') : 'None'}`);
    console.log('');

    return availableCourts;

  } catch (error) {
    console.error(`[PlaywrightBooking] Error checking availability: ${error.message}`);
    console.log('[PlaywrightBooking] Proceeding with all courts (availability check failed)');
    console.log('');
    // Return null to indicate check failed (caller should try all courts as fallback)
    return null;
  }
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
 * @param {string} [params.guestName] - Guest player name (default: "G")
 *
 * @returns {Promise<Object>} Result object
 */
async function executeBooking(params) {
  const { username, password, courts, date, time, guestName = 'G' } = params;

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

    console.log('[PlaywrightBooking] Entering credentials...');
    const usernameField = await page.$('input[type="text"]');
    if (!usernameField) throw new Error('Username field not found');

    await usernameField.click();
    await usernameField.type(username);

    const passwordField = await page.$('input[type="password"]');
    if (!passwordField) throw new Error('Password field not found');

    await passwordField.click();
    await passwordField.type(password);

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
    // PHASE 1.5: CHECK AVAILABILITY (FILTER UNAVAILABLE COURTS)
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 1.5: Checking court availability');

    const availableCourts = await getAvailableCourts(page, date, time);

    // Filter courts array to only include available courts
    let courtsToAttempt = courts;

    if (availableCourts === null) {
      // Availability check failed - use all courts as fallback
      console.log('[PlaywrightBooking] ⚠️  Availability check failed, will try all courts as fallback');
      courtsToAttempt = courts;
    } else if (availableCourts.length === 0) {
      // Availability check succeeded but found NO available courts - don't try any
      console.log('[PlaywrightBooking] ❌ Availability check shows ALL courts are unavailable!');
      console.log('[PlaywrightBooking] Not attempting any bookings - would waste time and fail anyway');
      await browser.close();
      return {
        success: false,
        error: `All courts are unavailable at this time. Booking not attempted.`,
        nonRetryable: true  // Don't retry - courts are simply booked by others
      };
    } else {
      // Availability check succeeded and found some available courts - filter the list
      courtsToAttempt = courts.filter(court => availableCourts.includes(court));

      const filteredOut = courts.filter(court => !availableCourts.includes(court));
      if (filteredOut.length > 0) {
        console.log(`[PlaywrightBooking] ⚠️  Filtered out unavailable courts: ${filteredOut.join(', ')}`);
      }

      if (courtsToAttempt.length === 0) {
        console.log('[PlaywrightBooking] ❌ None of the requested courts are available!');
        await browser.close();
        return {
          success: false,
          error: `None of the requested courts are available at this time.`,
          nonRetryable: true  // Don't retry - requested courts are booked by others
        };
      }

      console.log(`[PlaywrightBooking] ✅ Courts to attempt (available only): ${courtsToAttempt.join(', ')}`);
    }

    console.log('');

    // ===================================================================
    // PHASE 2: TRY EACH COURT WITH SAME SESSION
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 2: Trying courts sequentially with same session');
    console.log('');

    let finalResult = null;

    for (const court of courtsToAttempt) {
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
        error: `All courts unavailable. Tried: ${courtsToAttempt.join(', ')}`
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

/**
 * Execute booking with precision timing for 8:00 AM GameTime submission
 * Uses timeline-based execution with server time sync and measured network latency
 *
 * NEW OPTIMIZED Timeline (T = target 8:00:00.000 AM):
 * - T-30s: Login + verify session
 * - T-20s: Check court availability + filter courts
 * - T-15s: Navigate to first court's form + extract fields
 * - T-5s:  Measure network latency (3x HEAD requests)
 * - T-(RTT+200ms): Generate fresh reCAPTCHA token
 * - T-0:   Submit form (arrives at server exactly on time)
 * - If fail: Immediately try next available court
 *
 * @param {Object} params - Same as executeBooking params
 * @param {number} targetTimestamp - Exact timestamp to submit (ms since epoch)
 * @returns {Promise<Object>} Result object
 */
async function executeBookingPrecisionTimed(params, targetTimestamp) {
  const { username, password, courts, date, time, guestName = 'G' } = params;
  const { getCurrentSyncedTime, measureNetworkLatency } = require('./timeSync');
  const { formatInGameTimeZone } = require('./bookingWindowCalculator');

  console.log('');
  console.log('========================================');
  console.log('[PRECISION MODE] Starting Timeline Execution');
  console.log('========================================');
  console.log(`[Precision] Target submission: ${new Date(targetTimestamp).toISOString()}`);
  console.log(`[Precision] GameTime timezone: ${formatInGameTimeZone(targetTimestamp)}`);
  console.log(`[Precision] Local timezone:   ${new Date(targetTimestamp).toLocaleString()}`);
  console.log('========================================');
  console.log('');

  const T = targetTimestamp;

  let browser = null;
  let context = null;
  let page = null;

  try {
    // ===================================================================
    // T-30s: LOGIN + VERIFY SESSION
    // ===================================================================
    await waitUntilSynced(T - 30000);
    logPrecisionEvent('T-30s', 'Starting browser and logging in...');

    browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });

    context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('https://jct.gametime.net/auth', { waitUntil: 'networkidle', timeout: 30000 });

    const usernameField = await page.$('input[type="text"]');
    if (!usernameField) throw new Error('Username field not found');

    await usernameField.click();
    await usernameField.type(username);

    const passwordField = await page.$('input[type="password"]');
    if (!passwordField) throw new Error('Password field not found');

    await passwordField.click();
    await passwordField.type(password);

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

    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      throw new Error('Login failed - still on auth page');
    }

    logPrecisionEvent('T-27s', 'Login complete ✓ Session established');

    // ===================================================================
    // T-20s: CHECK COURT AVAILABILITY + FILTER COURTS
    // ===================================================================
    await waitUntilSynced(T - 20000);
    logPrecisionEvent('T-20s', 'Checking court availability...');

    const availableCourts = await getAvailableCourts(page, date, time);

    let courtsToAttempt = courts;

    if (availableCourts === null) {
      // Check failed - use all courts as fallback
      logPrecisionEvent('T-17s', '⚠️  Availability check failed, will try all courts');
      courtsToAttempt = courts;
    } else if (availableCourts.length === 0) {
      // No courts available
      logPrecisionEvent('T-17s', '❌ No courts available - aborting');
      await browser.close();
      return {
        success: false,
        error: 'All courts unavailable at this time',
        nonRetryable: true
      };
    } else {
      // Filter to available courts
      courtsToAttempt = courts.filter(court => availableCourts.includes(court));

      if (courtsToAttempt.length === 0) {
        logPrecisionEvent('T-17s', '❌ None of requested courts available - aborting');
        await browser.close();
        return {
          success: false,
          error: 'None of the requested courts are available',
          nonRetryable: true
        };
      }

      logPrecisionEvent('T-17s', `✓ Available courts: ${courtsToAttempt.join(', ')}`);
    }

    // ===================================================================
    // T-15s: NAVIGATE TO FIRST COURT'S FORM + EXTRACT FIELDS
    // ===================================================================
    await waitUntilSynced(T - 15000);
    logPrecisionEvent('T-15s', `Loading booking form for Court ${courtsToAttempt[0]}...`);

    const dateParts = date.split('-');
    const formattedDate = `${dateParts[0]}-${parseInt(dateParts[1])}-${parseInt(dateParts[2])}`;

    // Pre-extract fields once (reusable for all courts)
    let temp, userId, userName;

    for (const court of courtsToAttempt) {
      const gameTimeCourtId = COURT_ID_MAPPING[court];
      const bookingFormUrl = `https://jct.gametime.net/scheduling/index/book/sport/1/court/${gameTimeCourtId}/date/${formattedDate}/time/${time}`;

      await page.goto(bookingFormUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('input[name="temp"]', { timeout: 10000, state: 'attached' });
      await page.waitForSelector('input[name="players[1][user_id]"]', { timeout: 10000, state: 'attached' });

      // Extract form fields (same for all courts)
      temp = await page.$eval('input[name="temp"]', el => el.value).catch(() => '');
      userId = await page.$eval('input[name="players[1][user_id]"]', el => el.value).catch(() => '');
      userName = await page.$eval('input[name="players[1][name]"]', el => el.value).catch(() => '');

      if (!userId) {
        throw new Error('Missing user_id from form extraction');
      }

      // Wait for reCAPTCHA to be ready
      await page.waitForFunction(() => {
        return typeof window.grecaptcha !== 'undefined';
      }, { timeout: 10000 }).catch(() => {
        console.log('[Precision] WARNING: grecaptcha not loaded');
      });

      break; // Only need to load first court's form to extract fields
    }

    logPrecisionEvent('T-12s', '✓ Form loaded, fields extracted, reCAPTCHA ready');

    // ===================================================================
    // T-5s: MEASURE NETWORK LATENCY
    // ===================================================================
    await waitUntilSynced(T - 5000);
    logPrecisionEvent('T-5s', 'Measuring network latency...');

    const networkRTT = await measureNetworkLatency();

    // Calculate optimal token generation time
    // RTT + 200ms safety buffer ensures token is fresh but submission arrives on time
    const tokenGenerationDelay = networkRTT + 200;
    logPrecisionEvent('T-3s', `Network RTT: ${networkRTT}ms, will generate token at T-${tokenGenerationDelay}ms`);

    // ===================================================================
    // T-(RTT+200ms): GENERATE FRESH RECAPTCHA TOKEN
    // ===================================================================
    await waitUntilSynced(T - tokenGenerationDelay);
    logPrecisionEvent(`T-${tokenGenerationDelay}ms`, 'Generating fresh reCAPTCHA token...');

    const freshToken = await page.evaluate(async () => {
      const siteKey = '6LeW9NsUAAAAAC9KRF2JvdLtGMSds7hrBdxuOnLH';
      const token = await window.grecaptcha.execute(siteKey, {action: 'homepage'});
      return token;
    }).catch(err => {
      console.error('[Precision] Failed to execute grecaptcha:', err.message);
      return null;
    });

    if (!freshToken) {
      throw new Error('Failed to generate reCAPTCHA token');
    }

    // Check how much time we have left until T-0
    const nowAfterToken = getCurrentSyncedTime();
    const timeUntilSubmit = T - nowAfterToken;
    const isLate = timeUntilSubmit <= 0;

    // Get cookies NOW (needed for submission)
    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // ===================================================================
    // T-0: SUBMIT FORM (try all courts sequentially if needed)
    // ===================================================================
    // Wait until T-0 (or proceed immediately if already past T-0)
    await waitUntilSynced(T);

    // Log AFTER waiting (or immediately if late) to not waste time
    if (isLate) {
      console.log('');
      console.log('⚠️  WARNING: Token generation took longer than expected!');
      console.log(`⚠️  We were ${Math.abs(timeUntilSubmit)}ms LATE - submitted immediately`);
      console.log('');
    } else {
      logPrecisionEvent(`T-${timeUntilSubmit}ms`, `✓ Token ready! ${timeUntilSubmit}ms until submit...`);
    }

    let finalResult = null;

    for (const court of courtsToAttempt) {
      const gameTimeCourtId = COURT_ID_MAPPING[court];
      const bookingFormUrl = `https://jct.gametime.net/scheduling/index/book/sport/1/court/${gameTimeCourtId}/date/${formattedDate}/time/${time}`;

      logPrecisionEvent('T-0', `🚀 SUBMITTING for Court ${court}!`);
      const submitStart = getCurrentSyncedTime();

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

      const submitEnd = getCurrentSyncedTime();

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

      console.log('');
      console.log('========================================');
      console.log(`[PRECISION] Submission Result - Court ${court}`);
      console.log('========================================');
      console.log(`[Precision] HTTP Status:     ${submitResponse.status}`);
      console.log(`[Precision] Submitted at:    ${new Date(submitStart).toISOString()}`);
      console.log(`[Precision] GameTime TZ:     ${formatInGameTimeZone(submitStart)}`);
      console.log(`[Precision] Target was:      ${new Date(T).toISOString()}`);
      console.log(`[Precision] Timing accuracy: ${submitStart - T}ms`);
      console.log(`[Precision] HTTP took:       ${submitEnd - submitStart}ms`);
      console.log(`[Precision] Result:          ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (success) {
        console.log(`[Precision] Booking ID:      ${bookingId}`);
      }
      console.log('========================================');
      console.log('');

      if (success) {
        // SUCCESS! Return result
        finalResult = {
          success: true,
          bookingId: bookingId,
          courtBooked: court,
          actualCourtId: gameTimeCourtId,
          confirmationUrl: finalUrl,
          timeGap: submitEnd - submitStart
        };
        break; // Stop trying other courts
      } else {
        // Failed, try next court immediately (no delay)
        console.log(`[Precision] Court ${court} failed, trying next court immediately...`);
      }
    }

    await browser.close();

    if (finalResult && finalResult.success) {
      return finalResult;
    } else {
      return {
        success: false,
        error: `All courts unavailable. Tried: ${courtsToAttempt.join(', ')}`,
        courtsTried: courtsToAttempt
      };
    }

  } catch (error) {
    console.error(`[Precision] ERROR: ${error.message}`);
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

/**
 * Wait until a specific synced timestamp
 *
 * @param {number} targetTimestamp - Target timestamp in ms since epoch
 */
async function waitUntilSynced(targetTimestamp) {
  const { getCurrentSyncedTime } = require('./timeSync');

  const now = getCurrentSyncedTime();
  const delayMs = targetTimestamp - now;

  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

/**
 * Log precision timing events with formatted timestamps
 *
 * @param {string} timing - Timing label (e.g., "T-10s")
 * @param {string} message - Log message
 */
function logPrecisionEvent(timing, message) {
  const { getCurrentSyncedTime } = require('./timeSync');
  const { formatInGameTimeZone } = require('./bookingWindowCalculator');

  const now = getCurrentSyncedTime();
  console.log(`[Precision] ${timing}: ${message}`);
  console.log(`           (At: ${formatInGameTimeZone(now)})`);
}

module.exports = { executeBooking, executeBookingPrecisionTimed };
