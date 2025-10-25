"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
const app = (0, express_1.default)();
const PORT = 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
/**
 * Axios instance for GameTime.net API calls
 */
const gametimeClient = axios_1.default.create({
    baseURL: 'https://jct.gametime.net',
    withCredentials: true,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
    },
});
/**
 * Store session cookies as an object for proper management
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
        const response = await gametimeClient.post('/auth', `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        // Store cookies for future requests
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
            const setCookieArray = Array.isArray(setCookieHeader)
                ? setCookieHeader
                : [setCookieHeader];
            console.log(`[GameTimeProxy] Found ${setCookieArray.length} Set-Cookie headers`);
            // Parse each cookie and store individually
            setCookieArray.forEach((cookie, index) => {
                console.log(`[GameTimeProxy] Cookie ${index}: ${cookie}`);
                // Extract name=value before attributes (semicolon)
                const cookiePart = cookie.split(';')[0];
                const [cookieName, cookieValue] = cookiePart.split('=');
                if (cookieName && cookieValue) {
                    sessionCookies[cookieName.trim()] = cookieValue.trim();
                    console.log(`[GameTimeProxy] Stored: ${cookieName.trim()}=${cookieValue.trim()}`);
                }
            });
            const cookieHeader = formatCookieHeader(sessionCookies);
            console.log(`[GameTimeProxy] Total cookies: ${Object.keys(sessionCookies).length}`);
            console.log(`[GameTimeProxy] Cookie header: ${cookieHeader}`);
        }
        console.log('[GameTimeProxy] Login successful');
        return res.json({
            success: true,
            message: 'Authentication successful',
        });
    }
    catch (error) {
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
 */
app.get('/api/gametime/availability/:date', async (req, res) => {
    try {
        const { date } = req.params;
        if (!date) {
            return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
        }
        const cookieCount = Object.keys(sessionCookies).length;
        console.log(`[GameTimeProxy] Fetching availability for date: ${date}`);
        console.log(`[GameTimeProxy] Available cookies: ${cookieCount}`);
        if (cookieCount === 0) {
            console.warn('[GameTimeProxy] WARNING: No cookies available - user may not be authenticated');
        }
        // Format cookies into proper header
        const cookieHeader = formatCookieHeader(sessionCookies);
        console.log(`[GameTimeProxy] Sending Cookie header: ${cookieHeader || '(empty)'}`);
        const requestHeaders = {
            'Referer': 'https://jct.gametime.net/scheduling/index/index/sport/1',
            'Accept': 'application/json, text/plain, */*',
        };
        if (cookieHeader) {
            requestHeaders['Cookie'] = cookieHeader;
        }
        const response = await gametimeClient.get(`/scheduling/index/jsoncourtdata/sport/1/date/${date}`, {
            headers: requestHeaders,
        });
        console.log('[GameTimeProxy] Court data received');
        console.log(`[GameTimeProxy] Courts returned: ${response.data.e?.length || 0}`);
        return res.json(response.data);
    }
    catch (error) {
        console.error('[GameTimeProxy] Availability error:', error instanceof Error ? error.message : error);
        if (error instanceof Error && 'response' in error && error.response) {
            const axError = error;
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
        console.log(`[GameTimeProxy] Submitting booking: Court ${court}, ${date} at ${startTime}, ${durationMinutes} min`);
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
        const cookieHeader = formatCookieHeader(sessionCookies);
        const bookingHeaders = {};
        if (cookieHeader) {
            bookingHeaders['Cookie'] = cookieHeader;
        }
        const response = await gametimeClient.post('/scheduling/index/submitbooking', bookingData, {
            headers: bookingHeaders,
        });
        console.log('[GameTimeProxy] Booking submitted successfully');
        return res.json({
            success: true,
            confirmationId: response.data.confirmationId || response.data.confirmation_id || `CONF-${Date.now()}`,
            actualCourt: response.data.actualCourt || response.data.actual_court || court,
        });
    }
    catch (error) {
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
app.post('/api/gametime/logout', async (req, res) => {
    try {
        console.log('[GameTimeProxy] Logging out');
        const cookieHeader = formatCookieHeader(sessionCookies);
        const logoutHeaders = {};
        if (cookieHeader) {
            logoutHeaders['Cookie'] = cookieHeader;
        }
        await gametimeClient.post('/auth/logout', {}, {
            headers: logoutHeaders,
        });
        console.log('[GameTimeProxy] Logged out successfully');
    }
    catch (error) {
        console.error('[GameTimeProxy] Logout error:', error instanceof Error ? error.message : error);
    }
    finally {
        // Clear cookies after logout attempt (success or failure)
        sessionCookies = {};
        return res.json({ success: true });
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
