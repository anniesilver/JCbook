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
export {};
