/**
 * GameTime API Proxy Server V3
 * Enhanced debugging to find the issue with login
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

// Debug logger
function log(msg) {
  console.log(msg);
  fs.appendFileSync(path.join(__dirname, '..', 'proxy_v3.log'), msg + '\n', 'utf8');
}

// Agents
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

let sessionData = { nrbaSession: null };

// Create axios client - match browser behavior exactly
const gametimeClient = axios.create({
  baseURL: 'https://jct.gametime.net',
  httpAgent: httpAgent,
  httpsAgent: httpsAgent,
  withCredentials: false,
  maxRedirects: 0,
  validateStatus: (status) => true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

app.post('/api/gametime/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    log(`\n=== LOGIN REQUEST ===`);
    log(`Username: ${username}`);
    log(`Password: ${password ? '***' : 'MISSING'}`);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Format data exactly as form would
    const formData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    log(`Form Data: ${formData}`);

    log(`Sending POST to https://jct.gametime.net/auth/json-index`);

    const response = await gametimeClient.post(
      '/auth/json-index',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    log(`Response Status: ${response.status}`);
    log(`Response Headers: ${JSON.stringify(response.headers).substring(0, 300)}`);
    log(`Response Data: ${JSON.stringify(response.data).substring(0, 500)}`);

    // Save full response
    fs.writeFileSync(path.join(__dirname, '..', 'login_response_v3.json'), JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    }, null, 2), 'utf8');

    // Check for success
    if (response.data && response.data.code === 200) {
      log(`✅ Login successful! Code 200`);
      // Look for session token in different places
      const possibleTokenLocations = [
        'response.data.value',
        'response.data.session',
        'response.data.token',
        'response.data.NRBA_SESSION',
        'response.headers.set-cookie',
      ];
      possibleTokenLocations.forEach(loc => {
        log(`Checking ${loc}: ${JSON.stringify(eval(loc)).substring(0, 100)}`);
      });
    } else if (response.data && response.data.code) {
      log(`❌ Login failed! Code: ${response.data.code}, Message: ${response.data.msg}`);
    }

    return res.json({
      success: response.data?.code === 200,
      response: response.data,
      status: response.status,
    });
  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
    log(`Stack: ${error.stack.substring(0, 300)}`);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`🎾 GameTime Proxy V3 running on port ${PORT}`);
  log(`Proxy V3 started on port ${PORT}`);
});
