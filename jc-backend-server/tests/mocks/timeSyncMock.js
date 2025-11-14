/**
 * Mock time sync functions for testing
 * Allows controlling time progression and network latency measurements
 */

class TimeSyncMock {
  constructor(config = {}) {
    this.currentTime = config.startTime || 1700049600000; // Default: 2025-11-15 09:00:00.000 GMT
    this.rtt = config.rtt || 150; // Default RTT: 150ms
    this.waitCalls = [];
    this.latencyMeasurements = [];
  }

  /**
   * Mock getCurrentSyncedTime
   * Returns controllable current time
   */
  getCurrentSyncedTime() {
    return this.currentTime;
  }

  /**
   * Mock measureNetworkLatency
   * Returns pre-configured RTT value
   */
  async measureNetworkLatency(url) {
    this.latencyMeasurements.push({
      url,
      timestamp: this.currentTime,
      rtt: this.rtt
    });

    // Simulate measurement delay
    await new Promise(resolve => setTimeout(resolve, 5));

    return this.rtt;
  }

  /**
   * Mock waitUntilSynced
   * Records wait calls and instantly "jumps" to target time
   */
  async waitUntilSynced(targetTimestamp) {
    this.waitCalls.push({
      targetTimestamp,
      calledAt: this.currentTime,
      timestamp: Date.now()
    });

    // Calculate how long we would have waited
    const waitTime = targetTimestamp - this.currentTime;

    if (waitTime > 0) {
      // "Jump" to target time
      this.currentTime = targetTimestamp;
    }

    // Simulate tiny delay for async behavior
    await new Promise(resolve => setTimeout(resolve, 1));

    return true;
  }

  /**
   * Test helper: Manually advance time
   */
  advanceTime(ms) {
    this.currentTime += ms;
  }

  /**
   * Test helper: Set current time
   */
  setCurrentTime(timestamp) {
    this.currentTime = timestamp;
  }

  /**
   * Test helper: Set RTT value
   */
  setRTT(rtt) {
    this.rtt = rtt;
  }

  /**
   * Test helper: Get wait history
   */
  getWaitHistory() {
    return this.waitCalls;
  }

  /**
   * Test helper: Get latency measurement history
   */
  getLatencyHistory() {
    return this.latencyMeasurements;
  }

  /**
   * Test helper: Reset state
   */
  reset() {
    this.waitCalls = [];
    this.latencyMeasurements = [];
  }
}

/**
 * Mock time values for common test scenarios
 */
const MOCK_TIMES = {
  targetTimestamp: 1700049600000, // 2025-11-15 09:00:00.000 GMT
  rtts: {
    fast: 50,      // 50ms RTT → 25ms one-way
    medium: 150,   // 150ms RTT → 75ms one-way
    slow: 300      // 300ms RTT → 150ms one-way
  }
};

/**
 * Create mock fetch for HTTP POST submission tests
 */
function createMockFetch(responses = {}) {
  const fetchCalls = [];

  const mockFetch = async (url, options = {}) => {
    fetchCalls.push({
      url,
      options,
      timestamp: Date.now()
    });

    // Return configured response or default success
    const response = responses[url] || {
      status: 302,
      headers: {
        get: (key) => {
          if (key.toLowerCase() === 'location') {
            return '/scheduling/confirmation/id/98765';
          }
          return null;
        }
      },
      ok: true
    };

    return response;
  };

  mockFetch.getCalls = () => fetchCalls;
  mockFetch.reset = () => { fetchCalls.length = 0; };

  return mockFetch;
}

module.exports = {
  TimeSyncMock,
  MOCK_TIMES,
  createMockFetch
};
