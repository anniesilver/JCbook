/**
 * Utility to find Court ID from Court Display Name
 */

const { chromium } = require('playwright');

async function findCourtId(courtDisplayName) {
  console.log(`\nFinding Court ID for: "${courtDisplayName}"\n`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    console.log('Logging in...');
    await page.goto('https://jct.gametime.net/auth', { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    const usernameField = await page.$('input[type="text"]');
    await usernameField.type('annieyang', { delay: 50 });

    const passwordField = await page.$('input[type="password"]');
    await passwordField.type('jc333666', { delay: 50 });

    const loginButton = await page.$('input[type="submit"]') || await page.$('button[type="submit"]');
    await loginButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});

    console.log('Login successful\n');

    // Navigate to tennis scheduling
    console.log('Loading tennis schedule...');
    await page.goto('https://jct.gametime.net/scheduling/index/index/sport/1', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Schedule loaded\n');

    // Wait for page content to be fully loaded
    await new Promise(r => setTimeout(r, 2000));

    // Extract court information from the page
    const courtMappings = await page.evaluate(() => {
      const courts = [];

      // Check JavaScript variables
      if (window.b && window.b.sportCourtData) {
        const courtData = window.b.sportCourtData;
        for (const courtId in courtData) {
          courts.push({
            courtId: courtId,
            courtName: courtData[courtId].name || 'Unknown'
          });
        }
      }

      // Also try to find from DOM elements (links with court IDs)
      const links = document.querySelectorAll('a[href*="/court/"]');
      links.forEach(link => {
        const href = link.href;
        // Match /court/XX/ or /court/XX# or /court/XX at end of URL
        const match = href.match(/\/court\/(\d+)(?:\/|#|$)/);
        if (match) {
          const courtId = match[1];
          // Use the link's text directly, not the parent's text
          const courtName = link.textContent.trim() || link.innerText.trim();

          courts.push({
            courtId: courtId,
            courtName: courtName,
            href: href
          });
        }
      });

      // Also check any dropdown or select elements
      const selects = document.querySelectorAll('select[name*="court"], select#courtSel');
      selects.forEach(select => {
        const options = select.querySelectorAll('option');
        options.forEach(option => {
          if (option.value && option.value !== '') {
            courts.push({
              courtId: option.value,
              courtName: option.textContent.trim()
            });
          }
        });
      });

      return courts;
    });

    console.log('Found court mappings:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Deduplicate and organize
    const uniqueCourts = {};
    courtMappings.forEach(court => {
      if (!uniqueCourts[court.courtId]) {
        uniqueCourts[court.courtId] = court;
      }
    });

    Object.values(uniqueCourts).forEach(court => {
      console.log(`Court ID: ${court.courtId.padEnd(4)} → ${court.courtName}`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find the specific court we're looking for
    const targetCourt = Object.values(uniqueCourts).find(court =>
      court.courtName.toLowerCase().includes(courtDisplayName.toLowerCase())
    );

    if (targetCourt) {
      console.log(`✅ Found: "${courtDisplayName}" → Court ID: ${targetCourt.courtId}\n`);
      await browser.close();
      return targetCourt.courtId;
    } else {
      console.log(`❌ Could not find court: "${courtDisplayName}"\n`);
      console.log('Available courts:');
      Object.values(uniqueCourts).forEach(court => {
        console.log(`  - ${court.courtName}`);
      });

      await browser.close();
      return null;
    }

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    if (browser) await browser.close();
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const courtName = process.argv[2] || 'Court 6';
  findCourtId(courtName).then(courtId => {
    if (courtId) {
      console.log(`Court ID for "${courtName}": ${courtId}`);
    } else {
      console.log(`Failed to find court ID for "${courtName}"`);
    }
  });
} else {
  // Export for use in other scripts
  module.exports = { findCourtId };
}
