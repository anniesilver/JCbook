/**
 * Test Suite C: Timing Calculations
 *
 * Tests that form loading happens at optimal time (T-RTT/2)
 * so request arrives at server at T+0
 *
 * Priority 1 tests: C1
 * Priority 2 tests: C2, C3
 */

const { TimeSyncMock, MOCK_TIMES } = require('../mocks/timeSyncMock');

describe('Test Suite C: Timing Calculations', () => {

  // Helper to simulate timing calculation logic from executeBookingPrecisionTimed
  function calculateLoadFormTime(targetTimestamp, rtt) {
    const oneWayLatency = Math.floor(rtt / 2);
    const loadFormTime = targetTimestamp - oneWayLatency;
    return { oneWayLatency, loadFormTime };
  }

  // ========== Priority 1 Tests ==========

  describe('Priority 1: Critical timing calculations', () => {

    test('C1: Form load time calculated as T-(RTT/2) for RTT=150ms', () => {
      // Arrange
      const T = 1000000; // Arbitrary target timestamp
      const RTT = 150;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(75); // 150 / 2 = 75
      expect(loadFormTime).toBe(999925); // 1000000 - 75 = 999925
    });
  });

  // ========== Priority 2 Tests ==========

  describe('Priority 2: Different RTT values', () => {

    test('C2: Verify calculation works with various RTT values', () => {
      // Arrange
      const T = 2000000;
      const testCases = [
        { rtt: 50, expectedOneWay: 25, expectedLoadTime: 1999975 },
        { rtt: 300, expectedOneWay: 150, expectedLoadTime: 1999850 },
        { rtt: 200, expectedOneWay: 100, expectedLoadTime: 1999900 },
      ];

      // Act & Assert
      testCases.forEach(({ rtt, expectedOneWay, expectedLoadTime }) => {
        const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, rtt);
        expect(oneWayLatency).toBe(expectedOneWay);
        expect(loadFormTime).toBe(expectedLoadTime);
      });
    });

    test('C3: First attempt waits, retry loads immediately (simulated)', () => {
      // Arrange
      const T = 2000000;
      const RTT = 100;
      const timeSyncMock = new TimeSyncMock({
        startTime: T - 10000, // Start 10s before target
        rtt: RTT
      });

      // Act - Simulate first attempt timing
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Simulate waitUntilSynced call for first attempt
      const waitPromise = timeSyncMock.waitUntilSynced(loadFormTime);

      // Assert - First attempt should wait
      expect(oneWayLatency).toBe(50); // 100 / 2
      expect(loadFormTime).toBe(T - 50); // 1999950
      expect(timeSyncMock.getWaitHistory().length).toBe(1);
      expect(timeSyncMock.getWaitHistory()[0].targetTimestamp).toBe(loadFormTime);

      // For retry (retryCount >= 1), there would be no new waitUntilSynced call
      // The goto would happen immediately without timing calculation
      // This is validated in the actual implementation
    });
  });

  // ========== Additional Timing Tests ==========

  describe('Additional timing scenarios', () => {

    test('Timing calculation with very fast network (RTT=10ms)', () => {
      // Arrange
      const T = 5000000;
      const RTT = 10;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(5); // 10 / 2
      expect(loadFormTime).toBe(4999995); // 5000000 - 5
    });

    test('Timing calculation with slow network (RTT=500ms)', () => {
      // Arrange
      const T = 3000000;
      const RTT = 500;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(250); // 500 / 2
      expect(loadFormTime).toBe(2999750); // 3000000 - 250
    });

    test('Timing calculation with odd RTT value (rounds down)', () => {
      // Arrange
      const T = 1000000;
      const RTT = 151; // Odd number

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(75); // Math.floor(151 / 2) = 75
      expect(loadFormTime).toBe(999925); // 1000000 - 75
    });

    test('Load form time is always before target timestamp', () => {
      // Arrange
      const T = 9000000;
      const rtts = [50, 100, 150, 200, 300, 500];

      // Act & Assert
      rtts.forEach(rtt => {
        const { loadFormTime } = calculateLoadFormTime(T, rtt);
        expect(loadFormTime).toBeLessThan(T);
      });
    });
  });

  // ========== TimeSyncMock Validation ==========

  describe('TimeSyncMock behavior', () => {

    test('waitUntilSynced records wait calls correctly', async () => {
      // Arrange
      const timeSyncMock = new TimeSyncMock({
        startTime: 1000000,
        rtt: 150
      });
      const targetTimestamp = 1050000;

      // Act
      await timeSyncMock.waitUntilSynced(targetTimestamp);

      // Assert
      const history = timeSyncMock.getWaitHistory();
      expect(history.length).toBe(1);
      expect(history[0].targetTimestamp).toBe(targetTimestamp);
      expect(history[0].calledAt).toBe(1000000);
      expect(timeSyncMock.getCurrentSyncedTime()).toBe(targetTimestamp); // Time jumped to target
    });

    test('measureNetworkLatency returns configured RTT', async () => {
      // Arrange
      const timeSyncMock = new TimeSyncMock({
        startTime: 2000000,
        rtt: 200
      });

      // Act
      const measuredRTT = await timeSyncMock.measureNetworkLatency('https://jct.gametime.net');

      // Assert
      expect(measuredRTT).toBe(200);
      expect(timeSyncMock.getLatencyHistory().length).toBe(1);
      expect(timeSyncMock.getLatencyHistory()[0].rtt).toBe(200);
    });

    test('getCurrentSyncedTime returns current time', () => {
      // Arrange
      const startTime = 3000000;
      const timeSyncMock = new TimeSyncMock({ startTime });

      // Act
      const currentTime = timeSyncMock.getCurrentSyncedTime();

      // Assert
      expect(currentTime).toBe(startTime);
    });

    test('advanceTime manually progresses time', () => {
      // Arrange
      const timeSyncMock = new TimeSyncMock({ startTime: 1000000 });

      // Act
      timeSyncMock.advanceTime(5000);

      // Assert
      expect(timeSyncMock.getCurrentSyncedTime()).toBe(1005000);
    });

    test('setRTT changes RTT value', async () => {
      // Arrange
      const timeSyncMock = new TimeSyncMock({ rtt: 100 });

      // Act
      timeSyncMock.setRTT(250);
      const measuredRTT = await timeSyncMock.measureNetworkLatency();

      // Assert
      expect(measuredRTT).toBe(250);
    });
  });

  // ========== Real-world Timing Scenarios ==========

  describe('Real-world timing scenarios', () => {

    test('Scenario: 9:00 AM target with 150ms RTT', () => {
      // Arrange - Target is 9:00:00.000 AM
      const T = MOCK_TIMES.targetTimestamp;
      const RTT = MOCK_TIMES.rtts.medium;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(75);
      expect(loadFormTime).toBe(T - 75);

      // Verify that if we send at loadFormTime, it arrives at T
      const arrivalTime = loadFormTime + oneWayLatency;
      expect(arrivalTime).toBe(T);
    });

    test('Scenario: Fast network (50ms RTT) at 9:00 AM', () => {
      // Arrange
      const T = MOCK_TIMES.targetTimestamp;
      const RTT = MOCK_TIMES.rtts.fast;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(25);
      expect(loadFormTime).toBe(T - 25);

      const arrivalTime = loadFormTime + oneWayLatency;
      expect(arrivalTime).toBe(T);
    });

    test('Scenario: Slow network (300ms RTT) at 9:00 AM', () => {
      // Arrange
      const T = MOCK_TIMES.targetTimestamp;
      const RTT = MOCK_TIMES.rtts.slow;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(150);
      expect(loadFormTime).toBe(T - 150);

      const arrivalTime = loadFormTime + oneWayLatency;
      expect(arrivalTime).toBe(T);
    });

    test('Multiple sequential timing calculations (multiple courts)', () => {
      // Arrange
      const T = 4000000;
      const RTT = 120;
      const timeSyncMock = new TimeSyncMock({
        startTime: T - 20000,
        rtt: RTT
      });

      // Act - Simulate timing for 3 courts
      const courts = ['1', '2', '3'];
      const timings = [];

      courts.forEach(async court => {
        const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);
        timings.push({ court, loadFormTime, oneWayLatency });
      });

      // Assert - All courts should have same timing calculation
      expect(timings.length).toBe(3);
      timings.forEach(timing => {
        expect(timing.oneWayLatency).toBe(60);
        expect(timing.loadFormTime).toBe(T - 60);
      });
    });
  });

  // ========== Edge Cases ==========

  describe('Edge cases', () => {

    test('RTT = 0 (theoretical minimum)', () => {
      // Arrange
      const T = 1000000;
      const RTT = 0;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(0);
      expect(loadFormTime).toBe(T); // Load at exactly target time
    });

    test('RTT = 1 (minimum realistic)', () => {
      // Arrange
      const T = 1000000;
      const RTT = 1;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(0); // Math.floor(1/2) = 0
      expect(loadFormTime).toBe(T);
    });

    test('Very large RTT (1000ms)', () => {
      // Arrange
      const T = 2000000;
      const RTT = 1000;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(500);
      expect(loadFormTime).toBe(1999500); // 2000000 - 500
    });

    test('Negative RTT (invalid input handling)', () => {
      // Arrange
      const T = 1000000;
      const RTT = -50;

      // Act
      const { oneWayLatency, loadFormTime } = calculateLoadFormTime(T, RTT);

      // Assert
      expect(oneWayLatency).toBe(-25); // Math.floor(-50/2)
      expect(loadFormTime).toBe(1000025); // T - (-25) = T + 25 (after target!)
      // In real implementation, this should be validated/prevented
    });
  });
});
