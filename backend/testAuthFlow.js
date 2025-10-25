/**
 * Test script to diagnose and test the authentication flow
 * This script tests: login → check response structure → availability request
 */

const axios = require('axios');

const PROXY_BASE = 'http://localhost:3001';
const username = process.env.GT_USERNAME || 'test_user';
const password = process.env.GT_PASSWORD || 'test_pass';

async function testAuthFlow() {
  console.log('🎾 Starting GameTime Authentication Flow Test\n');
  console.log(`Using credentials: ${username} / ${password.substring(0, 2)}***\n`);

  try {
    // Step 1: Test health check
    console.log('📋 Step 1: Health Check');
    try {
      const healthRes = await axios.get(`${PROXY_BASE}/health`);
      console.log('✅ Proxy is healthy\n');
    } catch (err) {
      console.error('❌ Proxy is not running on localhost:3001');
      console.error('   Run: node backend/gametimeProxy.js\n');
      process.exit(1);
    }

    // Step 2: Test login
    console.log('📋 Step 2: Login Request');
    console.log(`   POST ${PROXY_BASE}/api/gametime/login`);
    console.log(`   Body: { username: '${username}', password: '***' }\n`);

    let loginResponse;
    try {
      loginResponse = await axios.post(`${PROXY_BASE}/api/gametime/login`, {
        username,
        password,
      });

      console.log('✅ Login endpoint responded\n');
      console.log('   Response Status:', loginResponse.status);
      console.log('   Response Body:', JSON.stringify(loginResponse.data, null, 2));
    } catch (err) {
      if (err.response) {
        console.error('❌ Login failed with status:', err.response.status);
        console.error('   Response:', JSON.stringify(err.response.data, null, 2));
      } else {
        console.error('❌ Login request failed:', err.message);
      }
      process.exit(1);
    }

    // Step 3: Test availability request
    console.log('\n📋 Step 3: Availability Request');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7); // Next week
    const dateStr = testDate.toISOString().split('T')[0];
    console.log(`   GET ${PROXY_BASE}/api/gametime/availability/${dateStr}\n`);

    try {
      const availRes = await axios.get(
        `${PROXY_BASE}/api/gametime/availability/${dateStr}`
      );

      console.log('✅ Availability request succeeded!\n');
      console.log('   Response Status:', availRes.status);
      console.log(
        '   Courts returned:',
        availRes.data.e?.length || 0
      );
      if (availRes.data.e && availRes.data.e.length > 0) {
        console.log('   First court:', JSON.stringify(availRes.data.e[0], null, 2).substring(0, 200));
      }
    } catch (err) {
      if (err.response) {
        console.error('❌ Availability request failed with status:', err.response.status);
        console.error('   Error:', err.response.data?.error || 'Unknown error');
        if (err.response.status === 401) {
          console.error('\n   ⚠️  This suggests the session token was not captured or sent correctly');
          console.error('   Check proxy console logs for token extraction details');
        }
      } else {
        console.error('❌ Request failed:', err.message);
      }
    }

    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

testAuthFlow();
