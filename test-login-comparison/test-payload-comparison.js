/**
 * TEST: PAYLOAD COMPARISON
 *
 * Generates the exact payload our code would send and saves it for comparison
 */

const fs = require('fs');
const path = require('path');

// Simulate what our code does
function generatePayload() {
  // These are the values our code would extract from the form
  const temp = '7021';
  const userId = '2511';
  const userName = 'Yang, Annie';
  const guestName = 'G';
  const freshToken = 'FAKE_TOKEN_FOR_COMPARISON';
  const gameTimeCourtId = '55';
  const date = '2025-11-16';
  const time = '1260';

  // Doubles configuration
  const bookingType = 'doubles';
  const durationHours = 1.5;

  // Our getBookingConfig function
  const config = {
    duration: '90',
    rtype: '1',
    inviteFor: 'Singles',
    playerCount: 4
  };

  console.log('Configuration:');
  console.log('  bookingType:', bookingType);
  console.log('  durationHours:', durationHours);
  console.log('  config.duration:', config.duration);
  console.log('  config.rtype:', config.rtype);
  console.log('  config.inviteFor:', config.inviteFor);
  console.log('  config.playerCount:', config.playerCount);
  console.log('');

  // Build form data EXACTLY like our code
  const formData = new URLSearchParams();
  formData.append('edit', '');
  formData.append('is_register', '');
  formData.append('rt_key', '');
  formData.append('temp', temp);
  formData.append('upd', 'true');
  formData.append('duration', '30');  // Slot size (always 30)
  formData.append('g-recaptcha-response', freshToken);
  formData.append('court', gameTimeCourtId);
  formData.append('date', date);
  formData.append('time', time);
  formData.append('sportSel', '1');
  formData.append('duration', config.duration);  // Total duration (from config)
  formData.append('rtype', config.rtype);
  formData.append('invite_for', config.inviteFor);

  // Player 1 (always the registered user)
  formData.append('players[1][user_id]', userId);
  formData.append('players[1][name]', userName);

  // Additional players (guests)
  for (let i = 2; i <= config.playerCount; i++) {
    formData.append(`players[${i}][user_id]`, '');
    formData.append(`players[${i}][name]`, guestName);
    formData.append(`players[${i}][guest]`, 'on');
    formData.append(`players[${i}][guestof]`, '1');
  }

  formData.append('payee_hide', userId);
  formData.append('bookingWaiverPolicy', 'true');

  return formData.toString();
}

// Chrome working payload
const chromePayload = `edit=&is_register=&rt_key=&temp=7021&upd=true&duration=30&g-recaptcha-response=CHROME_TOKEN&court=55&date=2025-11-16&time=1260&sportSel=1&duration=90&rtype=1&invite_for=Singles&players%5B1%5D%5Buser_id%5D=2511&players%5B1%5D%5Bname%5D=Yang%2C+Annie&players%5B2%5D%5Buser_id%5D=&players%5B2%5D%5Bname%5D=g&players%5B2%5D%5Bguest%5D=on&players%5B2%5D%5Bguestof%5D=1&players%5B3%5D%5Buser_id%5D=&players%5B3%5D%5Bname%5D=g&players%5B3%5D%5Bguest%5D=on&players%5B3%5D%5Bguestof%5D=1&players%5B4%5D%5Buser_id%5D=&players%5B4%5D%5Bname%5D=g&players%5B4%5D%5Bguest%5D=on&players%5B4%5D%5Bguestof%5D=1&payee_hide=2511&bookingWaiverPolicy=true`;

const ourPayload = generatePayload();

// Parse both
function parsePayload(payload) {
  const params = new URLSearchParams(payload);
  const result = {};
  for (const [key, value] of params.entries()) {
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(value);
  }
  return result;
}

const chromeParams = parsePayload(chromePayload);
const ourParams = parsePayload(ourPayload);

console.log('═'.repeat(80));
console.log('PAYLOAD COMPARISON');
console.log('═'.repeat(80));
console.log('');

// Compare all fields
const allKeys = new Set([...Object.keys(chromeParams), ...Object.keys(ourParams)]);

let hasDifferences = false;

console.log('Field-by-Field Comparison:');
console.log('');

for (const key of Array.from(allKeys).sort()) {
  const chromeValue = chromeParams[key] || ['MISSING'];
  const ourValue = ourParams[key] || ['MISSING'];

  const match = JSON.stringify(chromeValue) === JSON.stringify(ourValue);

  if (!match) {
    hasDifferences = true;
    console.log(`❌ ${key}`);
    console.log(`   Chrome: ${chromeValue.join(', ')}`);
    console.log(`   Ours:   ${ourValue.join(', ')}`);
    console.log('');
  } else {
    console.log(`✅ ${key}: ${chromeValue.join(', ')}`);
  }
}

console.log('');
console.log('═'.repeat(80));
console.log('RAW PAYLOADS');
console.log('═'.repeat(80));
console.log('');
console.log('CHROME (working):');
console.log(chromePayload);
console.log('');
console.log('OURS (from code):');
console.log(ourPayload);
console.log('');

// Save to files
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

fs.writeFileSync(
  path.join(logsDir, 'comparison-chrome-working.txt'),
  `Chrome Working Payload (from DevTools)\n\n${chromePayload}\n\n=== FORMATTED ===\n${chromePayload.split('&').map(p => decodeURIComponent(p)).join('\n')}`
);

fs.writeFileSync(
  path.join(logsDir, 'comparison-our-code.txt'),
  `Our Code Generated Payload\n\n${ourPayload}\n\n=== FORMATTED ===\n${ourPayload.split('&').map(p => decodeURIComponent(p)).join('\n')}`
);

console.log('Files saved:');
console.log('  - logs/comparison-chrome-working.txt');
console.log('  - logs/comparison-our-code.txt');
console.log('');

if (hasDifferences) {
  console.log('❌ DIFFERENCES FOUND - payloads do NOT match');
} else {
  console.log('✅ Payloads match perfectly!');
}
