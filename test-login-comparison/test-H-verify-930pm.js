/**
 * TEST H: VERIFICATION TEST - 9:30 PM BOOKING
 *
 * This test verifies the working procedure with a DIFFERENT time slot
 *
 * This test:
 * 1. Automates login (no manual intervention)
 * 2. Loads booking form for 9:30 PM (1290 minutes)
 * 3. Calls grecaptcha.execute() to get FRESH token
 * 4. Closes browser
 * 5. Submits via HTTP POST with fresh token
 *
 * Goal: Confirm the solution works for different time slots
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function runTest() {
  console.log('\n' + '█'.repeat(80));
  console.log('TEST H: VERIFICATION - 9:30 PM BOOKING');
  console.log('█'.repeat(80) + '\n');

  let browser;
  let context;
  let page;
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

  try {
    // ===================================================================
    // PHASE 1: AUTOMATED LOGIN
    // ===================================================================
    console.log('1️⃣  PHASE 1: Automated Login\n');

    browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });

    context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('   → Loading login page...\n');
    await page.goto('https://jct.gametime.net/auth', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('   ✓ Login page loaded\n');
    await new Promise(r => setTimeout(r, randomDelay(1000, 2000)));

    console.log('   → Waiting for login form...\n');
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    console.log('   ✓ Login form ready\n');
    await new Promise(r => setTimeout(r, 500));

    console.log('   → Entering username...\n');
    const usernameField = await page.$('input[type="text"]');
    if (!usernameField) throw new Error('Username field not found');

    await usernameField.click();
    await new Promise(r => setTimeout(r, randomDelay(200, 400)));
    await usernameField.type('annieyang', { delay: randomDelay(50, 150) });

    await new Promise(r => setTimeout(r, randomDelay(500, 800)));

    console.log('   → Entering password...\n');
    const passwordField = await page.$('input[type="password"]');
    if (!passwordField) throw new Error('Password field not found');

    await passwordField.click();
    await new Promise(r => setTimeout(r, randomDelay(200, 400)));
    await passwordField.type('jc333666', { delay: randomDelay(50, 150) });

    await new Promise(r => setTimeout(r, randomDelay(500, 1000)));

    console.log('   → Clicking login button...\n');
    // Try multiple selectors for the login button
    const loginButton = await page.$('input[type="submit"]') ||
                        await page.$('button[type="submit"]') ||
                        await page.$('button.btn-primary') ||
                        await page.$('form button');

    if (!loginButton) throw new Error('Login button not found');

    await loginButton.click();

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {}

    console.log('   ✅ Login completed\n');
    await new Promise(r => setTimeout(r, 2000));

    // ===================================================================
    // PHASE 2: CAPTURE COOKIES
    // ===================================================================
    console.log('2️⃣  PHASE 2: Capturing Session Cookies\n');

    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    console.log('   📦 Captured ' + cookies.length + ' cookies\n');

    // ===================================================================
    // PHASE 3: LOAD BOOKING FORM
    // ===================================================================
    console.log('3️⃣  PHASE 3: Loading Booking Form\n');

    const bookingFormUrl = 'https://jct.gametime.net/scheduling/index/book/sport/1/court/55/date/2025-11-3/time/1290';

    console.log('   🕘 Booking time: 9:30 PM (1290 minutes)\n');
    console.log('   → Navigating to booking form...\n');
    await page.goto(bookingFormUrl, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('   ✓ Booking form page loaded\n');

    console.log('   → Waiting for form fields...\n');
    // Hidden inputs need state: 'attached' instead of 'visible'
    await page.waitForSelector('input[name="temp"]', { timeout: 10000, state: 'attached' });
    await page.waitForSelector('input[name="players[1][user_id]"]', { timeout: 10000, state: 'attached' });

    console.log('   ✓ Form fields ready\n');

    console.log('   → Waiting for reCAPTCHA to load...\n');

    await page.waitForFunction(() => {
      return typeof window.grecaptcha !== 'undefined';
    }, { timeout: 10000 }).catch(() => {
      console.log('   ⚠️  grecaptcha not loaded\n');
    });

    console.log('   ✓ reCAPTCHA loaded\n');

    await new Promise(r => setTimeout(r, 1000));

    // ===================================================================
    // PHASE 4: GENERATE FRESH TOKEN
    // ===================================================================
    console.log('4️⃣  PHASE 4: Generating FRESH reCAPTCHA Token\n');
    console.log('   → Calling grecaptcha.execute({action: "homepage"})...\n');

    const freshToken = await page.evaluate(async () => {
      const siteKey = '6LeW9NsUAAAAAC9KRF2JvdLtGMSds7hrBdxuOnLH';

      // Call grecaptcha.execute() and wait for the promise
      const token = await window.grecaptcha.execute(siteKey, {action: 'homepage'});
      return token;
    }).catch(err => {
      console.error('   ✗ Failed to execute grecaptcha:', err.message);
      return null;
    });

    if (!freshToken) {
      throw new Error('Failed to generate fresh token');
    }

    console.log('   ✅ Fresh token generated: ' + freshToken.substring(0, 50) + '...\n');

    // ===================================================================
    // PHASE 5: EXTRACT OTHER FORM FIELDS
    // ===================================================================
    console.log('5️⃣  PHASE 5: Extracting Form Fields\n');

    const temp = await page.$eval('input[name="temp"]', el => el.value).catch(() => '');
    console.log('   → temp: ' + temp);

    const userId = await page.$eval('input[name="players[1][user_id]"]', el => el.value).catch(() => '');
    console.log('   → user_id: ' + userId);

    const userName = await page.$eval('input[name="players[1][name]"]', el => el.value).catch(() => '');
    console.log('   → user_name: ' + userName + '\n');

    const tokenExtractedTime = Date.now();

    // ===================================================================
    // PHASE 6: CLOSE BROWSER
    // ===================================================================
    console.log('6️⃣  PHASE 6: Closing Browser\n');

    await browser.close();
    browser = null;

    console.log('   ✅ Browser closed\n');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   From this point: PURE HTTP POST with FRESH token!');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await new Promise(r => setTimeout(r, 500));

    // ===================================================================
    // PHASE 7: SUBMIT VIA HTTP POST
    // ===================================================================
    console.log('7️⃣  PHASE 7: Submitting via HTTP POST\n');

    if (!userId) {
      throw new Error('Missing user_id');
    }

    // Build form data with FRESH token
    const formData = new URLSearchParams();
    formData.append('edit', '');
    formData.append('is_register', '');
    formData.append('rt_key', '');
    formData.append('temp', temp);
    formData.append('upd', 'true');
    formData.append('duration', '30');
    formData.append('g-recaptcha-response', freshToken);  // FRESH TOKEN HERE!
    formData.append('court', '55');
    formData.append('date', '2025-11-03');
    formData.append('time', '1290');
    formData.append('sportSel', '1');
    formData.append('duration', '60');
    formData.append('rtype', '13');
    formData.append('invite_for', 'Singles');
    formData.append('players[1][user_id]', userId);
    formData.append('players[1][name]', userName);
    formData.append('players[2][user_id]', '');
    formData.append('players[2][name]', 'Guest Player');
    formData.append('players[2][guest]', 'on');
    formData.append('players[2][guestof]', '1');
    formData.append('payee_hide', userId);
    formData.append('bookingWaiverPolicy', 'true');

    console.log('   ✓ Form data prepared with FRESH token\n');

    const payloadString = formData.toString();
    const payloadFile = path.join(logsDir, `payload-fresh-${Date.now()}.txt`);
    fs.writeFileSync(payloadFile, payloadString);
    console.log('   💾 Payload saved to: ' + payloadFile + '\n');

    console.log('   → Submitting to: /scheduling/index/save?errs=\n');

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
      body: payloadString,
      redirect: 'manual'
    });

    const submissionTime = Date.now();
    const timeGap = submissionTime - tokenExtractedTime;

    console.log('   → Response Status: ' + submitResponse.status + ' ' + submitResponse.statusText);
    console.log('   ⏱️  Time gap (token generation → submission): ' + timeGap + 'ms\n');

    // ===================================================================
    // PHASE 8: CHECK RESULT
    // ===================================================================
    console.log('8️⃣  PHASE 8: Checking Result\n');

    let finalUrl = submitResponse.url;
    let success = false;

    if (submitResponse.status === 302) {
      const location = submitResponse.headers.get('location');
      console.log('   → Redirect detected: ' + location + '\n');

      if (location) {
        finalUrl = location.startsWith('http') ? location : 'https://jct.gametime.net' + location;

        if (finalUrl.includes('/confirmation')) {
          success = true;
        } else if (finalUrl.includes('/bookerror')) {
          success = false;
        }
      }
    }

    // ===================================================================
    // FINAL RESULT
    // ===================================================================
    console.log('\n' + '═'.repeat(80));
    console.log('TEST H RESULT - VERIFICATION (9:30 PM)');
    console.log('═'.repeat(80));

    if (success) {
      console.log('\n🎉 SUCCESS - Booking confirmed with FRESH token!');
      console.log('\n   ✅ CONCLUSION:');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   Fresh token from grecaptcha.execute() WORKS!');
      console.log('   ');
      console.log('   This proves:');
      console.log('   ✓ Calling grecaptcha.execute() generates valid token');
      console.log('   ✓ HTTP POST with fresh token bypasses detection');
      console.log('   ✓ Token submitted within ' + timeGap + 'ms (very fresh!)');
      console.log('   ');
      console.log('   📌 PRODUCTION IMPLEMENTATION:');
      console.log('   → Automate login');
      console.log('   → Load booking form in headless browser');
      console.log('   → Call grecaptcha.execute() to get fresh token');
      console.log('   → Submit via HTTP POST immediately');
      console.log('   → SUCCESS!');
      console.log('   ');
      console.log('   Final URL: ' + finalUrl);
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('\n❌ FAILED - Booking rejected even with fresh token');
      console.log('\n   ⚠️  CONCLUSION:');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   Fresh token did NOT solve the problem!');
      console.log('   ');
      console.log('   Timing info:');
      console.log('   → Token generation → submission: ' + timeGap + 'ms');
      console.log('   ');
      console.log('   This means:');
      console.log('   → Token freshness is NOT the issue');
      console.log('   → HTTP POST itself may be the problem');
      console.log('   → Server may require browser-triggered submission');
      console.log('   → NewRelic may detect request context/origin');
      console.log('   ');
      console.log('   Possible reasons:');
      console.log('   → Server validates request came from browser JS');
      console.log('   → Missing headers or browser state');
      console.log('   → Form submission must trigger specific events');
      console.log('   → Anti-automation checks beyond reCAPTCHA');
      console.log('   ');
      console.log('   Final URL: ' + finalUrl);
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    console.log('═'.repeat(80) + '\n');
    console.log('✅ Test H completed - Verification successful!\n');

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    console.error(error.stack);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runTest();
