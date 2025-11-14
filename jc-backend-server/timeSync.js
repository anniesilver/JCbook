/**
 * Time Synchronization with GameTime Server
 *
 * Syncs local PC clock with GameTime server to ensure precise timing
 * Only needed for precision-timed bookings (>6 days out)
 */

const { formatInGameTimeZone, GAMETIME_TIMEZONE } = require('./bookingWindowCalculator');

// Server time offset in milliseconds (GameTime server time - Local time)
let serverTimeOffset = 0;

// Last sync timestamp
let lastSyncTime = null;

/**
 * Sync time with GameTime server via HTTP HEAD request
 *
 * @returns {Promise<Object>} Sync result with offset and timezone info
 */
async function syncWithGameTimeServer() {
  console.log('[TimeSync] Syncing with GameTime server...');

  try {
    const localBefore = Date.now();

    const response = await fetch('https://jct.gametime.net', {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const localAfter = Date.now();
    const roundTripTime = localAfter - localBefore;

    // Parse server time from Date header
    const serverTimeString = response.headers.get('date');
    if (!serverTimeString) {
      throw new Error('No Date header in response');
    }

    const serverTime = new Date(serverTimeString).getTime();

    // Adjust for round-trip (assume symmetric network delay)
    const estimatedServerTime = serverTime + (roundTripTime / 2);

    // Calculate offset: GameTime server time - Local PC time
    const newOffset = estimatedServerTime - localAfter;

    // Update stored offset
    const previousOffset = serverTimeOffset;
    serverTimeOffset = newOffset;
    lastSyncTime = localAfter;

    const driftMs = Math.abs(newOffset - previousOffset);

    console.log('[TimeSync] ========================================');
    console.log('[TimeSync] Sync completed successfully');
    console.log('[TimeSync] ========================================');
    console.log(`[TimeSync] Local time:       ${new Date(localAfter).toISOString()}`);
    console.log(`[TimeSync] GameTime server:  ${new Date(estimatedServerTime).toISOString()}`);
    console.log(`[TimeSync] Offset:           ${newOffset}ms`);
    console.log(`[TimeSync] Round trip time:  ${roundTripTime}ms`);
    if (previousOffset !== 0) {
      console.log(`[TimeSync] Clock drift:      ${driftMs}ms since last sync`);
    }
    console.log(`[TimeSync] GameTime TZ:      ${formatInGameTimeZone(estimatedServerTime)}`);
    console.log('[TimeSync] ========================================');

    return {
      success: true,
      offset: serverTimeOffset,
      timezone: GAMETIME_TIMEZONE,
      roundTripTime: roundTripTime,
      drift: driftMs
    };

  } catch (error) {
    console.error('[TimeSync] Failed to sync with server:', error.message);
    console.error('[TimeSync] Will use local time (may be inaccurate!)');

    return {
      success: false,
      error: error.message,
      offset: serverTimeOffset // Use previous offset if available
    };
  }
}

/**
 * Get current time synced with GameTime server
 *
 * @returns {number} Current timestamp adjusted for server offset
 */
function getCurrentSyncedTime() {
  return Date.now() + serverTimeOffset;
}

/**
 * Get time sync status
 *
 * @returns {Object} Status information
 */
function getTimeSyncStatus() {
  return {
    isSynced: serverTimeOffset !== 0,
    offset: serverTimeOffset,
    lastSyncTime: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
    timeSinceLastSync: lastSyncTime ? Date.now() - lastSyncTime : null
  };
}

/**
 * Check if time sync is fresh (less than 10 minutes old)
 *
 * @returns {boolean} True if sync is fresh
 */
function isTimeSyncFresh() {
  if (!lastSyncTime) return false;

  const timeSinceSync = Date.now() - lastSyncTime;
  const TEN_MINUTES = 10 * 60 * 1000;

  return timeSinceSync < TEN_MINUTES;
}

/**
 * Measure network latency to GameTime server
 * Takes median of 3 measurements for reliability
 *
 * @returns {Promise<number>} Network round-trip time in milliseconds
 */
async function measureNetworkLatency() {
  console.log('[TimeSync] Measuring network latency to GameTime server...');

  const measurements = [];

  for (let i = 0; i < 3; i++) {
    const start = Date.now();

    try {
      await fetch('https://jct.gametime.net', {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const rtt = Date.now() - start;
      measurements.push(rtt);
      console.log(`[TimeSync] Measurement ${i + 1}/3: ${rtt}ms`);

      // Small delay between measurements
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`[TimeSync] Latency measurement ${i + 1} failed:`, error.message);
      measurements.push(150); // Fallback to conservative estimate
    }
  }

  // Sort and take median
  measurements.sort((a, b) => a - b);
  const median = measurements[1];

  console.log('[TimeSync] ========================================');
  console.log(`[TimeSync] Network latency measurements: ${measurements.join('ms, ')}ms`);
  console.log(`[TimeSync] Median RTT: ${median}ms`);
  console.log('[TimeSync] ========================================');

  return median;
}

/**
 * Reset time sync (for testing purposes)
 */
function resetTimeSync() {
  serverTimeOffset = 0;
  lastSyncTime = null;
  console.log('[TimeSync] Time sync reset');
}

module.exports = {
  syncWithGameTimeServer,
  getCurrentSyncedTime,
  getTimeSyncStatus,
  isTimeSyncFresh,
  measureNetworkLatency,
  resetTimeSync
};
