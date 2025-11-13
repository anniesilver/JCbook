/**
 * TEST: COMPLETELY MANUAL - ZERO AUTOMATION
 *
 * This script:
 * 1. Opens a browser
 * 2. Goes to GameTime homepage
 * 3. DOES NOTHING ELSE
 * 4. Captures any form submissions you make
 * 5. Stays open until you close it
 *
 * You do EVERYTHING manually:
 * - Login
 * - Navigate to booking form
 * - Fill out form
 * - Submit
 *
 * Usage: node test-completely-manual.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('\n' + '█'.repeat(80));
  console.log('TEST: COMPLETELY MANUAL - ZERO AUTOMATION');
  console.log('█'.repeat(80) + '\n');

  let browser;
  let context;
  let page;
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

  try {
    console.log('1️⃣  Opening browser...\n');

    browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });

    context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('2️⃣  Loading GameTime homepage...\n');
    await page.goto('https://jct.gametime.net', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('   ✅ Browser ready\n');
    console.log('');

    // ===================================================================
    // SETUP REQUEST INTERCEPTION TO CAPTURE FORM SUBMISSIONS
    // ===================================================================
    console.log('3️⃣  Setting up payload capture...\n');

    let submissionCount = 0;

    page.on('request', request => {
      // Capture any POST requests (form submissions)
      if (request.method() === 'POST') {
        submissionCount++;
        const timestamp = Date.now();
        const url = request.url();
        const payload = request.postData();

        console.log('');
        console.log('🎯 CAPTURED POST REQUEST #' + submissionCount);
        console.log('   URL: ' + url);
        console.log('   Time: ' + new Date().toISOString());
        console.log('');

        if (payload && url.includes('/scheduling/index/save')) {
          // This looks like a booking form submission
          const payloadFile = path.join(logsDir, `manual-complete-${timestamp}.txt`);

          const formattedPayload = payload
            .split('&')
            .map(param => decodeURIComponent(param))
            .join('\n');

          const content = `Captured at: ${new Date().toISOString()}\nURL: ${url}\n\n=== RAW PAYLOAD ===\n${payload}\n\n=== FORMATTED PAYLOAD ===\n${formattedPayload}\n`;

          fs.writeFileSync(payloadFile, content);

          console.log('   ✅ Booking payload saved to: ' + payloadFile);
          console.log('');
        }
      }
    });

    // Also log navigation events
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        console.log(`📍 Navigated to: ${url}`);

        if (url.includes('/confirmation')) {
          console.log('   ✅ SUCCESS: Reached confirmation page!');
        } else if (url.includes('/bookerror')) {
          console.log('   ❌ ERROR: Reached booking error page!');
        }
        console.log('');
      }
    });

    console.log('   ✅ Capture ready\n');
    console.log('');

    // ===================================================================
    // MANUAL INTERACTION
    // ===================================================================
    console.log('═'.repeat(80));
    console.log('4️⃣  MANUAL INTERACTION - YOU ARE IN CONTROL');
    console.log('═'.repeat(80));
    console.log('');
    console.log('🛑 BROWSER IS READY');
    console.log('');
    console.log('Instructions:');
    console.log('   1. The browser window is now open at GameTime homepage');
    console.log('   2. Manually login with your credentials');
    console.log('   3. Navigate to the booking form however you normally would');
    console.log('   4. Fill out the form (singles or doubles)');
    console.log('   5. Click submit');
    console.log('   6. Any POST requests will be automatically captured');
    console.log('   7. Browser will stay open - take your time');
    console.log('');
    console.log('⏳ Browser will stay open until you press Ctrl+C in terminal');
    console.log('');
    console.log('═'.repeat(80));
    console.log('');

    // Keep browser open indefinitely
    await new Promise(() => {});

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    console.error(error.stack);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runTest();
