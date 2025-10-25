/**
 * GameTime API Proxy Server - FIXED VERSION
 * Properly handles cookie-based session management
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const https = require('https');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store cookies from login
let sessionCookies = {};

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

const gametimeClient = axios.create({
  baseURL: 'https://jct.gametime.net',
  httpAgent: httpAgent,
  httpsAgent: httpsAgent,
  withCredentials: false,
  maxRedirects: 0,
  validateStatus: (status) => true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
});

/**
 * Helper: Format cookies object to Cookie header string
 */
function formatCookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/**
 * Helper: Parse Set-Cookie headers
 */
function parseCookies(setCookieHeader) {
  const cookies = {};
  if (!setCookieHeader) return cookies;

  const setCookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

  setCookieArray.forEach((cookie) => {
    // Extract name=value before attributes
    const cookiePart = cookie.split(';')[0];
    const [cookieName, cookieValue] = cookiePart.split('=');
    if (cookieName && cookieValue) {
      cookies[cookieName.trim()] = cookieValue.trim();
    }
  });

  return cookies;
}

/**
 * POST /api/gametime/login
 */
app.post('/api/gametime/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    console.log(`[LOGIN] Attempting login for: ${username}`);

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

    console.log(`[LOGIN] Response status: ${response.status}`);
    console.log(`[LOGIN] Response code: ${response.data?.code}`);

    // Extract and store cookies from response
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const newCookies = parseCookies(setCookieHeader);
      sessionCookies = { ...sessionCookies, ...newCookies };
      console.log(`[LOGIN] Stored cookies: ${Object.keys(sessionCookies).join(', ')}`);
    }

    // Check if login was successful
    const success = response.data?.code === 200 || response.status === 200;

    return res.json({
      success: success,
      message: success ? 'Authentication successful' : response.data?.msg || 'Authentication failed',
      responseCode: response.data?.code,
    });
  } catch (error) {
    console.error('[LOGIN] Error:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Failed to authenticate with GameTime',
    });
  }
});

/**
 * GET /api/gametime/availability/:date
 */
app.get('/api/gametime/availability/:date', async (req, res) => {
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
    }

    console.log(`[AVAIL] Requesting availability for: ${date}`);
    console.log(`[AVAIL] Available cookies: ${Object.keys(sessionCookies).join(', ') || 'NONE'}`);

    if (Object.keys(sessionCookies).length === 0) {
      console.log('[AVAIL] WARNING: No cookies - user may not be authenticated');
    }

    // Build headers with cookies
    const cookieHeader = formatCookieHeader(sessionCookies);
    const headers = {
      'Referer': 'https://jct.gametime.net/scheduling/index/index/sport/1',
      'Accept': 'application/json, text/plain, */*',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    console.log(`[AVAIL] Sending request with Cookie header: ${!!cookieHeader}`);

    const response = await gametimeClient.get(
      `/scheduling/index/jsoncourtdata/sport/1/date/${date}`,
      { headers }
    );

    console.log(`[AVAIL] Response status: ${response.status}`);

    // Check for redirect (auth failure)
    if (response.status >= 300 && response.status < 400) {
      console.log(`[AVAIL] ❌ Got redirect - authentication failed`);
      return res.status(401).json({
        success: false,
        error: 'Received redirect - authentication may have failed',
        status: response.status,
      });
    }

    if (response.status !== 200) {
      console.log(`[AVAIL] ❌ Non-200 status: ${response.status}`);
      return res.status(response.status).json({
        success: false,
        error: `GameTime returned ${response.status}`,
        data: response.data,
      });
    }

    console.log(`[AVAIL] ✅ Success! Courts: ${response.data?.e?.length || 0}`);
    return res.json(response.data);
  } catch (error) {
    console.error('[AVAIL] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch court availability',
      details: error.message,
    });
  }
});

/**
 * POST /api/gametime/booking
 */
app.post('/api/gametime/booking', async (req, res) => {
  try {
    const { court, date, startTime, durationMinutes, numberOfPlayers } = req.body;

    if (!court || !date || !startTime || !durationMinutes || !numberOfPlayers) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    console.log(`[BOOKING] Court ${court}, ${date} at ${startTime}`);

    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = (hours - 6) * 60 + minutes;

    const bookingData = {
      court,
      date,
      time: startMinutes,
      duration: durationMinutes,
      players: numberOfPlayers,
    };

    const cookieHeader = formatCookieHeader(sessionCookies);
    const headers = {};
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await gametimeClient.post('/scheduling/index/submitbooking', bookingData, {
      headers,
    });

    console.log('[BOOKING] Submitted successfully');

    return res.json({
      success: true,
      confirmationId: response.data.confirmationId || `CONF-${Date.now()}`,
      actualCourt: response.data.actualCourt || court,
    });
  } catch (error) {
    console.error('[BOOKING] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit booking',
    });
  }
});

/**
 * POST /api/gametime/logout
 */
app.post('/api/gametime/logout', async (req, res) => {
  try {
    console.log('[LOGOUT] Logging out');

    const cookieHeader = formatCookieHeader(sessionCookies);
    const headers = {};
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    await gametimeClient.post('/auth/logout', {}, { headers });

    console.log('[LOGOUT] Logged out successfully');
    sessionCookies = {};

    return res.json({ success: true });
  } catch (error) {
    console.error('[LOGOUT] Error:', error.message);
    sessionCookies = {};
    return res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'GameTime Proxy Server is running' });
});

app.listen(PORT, () => {
  console.log(`\n🎾 GameTime Proxy Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST   /api/gametime/login');
  console.log('  GET    /api/gametime/availability/:date');
  console.log('  POST   /api/gametime/booking');
  console.log('  POST   /api/gametime/logout');
  console.log('  GET    /health\n');
});
