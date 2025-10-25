/**
 * GameTime API Proxy Server V2
 * This version focuses on NRBA_SESSION token-based authentication
 * Based on findings that GameTime stores session in localStorage, not HTTP cookies
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = 3002; // Use different port to test

// Middleware
app.use(cors());
app.use(express.json());

// Debug logging helper
function debugLog(label, message) {
  const msg = `[${label}] ${message}`;
  console.log(msg);
  const path = require('path');
  const logPath = path.join(__dirname, '..', 'proxy_v2.log');
  fs.appendFileSync(logPath, msg + '\n', 'utf8');
}

// HTTP/HTTPS agents
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// Session storage
let sessionData = {
  nrbaSession: null,
};

// Axios instance for GameTime
const gametimeClient = axios.create({
  baseURL: 'https://jct.gametime.net',
  httpAgent: httpAgent,
  httpsAgent: httpsAgent,
  withCredentials: false,
  maxRedirects: 0,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  validateStatus: (status) => true,
});

/**
 * POST /api/gametime/login
 */
app.post('/api/gametime/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    debugLog('LOGIN', `Attempting login for ${username}`);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

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

    debugLog('LOGIN', `Response status: ${response.status}`);
    debugLog('LOGIN', `Response data type: ${typeof response.data}`);

    // Write full response for analysis
    const path = require('path');
    const respPath = path.join(__dirname, '..', 'login_response_v2.json');
    fs.writeFileSync(respPath, JSON.stringify({
      status: response.status,
      dataKeys: Object.keys(response.data),
      data: response.data,
    }, null, 2), 'utf8');

    debugLog('LOGIN', `Full response written to login_response_v2.json`);

    // Try to extract session token
    if (response.data && response.data.value) {
      sessionData.nrbaSession = response.data.value;
      debugLog('LOGIN', `✅ Token extracted from response.data.value`);
    } else if (response.data && response.data.token) {
      sessionData.nrbaSession = response.data.token;
      debugLog('LOGIN', `✅ Token extracted from response.data.token`);
    } else {
      debugLog('LOGIN', `⚠️  Token NOT found in response`);
      debugLog('LOGIN', `Response keys: ${Object.keys(response.data).join(', ')}`);
    }

    return res.json({
      success: true,
      message: 'Authentication successful',
      tokenExtracted: !!sessionData.nrbaSession,
      token: sessionData.nrbaSession ? sessionData.nrbaSession.substring(0, 50) : null,
    });
  } catch (error) {
    debugLog('LOGIN', `❌ Error: ${error.message}`);
    return res.status(401).json({
      success: false,
      error: 'Failed to authenticate',
      details: error.message,
    });
  }
});

/**
 * GET /api/gametime/availability/:date
 */
app.get('/api/gametime/availability/:date', async (req, res) => {
  try {
    const { date } = req.params;
    debugLog('AVAIL', `Requesting availability for ${date}`);
    debugLog('AVAIL', `Session token exists: ${!!sessionData.nrbaSession}`);

    if (!sessionData.nrbaSession) {
      debugLog('AVAIL', `❌ No session token`);
      return res.status(401).json({
        success: false,
        error: 'Not authenticated - please login first',
      });
    }

    const headers = {
      'Referer': 'https://jct.gametime.net/scheduling/index/index/sport/1',
      'Accept': 'application/json, text/plain, */*',
      'Cookie': `NRBA_SESSION=${sessionData.nrbaSession}`,
    };

    debugLog('AVAIL', `Sending request with session token...`);

    const response = await gametimeClient.get(
      `/scheduling/index/jsoncourtdata/sport/1/date/${date}`,
      { headers }
    );

    debugLog('AVAIL', `Response status: ${response.status}`);

    if (response.status >= 300 && response.status < 400) {
      debugLog('AVAIL', `❌ Got redirect - auth failed`);
      return res.status(401).json({
        success: false,
        error: 'Received redirect - authentication failed',
        status: response.status,
      });
    }

    if (response.status !== 200) {
      debugLog('AVAIL', `❌ Non-200 status: ${response.status}`);
      return res.status(response.status).json({
        success: false,
        error: `GameTime returned ${response.status}`,
      });
    }

    debugLog('AVAIL', `✅ Success! Got court data`);
    return res.json(response.data);
  } catch (error) {
    debugLog('AVAIL', `❌ Error: ${error.message}`);
    if (error.response) {
      debugLog('AVAIL', `Response status: ${error.response.status}`);
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch availability',
      details: error.message,
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', version: 2 });
});

app.listen(PORT, () => {
  console.log(`🎾 GameTime Proxy V2 running on http://localhost:${PORT}`);
  debugLog('STARTUP', `Proxy listening on port ${PORT}`);
});
