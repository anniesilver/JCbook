# Precision Booking Unit Tests

This directory contains comprehensive unit tests for the precision booking fix implementation.

## Quick Start

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- detectPageType.test.js

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Suites

### Unit Tests (`tests/unit/`)

1. **detectPageType.test.js** (17 tests)
   - Tests page type detection (too_early, court_held, form_loaded, etc.)
   - Validates URL pattern matching and text content analysis
   - Performance tests (<100ms requirement)

2. **retryLogic.test.js** (16 tests)
   - Tests retry mechanism for different page types
   - Validates MAX_RETRIES enforcement
   - Tests integration with detectPageType

3. **timingCalculations.test.js** (20 tests)
   - Tests timing formula: `loadFormTime = T - (RTT/2)`
   - Validates one-way latency calculation
   - Tests across various RTT values (10ms - 1000ms)

4. **sequentialCourts.test.js** (18 tests)
   - Tests sequential court attempts (not parallel)
   - Validates court order preservation
   - Tests early exit on success

**Total:** 71 tests, all passing

## Mock Utilities (`tests/mocks/`)

### playwrightPageMock.js

Simulates Playwright Page object without launching browser.

**Example Usage:**
```javascript
const { PageStates } = require('../mocks/playwrightPageMock');

// Create pre-configured page states
const tooEarlyPage = PageStates.tooEarly();
const formLoadedPage = PageStates.formLoaded();
const courtHeldPage = PageStates.courtHeld();

// Test with mock
const result = await detectPageType(tooEarlyPage);
expect(result).toBe('too_early');
```

### timeSyncMock.js

Controls time progression and network latency measurements.

**Example Usage:**
```javascript
const { TimeSyncMock } = require('../mocks/timeSyncMock');

const timeMock = new TimeSyncMock({
  startTime: 1700049600000, // 9:00 AM
  rtt: 150 // 150ms RTT
});

const rtt = await timeMock.measureNetworkLatency();
expect(rtt).toBe(150);

await timeMock.waitUntilSynced(targetTime);
expect(timeMock.getCurrentSyncedTime()).toBe(targetTime);
```

## Test Results

See `TEST-RESULTS.md` for comprehensive test results and recommendations.

## What's Tested

✓ **Page Type Detection**
- All 6 page types correctly identified
- Fast detection (<100ms)
- Error handling for edge cases

✓ **Retry Logic**
- MAX_RETRIES = 2 enforced
- Retryable vs non-retryable errors
- Retry count tracking

✓ **Timing Calculations**
- Formula validation: T - (RTT/2)
- Works across all RTT values
- Edge case handling

✓ **Sequential Court Fallback**
- Courts tried one at a time
- Preferred order preserved
- Early exit on success

## What's NOT Tested (Requires Integration Testing)

- Full browser automation
- Actual network requests
- Form interaction steps (12 steps)
- reCAPTCHA token generation
- HTTP POST submission to real server
- Real-world 9:00 AM booking

These require integration tests or manual testing at 9:00 AM.

## Test Configuration

Tests are configured in `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"],
    "collectCoverageFrom": [
      "playwrightBooking.js",
      "timeSync.js"
    ]
  }
}
```

## Performance

All tests execute quickly:
- Average: ~65ms per test
- Total suite: ~4.6 seconds
- No external dependencies (offline testing)

## Maintenance

When updating precision booking logic:

1. **Page detection changes** → Update `detectPageType.test.js`
2. **Retry logic changes** → Update `retryLogic.test.js`
3. **Timing formula changes** → Update `timingCalculations.test.js`
4. **Court fallback changes** → Update `sequentialCourts.test.js`

## Related Documentation

- `PRECISION-BOOKING-TEST-PLAN.md`: Original test plan
- `TEST-RESULTS.md`: Detailed test results and recommendations
- `PRECISION-BOOKING-FIX-PLAN.md`: Implementation plan
- `playwrightBooking.js`: Implementation being tested
