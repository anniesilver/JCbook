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

import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import * as fs from 'fs';
import * as path from 'path';

// Log file path - use absolute path to jc directory
const logFile = path.join(process.cwd(), 'proxy_3002.log');

function logError(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.error(message);
  try {
    console.error(`[DEBUG] Writing to log file: ${logFile}`);
    fs.appendFileSync(logFile, logMessage, 'utf8');
    console.error(`[DEBUG] Successfully wrote to log file`);
  } catch (e) {
    console.error('Failed to write to log file:', e);
    console.error(`[DEBUG] Log file path was: ${logFile}`);
  }
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Create a proper cookie jar for managing GameTime session cookies
 */
const cookieJar = new CookieJar();

/**
 * Axios instance for GameTime.net API calls
 * Using axios-cookiejar-support to properly handle Set-Cookie headers
 */
const gametimeClient: AxiosInstance = wrapper(
  axios.create({
    baseURL: 'https://jct.gametime.net',
    jar: cookieJar,
    withCredentials: true,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
);

/**
 * Store session cookies as an object for proper management
 * Key: cookie name, Value: cookie value
 * This is kept for logging/debugging purposes
 */
let sessionCookies: { [key: string]: string } = {};

/**
 * Helper function to format cookies object into Cookie header string
 */
function formatCookieHeader(cookiesObj: { [key: string]: string }): string {
  return Object.entries(cookiesObj)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/**
 * POST /api/gametime/login
 * Authenticates with GameTime.net
 */
app.post('/api/gametime/login', async (req: Request, res: Response) => {
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

    // The cookie jar automatically handles Set-Cookie headers
    // Extract cookies for logging/debugging purposes
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const setCookieArray = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];

      console.log(`[GameTimeProxy] Found ${setCookieArray.length} Set-Cookie headers`);

      // Parse each cookie and store for logging
      setCookieArray.forEach((cookie, index) => {
        console.log(`[GameTimeProxy] Cookie ${index}: ${cookie}`);

        // Extract name=value before attributes (semicolon)
        const cookiePart = cookie.split(';')[0];
        const [cookieName, cookieValue] = cookiePart.split('=');

        if (cookieName && cookieValue) {
          sessionCookies[cookieName.trim()] = cookieValue.trim();
          console.log(`[GameTimeProxy] Stored in jar: ${cookieName.trim()}=${cookieValue.trim()}`);
        }
      });

      console.log(`[GameTimeProxy] Total cookies in jar: ${Object.keys(sessionCookies).length}`);
    }

    console.log('[GameTimeProxy] Login successful - cookie jar is now populated');

    return res.json({
      success: true,
      message: 'Authentication successful',
    });
  } catch (error) {
    console.error('[GameTimeProxy] Login error:', error instanceof Error ? error.message : error);
    return res.status(401).json({
      success: false,
      error: 'Failed to authenticate with GameTime',
    });
  }
});

/**
 * GET /api/gametime/availability/:date
 * Fetches court availability for a specific date
 * The cookie jar automatically handles sending stored cookies
 */
app.get('/api/gametime/availability/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
    }

    const cookieCount = Object.keys(sessionCookies).length;
    console.log(`[GameTimeProxy] Fetching availability for date: ${date}`);
    console.log(`[GameTimeProxy] Cookies in jar: ${cookieCount}`);

















































































    
    if (cookieCount > 0) {
      const cookieStr = formatCookieHeader(sessionCookies);
      console.log(`[GameTimeProxy] Cookie values: ${cookieStr}`);
    }

    if (cookieCount === 0) {
      console.warn('[GameTimeProxy] WARNING: No cookies in jar - user may not be authenticated');
    }

    // The cookie jar will automatically add the Cookie header from stored cookies
    const requestHeaders: any = {
      'Referer': 'https://jct.gametime.net/scheduling/index/index/sport/1',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    console.log('[GameTimeProxy] Sending request with cookies from jar...');
    console.log(`[GameTimeProxy] Request headers: ${JSON.stringify(requestHeaders)}`);

    const response = await gametimeClient.get(`/scheduling/index/jsoncourtdata/sport/1/date/${date}`, {
      headers: requestHeaders,
    });

    console.log('[GameTimeProxy] Court data received successfully');
    console.log(`[GameTimeProxy] Courts returned: ${response.data.e?.length || 0}`);

    return res.json(response.data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`[GameTimeProxy] Availability error: ${errorMessage}`);

    let errorDetails = '';
    if (error instanceof Error && 'response' in error && error.response) {
      const axError = error as any;
      logError(`[GameTimeProxy] Response status: ${axError.response.status}`);
      errorDetails = `Status: ${axError.response.status}`;

      try {
        const headersStr = JSON.stringify(axError.response.headers);
        logError(`[GameTimeProxy] Response headers: ${headersStr.substring(0, 300)}`);
      } catch (e) {
        logError('[GameTimeProxy] Could not stringify response headers');
      }

      try {
        const dataStr = JSON.stringify(axError.response.data);
        logError(`[GameTimeProxy] Response data: ${dataStr.substring(0, 500)}`);
        errorDetails += ` | Data: ${dataStr.substring(0, 200)}`;
      } catch (e) {
        logError('[GameTimeProxy] Could not stringify response data');
      }

      if (axError.response.status === 401 || axError.response.status === 403) {
        logError('[GameTimeProxy] *** AUTHENTICATION ERROR ***');
        logError('[GameTimeProxy] This may indicate: 1) Cookie expired, 2) Session validation issue, 3) Missing CSRF token');
      }
    } else {
      logError(`[GameTimeProxy] Full error object: ${JSON.stringify(error, null, 2).substring(0, 500)}`);
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch court availability',
      details: errorDetails,
    });
  }
});

/**
 * POST /api/gametime/booking
 * Submits a booking to GameTime
 * The cookie jar automatically handles sending stored cookies
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
app.post('/api/gametime/booking', async (req: Request, res: Response) => {
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

    // Submit to GameTime - cookie jar will automatically include cookies
    console.log('[GameTimeProxy] Sending booking request with cookies from jar...');

    const response = await gametimeClient.post('/scheduling/index/submitbooking', bookingData);

    console.log('[GameTimeProxy] Booking submitted successfully');

    return res.json({
      success: true,
      confirmationId: response.data.confirmationId || response.data.confirmation_id || `CONF-${Date.now()}`,
      actualCourt: response.data.actualCourt || response.data.actual_court || court,
    });
  } catch (error) {
    console.error('[GameTimeProxy] Booking error:', error instanceof Error ? error.message : error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit booking',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/gametime/logout
 * Logs out from GameTime
 */
app.post('/api/gametime/logout', async (req: Request, res: Response) => {
  try {
    console.log('[GameTimeProxy] Logging out');

    const cookieHeader = formatCookieHeader(sessionCookies);
    const logoutHeaders: any = {};
    if (cookieHeader) {
      logoutHeaders['Cookie'] = cookieHeader;
    }

    await gametimeClient.post('/auth/logout', {}, {
      headers: logoutHeaders,
    });

    console.log('[GameTimeProxy] Logged out successfully');
  } catch (error) {
    console.error('[GameTimeProxy] Logout error:', error instanceof Error ? error.message : error);
  } finally {
    // Clear cookies after logout attempt (success or failure)
    sessionCookies = {};
    return res.json({ success: true });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
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
