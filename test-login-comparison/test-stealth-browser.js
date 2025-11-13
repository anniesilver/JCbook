/**
 * TEST: STEALTH BROWSER - ENHANCED ANTI-DETECTION
 *
 * This script uses enhanced browser settings to avoid detection:
 * - User-Agent spoofing
 * - Navigator property overrides
 * - Viewport and locale settings
 * - Permission grants
 * - JavaScript execution to hide automation
 *
 * Usage: node test-stealth-browser.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('\n' + '█'.repeat(80));
  console.log('TEST: STEALTH BROWSER - ENHANCED ANTI-DETECTION');
  console.log('█'.repeat(80) + '\n');

  let browser;
  let context;
  let page;
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

  try {
    console.log('1️⃣  Launching browser with stealth settings...\n');

    // Launch with maximum stealth
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    // Create context with realistic settings
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation', 'notifications'],
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      colorScheme: 'light'
    });

    page = await context.newPage();

    // Override navigator properties to hide automation
    await page.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });

      // Override navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Override navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });

      // Override Chrome object
      window.chrome = {
        runtime: {}
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    console.log('   ✅ Stealth browser configured\n');

    console.log('2️⃣  Loading GameTime homepage...\n');
    await page.goto('https://jct.gametime.net', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('   ✅ Page loaded\n');
    console.log('');

    // Setup payload capture
    console.log('3️⃣  Setting up payload capture...\n');

    let submissionCount = 0;

    page.on('request', request => {
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
          const payloadFile = path.join(logsDir, `stealth-manual-${timestamp}.txt`);

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

    // Manual interaction
    console.log('═'.repeat(80));
    console.log('4️⃣  MANUAL INTERACTION - STEALTH MODE ACTIVE');
    console.log('═'.repeat(80));
    console.log('');
    console.log('🥷 STEALTH BROWSER IS READY');
    console.log('');
    console.log('Enhanced anti-detection features:');
    console.log('   ✅ navigator.webdriver = false');
    console.log('   ✅ Real user agent');
    console.log('   ✅ Plugins present');
    console.log('   ✅ Timezone: America/New_York');
    console.log('   ✅ Locale: en-US');
    console.log('   ✅ Chrome object present');
    console.log('');
    console.log('Instructions:');
    console.log('   1. Manually login');
    console.log('   2. Navigate to booking form');
    console.log('   3. Fill and submit doubles booking');
    console.log('   4. Check if it works!');
    console.log('');
    console.log('⏳ Browser will stay open until you press Ctrl+C');
    console.log('');
    console.log('═'.repeat(80));
    console.log('');

    // Keep open
    await new Promise(() => {});

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    console.error(error.stack);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runTest();
