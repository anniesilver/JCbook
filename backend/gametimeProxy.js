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
const fs = require('fs');

const app = express();
const PORT = 3001;
const LOG_FILE = './backend/proxy.log';

// Helper function to log to file and console
function log(message) {
  console.log(message);
  try {
    fs.appendFileSync(LOG_FILE, message + '\n');
  } catch (e) {
    // Fail silently if logging fails
  }
}

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Create HTTP/HTTPS agents with keepAlive
 */
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

/**
 * Manual cookie storage (simple string)
 * Stores cookies returned from GameTime in Set-Cookie headers
 */
let sessionCookies = '';

/**
 * Axios instance for GameTime.net API calls
 * Manually manage cookies
 */
const gametimeClient = axios.create({
  baseURL: 'https://jct.gametime.net',
  httpAgent: httpAgent,
  httpsAgent: httpsAgent,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
    log('[GameTimeProxy] Login response status: ' + response.status);
    log('[GameTimeProxy] All response headers: ' + JSON.stringify(response.headers));

    if (response.headers['set-cookie']) {
      const setCookieArray = Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie']
        : [response.headers['set-cookie']];

      log('[GameTimeProxy] Set-Cookie headers found: ' + setCookieArray.length);
      setCookieArray.forEach((cookie, i) => {
        log('[GameTimeProxy] Cookie ' + i + ': ' + cookie);
      });

      // Extract cookie names and values (before semicolon)
      sessionCookies = setCookieArray
        .map(cookie => cookie.split(';')[0])
        .join('; ');

      log('[GameTimeProxy] ✅ Login successful');
      log('[GameTimeProxy] Cookies stored: ' + sessionCookies);
    } else {
      log('[GameTimeProxy] ⚠️ Login successful but NO Set-Cookie header received');
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
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
    }

    log(`[GameTimeProxy] Fetching availability for date: ${date}`);
    log(`[GameTimeProxy] Using cookies: ${sessionCookies || 'NONE'}`);

    const response = await gametimeClient.get(
      `/scheduling/index/jsoncourtdata/sport/1/date/${date}`,
      {
        headers: {
          'Referer': 'https://jct.gametime.net/scheduling/index/index/sport/1',
          'Cookie': sessionCookies, // Send stored cookies
        },
      }
    );

    log('[GameTimeProxy] ✅ Court data received');
    log('[GameTimeProxy] Response status: ' + response.status);
    log('[GameTimeProxy] Courts count: ' + (response.data.e?.length || 0));

    return res.json(response.data);
  } catch (error) {
    log('[GameTimeProxy] ❌ Availability error: ' + error.message);
    if (error.response) {
      log('[GameTimeProxy] Response status: ' + error.response.status);
      log('[GameTimeProxy] Response headers: ' + JSON.stringify(error.response.headers));
      const respDataStr = JSON.stringify(error.response.data);
      log('[GameTimeProxy] Response data: ' + respDataStr.substring(0, 500));
    } else if (error.code) {
      log('[GameTimeProxy] Error code: ' + error.code);
    } else {
      log('[GameTimeProxy] Full error: ' + JSON.stringify(error).substring(0, 500));
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch court availability',
      details: error.response?.status || error.message,
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

    // Submit to GameTime
    // NOTE: The actual endpoint may vary - this is a placeholder
    const response = await gametimeClient.post('/scheduling/index/submitbooking', bookingData);

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

    await gametimeClient.post('/auth/logout', {});

    console.log('[GameTimeProxy] Logged out successfully');

    return res.json({ success: true });
  } catch (error) {
    console.error('[GameTimeProxy] Logout error:', error.message || error);
    sessionCookies = '';
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
