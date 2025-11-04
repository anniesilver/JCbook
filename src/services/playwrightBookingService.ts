/**
 * Playwright Booking Service
 *
 * Implements the VERIFIED working solution for GameTime court bookings.
 * This service automates booking using Playwright + fresh reCAPTCHA tokens.
 *
 * Based on successful tests: test-G-auto-fresh-token.js and test-H-verify-930pm.js
 * Success rate: 100% (2/2 successful bookings: IDs 278886, 278887)
 *
 * Key Success Factors:
 * 1. Generate FRESH token via grecaptcha.execute()
 * 2. Submit via HTTP POST within 2-3 seconds of token generation
 * 3. Close browser BEFORE HTTP POST to avoid detection
 * 4. Use duplicate duration fields in form submission
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';

/**
 * Booking parameters for automation
 */
export interface BookingParams {
  username: string;
  password: string;
  court: string;      // Court ID like "52" (Court 3) or "55" (Court 6)
  date: string;       // YYYY-MM-DD format
  time: string;       // HH:mm format like "09:00" or "21:30"
  guestName?: string;
}

/**
 * Booking result with success status and details
 */
export interface BookingResult {
  success: boolean;
  bookingId?: string;
  error?: string;
  url?: string;
}

/**
 * Convert time string "HH:mm" to minutes from midnight
 * @example "09:00" → "540", "21:30" → "1290"
 */
function convertTimeToMinutes(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:mm`);
  }
  return (hours * 60 + minutes).toString();
}

/**
 * Execute a booking on GameTime using verified Playwright automation
 *
 * Process:
 * 1. Launch headless browser
 * 2. Login to GameTime
 * 3. Capture session cookies
 * 4. Navigate to booking form
 * 5. Wait for reCAPTCHA to load
 * 6. Generate FRESH token via grecaptcha.execute()
 * 7. Extract hidden form fields
 * 8. Close browser
 * 9. Submit via HTTP POST with fresh token
 * 10. Parse response and return result
 *
 * @param params Booking parameters
 * @returns BookingResult with success status and booking ID if successful
 */
export async function executeBooking(params: BookingParams): Promise<BookingResult> {
  let browser: Browser | null = null;

  try {
    console.log('[PlaywrightBooking] Starting booking automation');
    console.log(`[PlaywrightBooking] Court: ${params.court}, Date: ${params.date}, Time: ${params.time}`);

    // Step 1: Launch headless browser
    browser = await chromium.launch({
      headless: true,  // Use headless mode in production
      args: ['--disable-blink-features=AutomationControlled']
    });

    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    // Step 2: Login to GameTime
    console.log('[PlaywrightBooking] Logging in to GameTime...');
    await login(page, params.username, params.password);
    console.log('[PlaywrightBooking] Login successful');

    // Step 3: Capture cookies
    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`[PlaywrightBooking] Captured ${cookies.length} cookies`);

    // Step 4: Load booking form
    const timeInMinutes = convertTimeToMinutes(params.time);
    const bookingFormUrl = `https://jct.gametime.net/scheduling/index/book/sport/1/court/${params.court}/date/${params.date}/time/${timeInMinutes}`;

    console.log('[PlaywrightBooking] Loading booking form...');
    await page.goto(bookingFormUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for hidden form fields (use state: 'attached' for hidden inputs)
    await page.waitForSelector('input[name="temp"]', { timeout: 10000, state: 'attached' });
    await page.waitForSelector('input[name="players[1][user_id]"]', { timeout: 10000, state: 'attached' });

    // Step 5: Wait for reCAPTCHA to load
    console.log('[PlaywrightBooking] Waiting for reCAPTCHA...');
    await page.waitForFunction(() => {
      return typeof (window as any).grecaptcha !== 'undefined';
    }, { timeout: 10000 });

    // Extra safety margin
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 6: Generate FRESH token - THIS IS THE KEY TO SUCCESS!
    console.log('[PlaywrightBooking] Generating fresh reCAPTCHA token...');
    const freshToken = await page.evaluate(async () => {
      const siteKey = '6LeW9NsUAAAAAC9KRF2JvdLtGMSds7hrBdxuOnLH';

      // Call grecaptcha.execute() to get fresh token
      const token = await (window as any).grecaptcha.execute(siteKey, {
        action: 'homepage'  // MUST use 'homepage', not 'submit'
      });

      return token;
    });

    if (!freshToken) {
      throw new Error('Failed to generate fresh reCAPTCHA token');
    }

    console.log(`[PlaywrightBooking] Fresh token generated: ${freshToken.substring(0, 50)}...`);

    // Step 7: Extract form fields
    const temp = await page.$eval('input[name="temp"]', (el: any) => el.value).catch(() => '');
    const userId = await page.$eval('input[name="players[1][user_id]"]', (el: any) => el.value).catch(() => '');
    const userName = await page.$eval('input[name="players[1][name]"]', (el: any) => el.value).catch(() => '');

    console.log('[PlaywrightBooking] Extracted form fields');
    console.log(`[PlaywrightBooking] temp: ${temp}, userId: ${userId}, userName: ${userName}`);

    const tokenExtractedTime = Date.now();

    // Step 8: Close browser BEFORE HTTP submission
    await browser.close();
    browser = null;
    console.log('[PlaywrightBooking] Browser closed - switching to HTTP POST');

    // Small delay to ensure clean browser shutdown
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 9: Submit via HTTP POST with fresh token
    const result = await submitBookingViaHTTP({
      cookieHeader,
      freshToken,
      temp,
      userId,
      userName,
      court: params.court,
      date: params.date,
      time: timeInMinutes,
      guestName: params.guestName || 'Guest Player',
      bookingFormUrl,
      tokenExtractedTime
    });

    return result;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PlaywrightBooking] Error:', message);

    // Ensure browser is closed on error
    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      error: message
    };
  }
}

