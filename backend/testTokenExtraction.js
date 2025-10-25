/**
 * Test Token Extraction
 * This test focuses on understanding what the login response contains
 */

const axios = require('axios');

const PROXY_URL = 'http://localhost:3001';
const USERNAME = 'annieyang';
const PASSWORD = 'jc333666';

async function testTokenExtraction() {
  console.log('🔍 Testing NRBA_SESSION Token Extraction\n');

  try {
    // First, login and check what we get back
    console.log('Step 1: Logging in...\n');
    const loginRes = await axios.post(`${PROXY_URL}/api/gametime/login`, {
      username: USERNAME,
      password: PASSWORD,
    });

    console.log('Login Response:');
    console.log('  Status:', loginRes.status);
    console.log('  Data:', JSON.stringify(loginRes.data, null, 2));
    console.log('  tokenExtracted field:', loginRes.data.tokenExtracted);

    if (!loginRes.data.tokenExtracted) {
      console.log('\n⚠️  WARNING: Token was NOT extracted on server!\n');
    } else {
      console.log('\n✅ Token WAS extracted on server!\n');
    }

    // Now try availability
    console.log('Step 2: Requesting availability...\n');
    const availRes = await axios.get(`${PROXY_URL}/api/gametime/availability/2025-10-25`);

    console.log('Availability Response:');
    console.log('  Status:', availRes.status);
    console.log('  Success:', availRes.data.success);
    console.log('  Error:', availRes.data.error);
    console.log('  Full Response:', JSON.stringify(availRes.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

testTokenExtraction();
