/**
 * GameTime API Proxy Server
 * Runs on localhost:3001
 * Handles all GameTime.net API calls to avoid CORS issues
 *
 * The browser (localhost:8084) calls this server (localhost:3001)
 * which then calls GameTime.net (jct.gametime.net)
 *
 * This eliminates CORS errors because:
 * - Browser → Proxy: Same-origin (both localhost, allowed)
 * - Proxy → GameTime: Server-to-server (no CORS restrictions)
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const https = require('https');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Create HTTP/HTTPS agents with keepAlive
 */
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

/**
 * Manual cookie storage as an object
 * Key: cookie name, Value: cookie value
 */
let sessionCookies = {};

/**
 * Helper function to format cookies object into Cookie header string
 */
function formatCookieHeader(cookiesObj) {
  return Object.entries(cookiesObj)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/**
 * Axios instance for GameTime.net API calls
 * Manually manage cookies - don't auto-handle them
 */
const gametimeClient = axios.create({
  baseURL: 'https://jct.gametime.net',
  httpAgent: httpAgent,
  httpsAgent: httpsAgent,
  withCredentials: false, // Disable auto cookie handling - we'll do it manually
  maxRedirects: 0, // Don't follow redirects - they indicate auth failure
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  validateStatus: (status) => {
    // Don't throw on any status - we'll handle redirects manually
    return true;
  },
});

/**
 * POST /api/gametime/login
 * Authenticates with GameTime.net
 */
app.post('/api/gametime/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    console.log(`[GameTimeProxy] Attempting login for user: ${username}`);

    const response = await gametimeClient.post(
      '/auth/json-index',
      `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*',
        },
      }
    );

    // Store cookies from response for future requests
    console.log('[LOGIN] Response status: ' + response.status);
    console.log('[LOGIN] All headers: ' + JSON.stringify(response.headers));

    if (response.headers['set-cookie']) {
      const setCookieArray = Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie']
        : [response.headers['set-cookie']];

      console.log('[LOGIN] Set-Cookie headers found: ' + setCookieArray.length);

      // Parse each cookie and store individually
      setCookieArray.forEach((cookie, i) => {
        console.log('[LOGIN] Cookie ' + i + ': ' + cookie);

        // Extract name=value before attributes (semicolon)
        const cookiePart = cookie.split(';')[0];
        const [cookieName, cookieValue] = cookiePart.split('=');

        if (cookieName && cookieValue) {
          sessionCookies[cookieName.trim()] = cookieValue.trim();
          console.log('[LOGIN] Stored: ' + cookieName.trim() + '=' + cookieValue.trim());
        }
      });

      const formattedCookies = formatCookieHeader(sessionCookies);
      console.log('[LOGIN] ✅ Success - ' + Object.keys(sessionCookies).length + ' cookies');
      console.log('[LOGIN] Formatted: ' + formattedCookies);
    } else {
      console.log('[LOGIN] ⚠️ NO Set-Cookie header found!');
      console.log('[LOGIN] sessionCookies is still empty: ' + Object.keys(sessionCookies).length);
    }

    return res.json({
      success: true,
      message: 'Authentication successful',
    });
  } catch (error) {
    console.error('[GameTimeProxy] Login error:', error.message || error);
    return res.status(401).json({
      success: false,
      error: 'Failed to authenticate with GameTime',
    });
  }
});

/**
 * GET /api/gametime/availability/:date
 * Fetches court availability for a specific date
 */
app.get('/api/gametime/availability/:date', async (req, res) => {
  const { date } = req.params;

  if (!date) {
    return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
  }

  // Check if cookies are available
  const cookieCount = Object.keys(sessionCookies).length;
  console.log(`[AVAIL START] Date: ${date}, Cookies: ${cookieCount}`);
  console.log('[AVAIL] sessionCookies object keys:', Object.keys(sessionCookies));
  console.log('[AVAIL] sessionCookies values:', sessionCookies);

  // Format cookies into proper header string
  const cookieHeader = formatCookieHeader(sessionCookies);
  console.log(`[AVAIL] Formatted cookie header: "${cookieHeader}"`);

  const headers = {
    'Referer': 'https://jct.gametime.net/scheduling/index/index/sport/1',
    'Accept': 'application/json, text/plain, */*',
  };

  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  console.log('[AVAIL] Final request headers:', JSON.stringify(headers));
  console.log('[AVAIL] About to call GameTime API...');

  try {
    const response = await gametimeClient.get(
      `/scheduling/index/jsoncourtdata/sport/1/date/${date}`,
      { headers }
    );

    console.log('[AVAIL] Response status: ' + response.status);
    console.log('[AVAIL] Response headers:', JSON.stringify(response.headers).substring(0, 200));

    // Check for redirects (indicates auth failure)
    if (response.status >= 300 && response.status < 400) {
      console.log('[AVAIL] ❌ Got redirect! Status ' + response.status + ' - NOT AUTHENTICATED');
      console.log('[AVAIL] Location header:', response.headers.location);
      return res.status(401).json({
        success: false,
        error: 'Received redirect - authentication may have failed',
        status: response.status,
        redirectTo: response.headers.location,
      });
    }

    if (response.status !== 200) {
      console.log('[AVAIL] ❌ Non-200 status: ' + response.status);
      console.log('[AVAIL] Response data sample:', JSON.stringify(response.data).substring(0, 200));
      return res.status(response.status).json({
        success: false,
        error: 'GameTime server returned ' + response.status,
        data: response.data,
      });
    }

    console.log('[AVAIL] ✅ Success! Got 200');
    console.log('[AVAIL] Data has courts: ' + !!response.data.e);
    console.log('[AVAIL] Courts count: ' + (response.data.e?.length || 0));

    return res.json(response.data);
  } catch (error) {
    console.log('[AVAIL] ❌ ERROR THROWN');
    console.log('[AVAIL] Error constructor:', error?.constructor?.name);
    console.log('[AVAIL] Error message:', error?.message);
    console.log('[AVAIL] Error code:', error?.code);

    if (error?.response) {
      console.log('[AVAIL] Has HTTP response: YES');
      console.log('[AVAIL] Response status:', error.response.status);
    } else {
      console.log('[AVAIL] Has HTTP response: NO');
    }

    console.log('[AVAIL] About to return 500 error');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch court availability',
      errorMessage: error?.message || 'Unknown error',
      errorType: error?.constructor?.name,
      details: error?.response?.status,
    });
  }
});

/**
 * POST /api/gametime/booking
 * Submits a booking to GameTime
 *
 * Request body:
 * {
 *   court: number,
 *   date: string (YYYY-MM-DD),
 *   startTime: string (HH:MM),
 *   durationMinutes: number,
 *   numberOfPlayers: number
 * }
 */
app.post('/api/gametime/booking', async (req, res) => {
  try {
    const { court, date, startTime, durationMinutes, numberOfPlayers } = req.body;

    if (!court || !date || !startTime || !durationMinutes || !numberOfPlayers) {
      return res.status(400).json({
        error: 'Missing required fields: court, date, startTime, durationMinutes, numberOfPlayers',
      });
    }

    console.log(
      `[GameTimeProxy] Submitting booking: Court ${court}, ${date} at ${startTime}, ${durationMinutes} min`
    );

    // Convert start time to minutes from 6 AM
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = (hours - 6) * 60 + minutes;

    // Build booking data
    const bookingData = {
      court,
      date,
      time: startMinutes,
      duration: durationMinutes,
      players: numberOfPlayers,
    };

    // Prepare headers with cookies
    const cookieHeader = formatCookieHeader(sessionCookies);
    const headers = {};
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    // Submit to GameTime
    const response = await gametimeClient.post('/scheduling/index/submitbooking', bookingData, {
      headers,
    });

    console.log('[GameTimeProxy] Booking submitted successfully');

    return res.json({
      success: true,
      confirmationId: response.data.confirmationId || response.data.confirmation_id || `CONF-${Date.now()}`,
      actualCourt: response.data.actualCourt || response.data.actual_court || court,
    });
  } catch (error) {
    console.error('[GameTimeProxy] Booking error:', error.message || error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit booking',
      details: error.message || 'Unknown error',
    });
  }
});

/**
 * POST /api/gametime/logout
 * Logs out from GameTime
 */
app.post('/api/gametime/logout', async (req, res) => {
  try {
    console.log('[GameTimeProxy] Logging out');

    const cookieHeader = formatCookieHeader(sessionCookies);
    const headers = {};
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    await gametimeClient.post('/auth/logout', {}, { headers });

    console.log('[GameTimeProxy] Logged out successfully');

    // Clear cookies after logout
    sessionCookies = {};

    return res.json({ success: true });
  } catch (error) {
    console.error('[GameTimeProxy] Logout error:', error.message || error);
    // Clear cookies even if logout fails
    sessionCookies = {};
    return res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'GameTime Proxy Server is running' });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n🎾 GameTime Proxy Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST   /api/gametime/login');
  console.log('  GET    /api/gametime/availability/:date');
  console.log('  POST   /api/gametime/booking');
  console.log('  POST   /api/gametime/logout');
  console.log('  GET    /health\n');
});
