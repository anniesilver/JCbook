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
 * Check which courts are available at the requested date/time
 * Navigates to the Tennis schedule page and parses the availability table
 *
 * @param {Page} page - Playwright page object (already logged in)
 * @param {string} date - Booking date in YYYY-MM-DD format
 * @param {string} time - Time in minutes from midnight (e.g., "540" = 9:00 AM)
 * @returns {Promise<string[]>} Array of available court numbers (e.g., ["1", "3", "5"])
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
      const courtHeaders = Array.from(headerRow.querySelectorAll('th, td')).slice(1);
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
      const courtCells = Array.from(dataRow.querySelectorAll('td')).slice(1); // Skip first cell

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
            const hasNames = namesDiv && namesDiv.textContent.trim().length > 0;

            // Check for "Instr:" text (indicates instructor booking)
            const hasInstructor = slot.textContent.includes('Instr:');

            // Check background color (yellowish = available, others = booked)
            const isYellowish = bgColor.includes('173, 207, 83') || bgColor.includes('rgba(173, 207, 83');

            console.log(`  bgColor: ${bgColor}`);
            console.log(`  hasNames: ${hasNames}`);
            console.log(`  hasInstructor: ${hasInstructor}`);
            console.log(`  isYellowish: ${isYellowish}`);

            // Available if: yellowish background AND no names AND no instructor
            if (isYellowish && !hasNames && !hasInstructor) {
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

    // DEBUG: Take a screenshot for verification
    await page.screenshot({ path: `backend-server/schedule-debug-${Date.now()}.png`, fullPage: true });
    console.log('[PlaywrightBooking] Screenshot saved for verification');

    return availableCourts;

  } catch (error) {
    console.error(`[PlaywrightBooking] Error checking availability: ${error.message}`);
    console.log('[PlaywrightBooking] Proceeding with all courts (availability check failed)');
    console.log('');
    // If availability check fails, return empty array (caller will use all courts)
    return [];
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
    // PHASE 1.5: CHECK AVAILABILITY (FILTER UNAVAILABLE COURTS)
    // ===================================================================
    console.log('[PlaywrightBooking] Phase 1.5: Checking court availability');

    const availableCourts = await getAvailableCourts(page, date, time);

    // Filter courts array to only include available courts
    let courtsToAttempt = courts;

    if (availableCourts.length > 0) {
      // Filter courts to only include those that are available
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
          error: `None of the requested courts (${courts.join(', ')}) are available at ${time} minutes`
        };
      }

      console.log(`[PlaywrightBooking] ✅ Courts to attempt (available only): ${courtsToAttempt.join(', ')}`);
    } else {
      console.log('[PlaywrightBooking] ⚠️  Availability check returned no results, will try all courts');
    }

    console.log('');

    // DEBUG MODE: Exit after availability check
    console.log('[PlaywrightBooking] 🛑 DEBUG MODE: Stopping after availability check');
    console.log('[PlaywrightBooking] Review the screenshot and browser console output above');
    await browser.close();
    return {
      success: false,
      error: 'DEBUG MODE: Stopped after availability check',
      debugInfo: {
        availableCourts: availableCourts,
        courtsToAttempt: courtsToAttempt,
        originalCourts: courts
      }
    };

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

module.exports = { executeBooking };
