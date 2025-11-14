/**
 * Check user_credentials records and their associated bookings
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCredentials() {
  console.log('========================================');
  console.log('Checking user_credentials records');
  console.log('========================================');
  console.log('');

  // Get all credentials
  const { data: allCreds } = await supabase
    .from('user_credentials')
    .select('*');

  console.log(`Found ${allCreds.length} credential record(s):`);
  console.log('');

  for (const cred of allCreds) {
    console.log(`Username: ${cred.gametime_username}`);
    console.log(`  user_id: ${cred.user_id}`);
    console.log(`  id: ${cred.id}`);

    // Count bookings for this user_id
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, auto_book_status')
      .eq('user_id', cred.user_id);

    console.log(`  Bookings: ${bookings.length}`);

    if (bookings.length > 0) {
      const pending = bookings.filter(b => b.status === 'pending').length;
      const confirmed = bookings.filter(b => b.status === 'confirmed').length;
      console.log(`    - Pending: ${pending}`);
      console.log(`    - Confirmed: ${confirmed}`);
    }
    console.log('');
  }

  // Find bookings without matching credentials
  console.log('Checking for orphaned bookings (no matching credentials)...');
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('user_id');

  const credUserIds = new Set(allCreds.map(c => c.user_id));
  const bookingUserIds = new Set(allBookings.map(b => b.user_id));

  const orphanedUserIds = [...bookingUserIds].filter(id => !credUserIds.has(id));

  if (orphanedUserIds.length > 0) {
    console.log(`Found ${orphanedUserIds.length} user_id(s) with bookings but NO credentials:`);
    for (const userId of orphanedUserIds) {
      const count = allBookings.filter(b => b.user_id === userId).length;
      console.log(`  - ${userId}: ${count} booking(s)`);
    }
  } else {
    console.log('No orphaned bookings found.');
  }

  console.log('');
  console.log('========================================');
}

checkCredentials().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
