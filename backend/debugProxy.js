/**
 * Debug script to test proxy with detailed logging
 */

const axios = require('axios');

const PROXY_URL = 'http://localhost:3001';
const USERNAME = 'annieyang';
const PASSWORD = 'jc333666';
const TEST_DATE = '2025-10-25';

const client = axios.create({
  baseURL: PROXY_URL,
  timeout: 15000,
  validateStatus: () => true,
});

async function test() {
  console.log('=== STARTING DEBUG TEST ===\n');

  // Test 1: Login
  console.log('1. Testing Login...');
  const loginRes = await client.post('/api/gametime/login', {
    username: USERNAME,
    password: PASSWORD,
  });
  console.log('Login Status:', loginRes.status);
  console.log('Login Response:', JSON.stringify(loginRes.data, null, 2));

  if (loginRes.status !== 200) {
    console.log('❌ LOGIN FAILED');
    return;
  }

  // Wait a moment
  await new Promise(r => setTimeout(r, 1000));

  // Test 2: Availability
  console.log('\n2. Testing Availability...');
  const availRes = await client.get(`/api/gametime/availability/${TEST_DATE}`);
  console.log('Availability Status:', availRes.status);
  console.log('Availability Response:', JSON.stringify(availRes.data, null, 2));

  if (availRes.status === 200 && availRes.data.e) {
    console.log('✅ SUCCESS - Got courts:', availRes.data.e.length);
  } else {
    console.log('❌ FAILED');
    if (availRes.data.errorMessage) {
      console.log('Error:', availRes.data.errorMessage);
    }
    if (availRes.data.errorCode) {
      console.log('Code:', availRes.data.errorCode);
    }
  }
}

test().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
