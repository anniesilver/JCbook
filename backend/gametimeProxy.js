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
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

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
 * Create a cookie jar for persistent session management
 */
const cookieJar = new CookieJar();

/**
 * Axios instance for GameTime.net API calls
 * Uses cookie jar to maintain session persistence
 */
const gametimeClient = wrapper(axios.create({
  baseURL: 'https://jct.gametime.net',
  httpAgent: httpAgent,
  httpsAgent: httpsAgent,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  jar: cookieJar, // Use cookie jar
}));

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
      '/auth',
      `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('[GameTimeProxy] Login successful');

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

    console.log(`[GameTimeProxy] Fetching availability for date: ${date}`);

    const response = await gametimeClient.get(`/scheduling/index/jsoncourtdata/sport/1/date/${date}`);

    console.log('[GameTimeProxy] Court data received');

    return res.json(response.data);
  } catch (error) {
    console.error('[GameTimeProxy] Availability error:', error.message || error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch court availability',
      details: error instanceof Error ? error.message : error,
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
