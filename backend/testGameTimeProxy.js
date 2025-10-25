/**
 * Standalone Test File for GameTime Proxy
 * Tests only: Login + Court Availability
 * No dependencies on other app modules
 */

const axios = require('axios');

const PROXY_URL = 'http://localhost:3001';
const USERNAME = 'annieyang';
const PASSWORD = 'jc333666';
const TEST_DATE = '2025-10-25';

const client = axios.create({
  baseURL: PROXY_URL,
  timeout: 10000,
  validateStatus: () => true, // Don't throw on any status
});

async function testLogin() {
  console.log('\n========================================');
  console.log('TEST 1: Login to GameTime');
  console.log('========================================');

  try {
    const response = await client.post('/api/gametime/login', {
      username: USERNAME,
      password: PASSWORD,
    });

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.success) {
      console.log('✅ LOGIN SUCCESSFUL');
      return true;
    } else {
      console.log('❌ LOGIN FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error.message);
    return false;
  }
}

async function testAvailability() {
  console.log('\n========================================');
  console.log('TEST 2: Get Court Availability');
  console.log('========================================');
  console.log(`Date: ${TEST_DATE}`);

  try {
    const response = await client.get(`/api/gametime/availability/${TEST_DATE}`);

    console.log('Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.e) {
      // Success - we got court data
      const courts = response.data.e;
      console.log(`✅ AVAILABILITY SUCCESSFUL`);
      console.log(`Courts returned: ${courts.length}`);

      courts.forEach((court, index) => {
        console.log(`  Court ${index + 1}: ${court.n} - ${court.b?.length || 0} bookings`);
      });

      // Show first court's time slots
      if (courts.length > 0) {
        const firstCourt = courts[0];
        console.log(`\nFirst Court Details:`);
        console.log(`  Name: ${firstCourt.n}`);
        console.log(`  Available slots: ${firstCourt.t?.length || 0}`);
      }

      return true;
    } else {
      console.log('❌ AVAILABILITY FAILED');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      if (response.data.details) {
        console.log('Details:', response.data.details);
      }
      if (response.data.errorMessage) {
        console.log('Error Message:', response.data.errorMessage);
      }
      if (response.data.errorCode) {
        console.log('Error Code:', response.data.errorCode);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ AVAILABILITY ERROR:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   GameTime Proxy Integration Test     ║');
  console.log('║     (Login + Availability Only)        ║');
  console.log('╚════════════════════════════════════════╝');

  console.log(`\nProxy: ${PROXY_URL}`);
  console.log(`Testing date: ${TEST_DATE}`);

  let test1Pass = false;
  let test2Pass = false;

  // Run tests
  test1Pass = await testLogin();
  test2Pass = await testAvailability();

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Test 1 (Login):       ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (Availability): ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);

  if (test1Pass && test2Pass) {
    console.log('\n🎉 ALL TESTS PASSED - Proxy is working correctly!');
    process.exit(0);
  } else {
    console.log('\n❌ TESTS FAILED - See above for details');
    process.exit(1);
  }
}

// Run
runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
