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

import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import type { AxiosInstance } from 'axios';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Axios instance for GameTime.net API calls
 */
const gametimeClient: AxiosInstance = axios.create({
  baseURL: 'https://jct.gametime.net',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

/**
 * Store session cookies per user
 * Structure: { userId: { cookieName: cookieValue, ... }, ... }
 * This allows multiple users to have separate sessions without overwriting each other
 */
let userSessions: { [userId: string]: { [cookieName: string]: string } } = {};

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
 * Body: { username, password, userId }
 */
app.post('/api/gametime/login', async (req: Request, res: Response) => {
  try {
    const { username, password, userId } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    console.log(`[GameTimeProxy] Attempting login for user: ${username} (userId: ${userId})`);

    const response = await gametimeClient.post(
      '/auth',
      `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Initialize or get user's session storage
    if (!userSessions[userId]) {
      userSessions[userId] = {};
    }

    // Store cookies for this user
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const setCookieArray = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];

      console.log(`[GameTimeProxy] Found ${setCookieArray.length} Set-Cookie headers for user ${userId}`);

      // Parse each cookie and store individually for this user
      setCookieArray.forEach((cookie, index) => {
        console.log(`[GameTimeProxy] Cookie ${index}: ${cookie}`);

        // Extract name=value before attributes (semicolon)
        const cookiePart = cookie.split(';')[0];
        const [cookieName, cookieValue] = cookiePart.split('=');

        if (cookieName && cookieValue) {
          userSessions[userId][cookieName.trim()] = cookieValue.trim();
          console.log(`[GameTimeProxy] Stored for user ${userId}: ${cookieName.trim()}=${cookieValue.trim()}`);
        }
      });

      const cookieHeader = formatCookieHeader(userSessions[userId]);
      console.log(`[GameTimeProxy] Total cookies for user ${userId}: ${Object.keys(userSessions[userId]).length}`);
      console.log(`[GameTimeProxy] Cookie header: ${cookieHeader}`);
    }

    console.log(`[GameTimeProxy] Login successful for user ${userId}`);

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
 * Header: X-User-ID (required to identify which user's session to use)
 */
app.get('/api/gametime/availability/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID required (X-User-ID header)' });
    }

    const userCookies = userSessions[userId] || {};
    const cookieCount = Object.keys(userCookies).length;

    console.log(`[GameTimeProxy] Fetching availability for user ${userId}, date: ${date}`);
    console.log(`[GameTimeProxy] Available cookies for this user: ${cookieCount}`);

    if (cookieCount === 0) {
      console.warn(`[GameTimeProxy] WARNING: No cookies for user ${userId} - user may not be authenticated`);
    }

    // Format cookies into proper header
    const cookieHeader = formatCookieHeader(userCookies);
    console.log(`[GameTimeProxy] Sending Cookie header: ${cookieHeader || '(empty)'}`);

    const requestHeaders: any = {
      'Referer': 'https://jct.gametime.net/scheduling/index/index/sport/1',
      'Accept': 'application/json, text/plain, */*',
    };

    if (cookieHeader) {
      requestHeaders['Cookie'] = cookieHeader;
    }

    const response = await gametimeClient.get(`/scheduling/index/jsoncourtdata/sport/1/date/${date}`, {
      headers: requestHeaders,
    });

    console.log(`[GameTimeProxy] Court data received for user ${userId}`);
    console.log(`[GameTimeProxy] Courts returned: ${response.data.e?.length || 0}`);

    return res.json(response.data);
  } catch (error) {
    console.error('[GameTimeProxy] Availability error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && 'response' in error && error.response) {
      const axError = error as any;
      console.error(`[GameTimeProxy] Response status: ${axError.response.status}`);
      console.error(`[GameTimeProxy] Response data: ${JSON.stringify(axError.response.data).substring(0, 500)}`);
      if (axError.response.status === 401 || axError.response.status === 403) {
        console.error('[GameTimeProxy] Authentication error - may need to login again');
      }
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch court availability',
    });
  }
});

/**
 * POST /api/gametime/booking
 * Submits a booking to GameTime
 * Header: X-User-ID (required)
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
    const userId = req.headers['x-user-id'] as string;

    if (!court || !date || !startTime || !durationMinutes || !numberOfPlayers) {
      return res.status(400).json({
        error: 'Missing required fields: court, date, startTime, durationMinutes, numberOfPlayers',
      });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID required (X-User-ID header)' });
    }

    console.log(
      `[GameTimeProxy] Submitting booking for user ${userId}: Court ${court}, ${date} at ${startTime}, ${durationMinutes} min`
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

    // Get this user's cookies
    const userCookies = userSessions[userId] || {};
    const bookingHeaders: any = {};

    if (Object.keys(userCookies).length > 0) {
      const cookieHeader = formatCookieHeader(userCookies);
      bookingHeaders['Cookie'] = cookieHeader;
      console.log(`[GameTimeProxy] Using cookies for user ${userId}`);
    } else {
      console.warn(`[GameTimeProxy] WARNING: No cookies found for user ${userId}`);
    }

    const response = await gametimeClient.post('/scheduling/index/submitbooking', bookingData, {
      headers: bookingHeaders,
    });

    console.log(`[GameTimeProxy] Booking submitted successfully for user ${userId}`);

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
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required (X-User-ID header)' });
    }

    console.log(`[GameTimeProxy] Logging out user ${userId}`);

    const userCookies = userSessions[userId] || {};
    const logoutHeaders: any = {};

    if (Object.keys(userCookies).length > 0) {
      const cookieHeader = formatCookieHeader(userCookies);
      logoutHeaders['Cookie'] = cookieHeader;
    }

    await gametimeClient.post('/auth/logout', {}, {
      headers: logoutHeaders,
    });

    console.log(`[GameTimeProxy] Logged out user ${userId} successfully`);
  } catch (error) {
    console.error('[GameTimeProxy] Logout error:', error instanceof Error ? error.message : error);
  } finally {
    // Clear cookies for this user only
    const userId = req.headers['x-user-id'] as string;
    if (userId && userSessions[userId]) {
      delete userSessions[userId];
      console.log(`[GameTimeProxy] Cleared session for user ${userId}`);
    }
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
