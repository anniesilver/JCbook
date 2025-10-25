/**
 * Direct test to see what the proxy is actually returning
 */

const axios = require('axios');

async function test() {
  try {
    console.log('Testing proxy directly...\n');

    // Create client
    const client = axios.create({
      baseURL: 'http://localhost:3001',
      timeout: 10000,
      validateStatus: () => true, // Don't throw
    });

    // Login
    console.log('Step 1: Login');
    const loginRes = await client.post('/api/gametime/login', {
      username: 'annieyang',
      password: 'jc333666',
    });
    console.log('Status:', loginRes.status);
    console.log('Data:', loginRes.data);
    console.log('');

    // Get availability
    console.log('Step 2: Get Availability');
    const availRes = await client.get('/api/gametime/availability/2025-10-25');
    console.log('Status:', availRes.status);
    console.log('Headers:', availRes.headers);
    console.log('Data type:', typeof availRes.data);
    console.log('Data:', JSON.stringify(availRes.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
