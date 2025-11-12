/**
 * TEST: CAPTURE MANUAL FORM SUBMISSION
 *
 * This test:
 * 1. Automates login
 * 2. Loads the booking form (you specify court/date/time)
 * 3. PAUSES and waits for you to manually fill and submit the form
 * 4. Captures the actual HTTP POST payload when you click submit
 * 5. Logs the payload to a file for analysis
 *
 * Usage:
 * 1. Edit the bookingFormUrl below to your desired court/date/time
 * 2. Run: node test-capture-manual-submit.js
 * 3. Browser will open and load the form
 * 4. Manually fill out the form (select doubles/singles, duration, players)
 * 5. Click submit
 * 6. The payload will be captured and saved to logs/manual-payload-[timestamp].txt
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('\n' + '█'.repeat(80));
  console.log('TEST: CAPTURE MANUAL FORM SUBMISSION');
  console.log('█'.repeat(80) + '\n');

  let browser;
  let context;
  let page;
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

  // ===================================================================
  // CONFIGURATION - EDIT THESE VALUES
  // ===================================================================

  // Booking form URL - change court/date/time as needed
  // Format: https://jct.gametime.net/scheduling/index/book/sport/1/court/[COURT_ID]/date/[YYYY-MM-DD]/time/[MINUTES]
  const bookingFormUrl = 'https://jct.gametime.net/scheduling/index/book/sport/1/court/55/date/2025-11-16/time/1260';

  console.log('📝 Configuration:');
  console.log(`   Form URL: ${bookingFormUrl}`);
  console.log('');

  try {
    // ===================================================================
    // STEP 1: AUTOMATED LOGIN
    // ===================================================================
    console.log('1️⃣  STEP 1: Automated Login\n');

    browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });

    context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('   → Loading login page...\n');
    await page.goto('https://jct.gametime.net/auth', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('   → Entering credentials...\n');
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    const usernameField = await page.$('input[type="text"]');
    await usernameField.click();
    await usernameField.type('annieyang');

    const passwordField = await page.$('input[type="password"]');
    await passwordField.click();
    await passwordField.type('jc333666');

    console.log('   → Clicking login button...\n');
    const loginButton = await page.$('input[type="submit"]') ||
                        await page.$('button[type="submit"]');
    await loginButton.click();

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {}

    console.log('   ✅ Login completed\n');
    await new Promise(r => setTimeout(r, 2000));

    // ===================================================================
    // STEP 2: LOAD BOOKING FORM
    // ===================================================================
    console.log('2️⃣  STEP 2: Loading Booking Form\n');

    console.log('   → Navigating to booking form...\n');
    await page.goto(bookingFormUrl, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('   ✅ Booking form loaded\n');
    console.log('');

    // ===================================================================
    // STEP 3: SETUP REQUEST INTERCEPTION
    // ===================================================================
    console.log('3️⃣  STEP 3: Setting up payload capture\n');

    let capturedPayload = null;
    let capturedUrl = null;

    // Intercept all requests to capture form submission
    page.on('request', request => {
      // Look for POST request to /scheduling/index/save
      if (request.method() === 'POST' && request.url().includes('/scheduling/index/save')) {
        capturedUrl = request.url();
        capturedPayload = request.postData();

        console.log('');
        console.log('🎯 CAPTURED FORM SUBMISSION!');
        console.log('   URL: ' + capturedUrl);
        console.log('   Payload length: ' + (capturedPayload ? capturedPayload.length : 0) + ' bytes');
        console.log('');
      }
    });

    console.log('   ✅ Payload capture ready\n');
    console.log('');

    // ===================================================================
    // STEP 4: MANUAL INTERACTION - PAUSE HERE
    // ===================================================================
    console.log('═'.repeat(80));
    console.log('4️⃣  STEP 4: MANUAL INTERACTION');
    console.log('═'.repeat(80));
    console.log('');
    console.log('🛑 PAUSING FOR MANUAL FORM SUBMISSION');
    console.log('');
    console.log('Instructions:');
    console.log('   1. The browser window is now open with the booking form');
    console.log('   2. Fill out the form as you normally would:');
    console.log('      - Select booking type (Singles/Doubles)');
    console.log('      - Set duration');
    console.log('      - Fill in player names');
    console.log('   3. Click the SUBMIT button');
    console.log('   4. Wait for the form to process');
    console.log('   5. The payload will be automatically captured and saved');
    console.log('');
    console.log('⏳ Waiting for form submission... (will wait up to 5 minutes)');
    console.log('');

    // Wait for form submission (max 5 minutes)
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    while (!capturedPayload && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(r => setTimeout(r, 1000)); // Check every second
    }

    if (!capturedPayload) {
      console.log('');
      console.log('⏰ Timeout: No form submission detected within 5 minutes');
      console.log('');
      await browser.close();
      process.exit(0);
    }

    // ===================================================================
    // STEP 5: SAVE CAPTURED PAYLOAD
    // ===================================================================
    console.log('5️⃣  STEP 5: Saving Captured Payload\n');

    const timestamp = Date.now();
    const payloadFile = path.join(logsDir, `manual-payload-${timestamp}.txt`);

    // Parse and format the payload for readability
    const formattedPayload = capturedPayload
      .split('&')
      .map(param => decodeURIComponent(param))
      .join('\n');

    const payloadContent = `Captured at: ${new Date().toISOString()}\nURL: ${capturedUrl}\n\n=== RAW PAYLOAD ===\n${capturedPayload}\n\n=== FORMATTED PAYLOAD ===\n${formattedPayload}\n`;

    fs.writeFileSync(payloadFile, payloadContent);

    console.log('   ✅ Payload saved to: ' + payloadFile);
    console.log('');

    // ===================================================================
    // STEP 6: WAIT FOR RESPONSE AND CAPTURE RESULT
    // ===================================================================
    console.log('═'.repeat(80));
    console.log('6️⃣  WAITING FOR RESPONSE');
    console.log('═'.repeat(80));
    console.log('');
    console.log('⏳ Waiting for page to process submission...');
    console.log('');

    // Wait for navigation or page update (30 seconds max)
    await new Promise(r => setTimeout(r, 3000));

    const currentUrl = page.url();
    console.log('   Current URL: ' + currentUrl);
    console.log('');

    // Check for success or error
    if (currentUrl.includes('/confirmation')) {
      console.log('   ✅ SUCCESS: Redirected to confirmation page!');
    } else if (currentUrl.includes('/bookerror')) {
      console.log('   ❌ ERROR: Redirected to booking error page!');
    } else {
      console.log('   ⚠️  Still on form page - checking for error messages...');

      // Try to capture any error messages on the page
      const errorMessages = await page.evaluate(() => {
        const errors = [];

        // Look for common error message selectors
        const errorSelectors = [
          '.error',
          '.alert-danger',
          '.alert-error',
          '[role="alert"]',
          '.message.error',
          '#error-message'
        ];

        errorSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.textContent.trim()) {
              errors.push(el.textContent.trim());
            }
          });
        });

        return errors;
      });

      if (errorMessages.length > 0) {
        console.log('');
        console.log('   📋 Error messages found on page:');
        errorMessages.forEach((msg, idx) => {
          console.log(`   ${idx + 1}. ${msg}`);
        });
      }
    }

    console.log('');
    console.log('═'.repeat(80));
    console.log('7️⃣  PAYLOAD ANALYSIS');
    console.log('═'.repeat(80));
    console.log('');

    // Parse key fields
    const params = new URLSearchParams(capturedPayload);

    console.log('Key Fields:');
    console.log('   duration (1st): ' + params.getAll('duration')[0]);
    console.log('   duration (2nd): ' + params.getAll('duration')[1]);
    console.log('   rtype: ' + params.get('rtype'));
    console.log('   invite_for: ' + params.get('invite_for'));
    console.log('   court: ' + params.get('court'));
    console.log('   date: ' + params.get('date'));
    console.log('   time: ' + params.get('time'));
    console.log('');

    // Count players
    let playerCount = 0;
    for (let i = 1; i <= 10; i++) {
      if (params.has(`players[${i}][name]`)) {
        playerCount = i;
        console.log(`   players[${i}][name]: ` + params.get(`players[${i}][name]`));
      }
    }
    console.log('');
    console.log('   Total players: ' + playerCount);
    console.log('');

    console.log('═'.repeat(80));
    console.log('8️⃣  BROWSER CONTROL');
    console.log('═'.repeat(80));
    console.log('');
    console.log('🛑 BROWSER WILL STAY OPEN');
    console.log('');
    console.log('   The browser window will remain open so you can:');
    console.log('   1. Read any error messages');
    console.log('   2. Inspect the page state');
    console.log('   3. Try again if needed');
    console.log('');
    console.log('   Press Ctrl+C in terminal to close browser and exit');
    console.log('');
    console.log('═'.repeat(80));
    console.log('');
    console.log('📄 Payload saved to: ' + payloadFile);
    console.log('');

    // Keep browser open - wait for user to manually close or Ctrl+C
    await new Promise(() => {}); // Never resolves - keeps script running

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    console.error(error.stack);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runTest();