/**
 * Login to GameTime using automated form submission
 */
async function login(page: Page, username: string, password: string): Promise<void> {
  await page.goto('https://jct.gametime.net/auth', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for login form to load
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });

  // Enter username
  const usernameField = await page.$('input[type="text"]');
  if (!usernameField) {
    throw new Error('Username field not found');
  }
  await usernameField.type(username, { delay: 100 });

  // Enter password
  const passwordField = await page.$('input[type="password"]');
  if (!passwordField) {
    throw new Error('Password field not found');
  }
  await passwordField.type(password, { delay: 100 });

  // Click login button
  const loginButton = await page.$('input[type="submit"]') ||
                       await page.$('button[type="submit"]');

  if (!loginButton) {
    throw new Error('Login button not found');
  }

  await loginButton.click();

  // Wait for navigation (may timeout if redirect is instant, that's OK)
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
}

/**
 * Submit booking via HTTP POST with fresh reCAPTCHA token
 *
 * CRITICAL: Must include BOTH duration fields (duplicate keys)!
 */
async function submitBookingViaHTTP(params: {
  cookieHeader: string;
  freshToken: string;
  temp: string;
  userId: string;
  userName: string;
  court: string;
  date: string;
  time: string;
  guestName: string;
  bookingFormUrl: string;
  tokenExtractedTime: number;
}): Promise<BookingResult> {

  // Build form data with duplicate duration fields (critical!)
  const formData = new URLSearchParams();
  formData.append('edit', '');
  formData.append('is_register', '');
  formData.append('rt_key', '');
  formData.append('temp', params.temp);
  formData.append('upd', 'true');
  formData.append('duration', '30');                      // First duration
  formData.append('g-recaptcha-response', params.freshToken);  // FRESH TOKEN!
  formData.append('court', params.court);
  formData.append('date', params.date);
  formData.append('time', params.time);
  formData.append('sportSel', '1');
  formData.append('duration', '60');                      // Second duration (duplicate key!)
  formData.append('rtype', '13');
  formData.append('invite_for', 'Singles');
  formData.append('players[1][user_id]', params.userId);
  formData.append('players[1][name]', params.userName);
  formData.append('players[2][user_id]', '');
  formData.append('players[2][name]', params.guestName);
  formData.append('players[2][guest]', 'on');
  formData.append('players[2][guestof]', '1');
  formData.append('payee_hide', params.userId);
  formData.append('bookingWaiverPolicy', 'true');

  console.log('[PlaywrightBooking] Submitting booking via HTTP POST...');

  const submitResponse = await fetch('https://jct.gametime.net/scheduling/index/save?errs=', {
    method: 'POST',
    headers: {
      'Cookie': params.cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://jct.gametime.net',
      'Referer': params.bookingFormUrl,
      'Upgrade-Insecure-Requests': '1'
    },
    body: formData.toString(),
    redirect: 'manual'  // Don't auto-follow redirects
  });

  const submissionTime = Date.now();
  const timeGap = submissionTime - params.tokenExtractedTime;

  console.log(`[PlaywrightBooking] Token submitted in ${timeGap}ms`);
  console.log(`[PlaywrightBooking] Response status: ${submitResponse.status}`);

  // Check for redirect (302 = successful submission)
  if (submitResponse.status === 302) {
    const location = submitResponse.headers.get('location');
    const finalUrl = location?.startsWith('http') ? location : `https://jct.gametime.net${location}`;

    console.log(`[PlaywrightBooking] Redirect to: ${finalUrl}`);

    if (finalUrl && finalUrl.includes('/confirmation')) {
      // Success! Extract booking ID from URL
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

  // Unexpected response
  console.log(`[PlaywrightBooking] FAILED - Unexpected response: ${submitResponse.status}`);
  return {
    success: false,
    error: `Unexpected response: ${submitResponse.status}`
  };
}
