# Precision Booking Test Plan

**Date:** 2025-11-14
**Status:** Test Plan - Awaiting Implementation
**Related Files:**
- Implementation: `backend-server/playwrightBooking.js`
- Implementation Plan: `backend-server/PRECISION-BOOKING-FIX-PLAN.md`

---

## 1. Overview

### What We're Testing

The precision booking fix implementation consists of two major components:

1. **`detectPageType()` function** (lines 630-679): Fast page type detection using URL and text analysis
2. **`executeBookingPrecisionTimed()` function** (lines 730-1167): Timeline-based booking execution with retry logic and sequential court fallback

### Why Unit Tests Are Critical

The actual 9:00 AM booking scenario can only be tested **once per day** in production. This makes unit testing essential because:

- We cannot iterate quickly on fixes if we rely only on production testing
- Network conditions, server responses, and edge cases vary unpredictably
- We need to validate individual components in isolation before integration
- Mocking allows us to test error scenarios that are hard to reproduce in production

---

## 2. Testing Challenges

### The 9am Constraint Problem

**Challenge:** The booking window opens once per day at exactly 9:00:00.000 AM GameTime server time.

**Impact:**
- Cannot test full booking flow multiple times per day
- Cannot easily reproduce "too early" vs "too late" scenarios
- Network latency varies, making timing tests unpredictable
- Race conditions and edge cases happen randomly

**Solution:** Unit test individual components with mocked Playwright Page objects and responses, allowing unlimited testing iterations without waiting for 9am.

### What Cannot Be Unit Tested

The following require integration/manual testing:
- Actual GameTime server responses at 9:00 AM sharp
- Real network latency variations during peak load
- Browser rendering performance under time pressure
- GameTime server rate limiting or anti-bot measures
- End-to-end booking success with real payment processing

---

## 3. Unit Tests to Create

### Test Suite A: `detectPageType()` Function

**Purpose:** Verify that page type detection correctly identifies all possible page states using fast URL and text analysis.

**Mock Requirements:**
- Mock Playwright Page object with configurable `.url()` and `.textContent()` methods
- Mock page HTML/text content for different error scenarios

#### Test A1: Detect "Too Early" Error Page

**What to test:** Page with `/bookerror` redirect and countdown timer

**Mock setup:**
```
- page.url() returns: "https://jct.gametime.net/scheduling/index/bookerror/..."
- page.textContent('body') returns: "Booking Not Available\nPlease wait 5 minutes\nTime: 4:32"
```

**Expected outcome:** `detectPageType(page)` returns `'too_early'`

**Why this matters:** This is the most common scenario before 9am - must retry immediately without time calculation

---

#### Test A2: Detect "Court Held" Error Page

**What to test:** Page with error indicating another user is booking this court

**Mock setup:**
```
- page.url() returns: "https://jct.gametime.net/scheduling/index/bookerror/..."
- page.textContent('body') returns: "Booking Not Available\nAnother member is currently booking this court"
```

**Expected outcome:** `detectPageType(page)` returns `'court_held'`

**Why this matters:** Should move to next court immediately, not retry same court

---

#### Test A3: Detect Form Loaded Successfully

**What to test:** Booking form page with temp field present

**Mock setup:**
```
- page.url() returns: "https://jct.gametime.net/scheduling/index/book/sport/1/court/50/..."
- page.waitForSelector('input[name="temp"]', {timeout: 5000}) resolves successfully
```

**Expected outcome:** `detectPageType(page)` returns `'form_loaded'`

**Why this matters:** This is the success case - should proceed with all 12 booking steps

---

#### Test A4: Detect Loading Slow (Form Not Ready)

**What to test:** Form page loads but temp field not found within 5 seconds

**Mock setup:**
```
- page.url() returns: "https://jct.gametime.net/scheduling/index/book/sport/1/court/50/..."
- page.waitForSelector('input[name="temp"]', {timeout: 5000}) throws TimeoutError
```

**Expected outcome:** `detectPageType(page)` returns `'loading_slow'`

**Why this matters:** Should retry same court immediately

---

#### Test A5: Detect Network Error

**What to test:** Generic error page without recognizable error message

**Mock setup:**
```
- page.url() returns: "https://jct.gametime.net/scheduling/index/error"
- page.textContent('body') returns: "500 Internal Server Error"
```

**Expected outcome:** `detectPageType(page)` returns `'network_error'`

**Why this matters:** Should move to next court, not retry same court

---

#### Test A6: Detect Unknown Error

**What to test:** Error page with "Booking Not Available" but unrecognized message

**Mock setup:**
```
- page.url() returns: "https://jct.gametime.net/bookerror"
- page.textContent('body') returns: "Booking Not Available\nSome unexpected reason"
```

**Expected outcome:** `detectPageType(page)` returns `'unknown'`

**Why this matters:** Should retry with caution (up to MAX_RETRIES)

---

### Test Suite B: Retry Logic

**Purpose:** Verify that the retry mechanism correctly handles different page types and respects MAX_RETRIES = 2

**Mock Requirements:**
- Mock `detectPageType()` to return different values on successive calls
- Mock `page.goto()` to track how many times form is loaded
- Mock time functions to verify timing behavior

#### Test B1: Too Early Triggers Immediate Retry

**What to test:** When `detectPageType()` returns `'too_early'`, retry happens immediately without time calculation

**Mock setup:**
```
- First call to detectPageType() returns 'too_early'
- Second call to detectPageType() returns 'form_loaded'
- Track timestamps of page.goto() calls
```

**Expected outcome:**
- `page.goto()` called twice for same court
- Second call happens immediately (delta < 100ms from first call)
- `retryCount` increments from 0 to 1
- Eventually proceeds with form_loaded logic

**Why this matters:** Ensures we retry fast when we're too early, maximizing chances of success

---

#### Test B2: MAX_RETRIES = 2 Is Enforced

**What to test:** After 2 failed attempts, move to next court

**Mock setup:**
```
- detectPageType() returns 'too_early' on all calls
- Track how many times page.goto() is called for Court 1
```

**Expected outcome:**
- `page.goto()` called exactly 2 times for Court 1 (retry 0, retry 1)
- After 2 attempts, loop breaks and moves to next court
- No 3rd retry attempt

**Why this matters:** Prevents infinite retry loops, keeps booking execution moving forward

---

#### Test B3: Court Held Breaks to Next Court (No Retry)

**What to test:** When `detectPageType()` returns `'court_held'`, immediately move to next court

**Mock setup:**
```
- Courts array: ['1', '2', '3']
- For Court 1, detectPageType() returns 'court_held'
- Track which courts are attempted
```

**Expected outcome:**
- Court 1: `page.goto()` called once, then breaks
- Court 2: attempt begins immediately
- `retryCount` for Court 1 stays at 0 (no retry)

**Why this matters:** Don't waste time retrying a court held by another user

---

#### Test B4: Network Error Breaks to Next Court (No Retry)

**What to test:** When `detectPageType()` returns `'network_error'`, immediately move to next court

**Mock setup:**
```
- Courts array: ['3', '4']
- For Court 3, detectPageType() returns 'network_error'
- Track which courts are attempted
```

**Expected outcome:**
- Court 3: `page.goto()` called once, then breaks
- Court 4: attempt begins immediately
- `retryCount` for Court 3 stays at 0

**Why this matters:** Network errors unlikely to resolve on retry, move on quickly

---

#### Test B5: Loading Slow Triggers Retry

**What to test:** When `detectPageType()` returns `'loading_slow'`, retry same court

**Mock setup:**
```
- First call to detectPageType() returns 'loading_slow'
- Second call to detectPageType() returns 'form_loaded'
```

**Expected outcome:**
- Court attempted twice
- `retryCount` increments from 0 to 1
- Eventually proceeds with form_loaded logic

**Why this matters:** Slow page loads might succeed on retry

---

### Test Suite C: Timing Calculations

**Purpose:** Verify that form loading happens at optimal time (T-RTT/2) so request arrives at server at T+0

**Mock Requirements:**
- Mock `measureNetworkLatency()` to return different RTT values
- Mock `getCurrentSyncedTime()` to control time progression
- Mock `waitUntilSynced()` to track when waits happen

#### Test C1: Form Load Time Calculated as T-(RTT/2)

**What to test:** When RTT = 150ms, form should load at T-75ms

**Mock setup:**
```
- targetTimestamp T = 1000000 (arbitrary)
- measureNetworkLatency() returns 150
- Track when waitUntilSynced() is called
```

**Expected outcome:**
- oneWayLatency calculated as 150/2 = 75
- loadFormTime calculated as T - 75 = 999925
- waitUntilSynced(999925) called before first page.goto()

**Why this matters:** Ensures network latency is properly compensated

---

#### Test C2: Different RTT Values

**What to test:** Verify calculation works with various RTT values

**Test cases:**
- RTT = 50ms → oneWayLatency = 25ms → load at T-25ms
- RTT = 300ms → oneWayLatency = 150ms → load at T-150ms
- RTT = 200ms → oneWayLatency = 100ms → load at T-100ms

**Expected outcome:** Each case calculates correct loadFormTime = T - (RTT/2)

**Why this matters:** Validates formula works across different network conditions

---

#### Test C3: First Attempt Waits, Retry Loads Immediately

**What to test:** Distinguish between first attempt (calculated timing) vs retry (immediate)

**Mock setup:**
```
- T = 2000000
- RTT = 100ms
- First detectPageType() returns 'too_early'
- Second detectPageType() returns 'form_loaded'
- Track all waitUntilSynced() calls
```

**Expected outcome:**
- First attempt: waitUntilSynced(T-50) called before page.goto()
- Retry attempt (retryCount=1): page.goto() called immediately without new waitUntilSynced()

**Why this matters:** Retries should happen immediately, not wait for calculated time again

---

### Test Suite D: Form Interaction Steps

**Purpose:** Verify all 12 steps execute correctly when `pageType === 'form_loaded'`

**Mock Requirements:**
- Mock Page methods: `click()`, `selectOption()`, `$eval()`, `evaluate()`
- Mock setTimeout to control waits
- Mock form fields and reCAPTCHA

#### Test D1: All 12 Steps Execute in Order

**What to test:** When form loads, all steps run sequentially

**Mock setup:**
```
- detectPageType() returns 'form_loaded'
- Mock all page interactions to succeed
- Track which methods are called and in what order
```

**Expected outcome (in order):**
1. `page.click()` for rtype radio button
2. `setTimeout(3000)` wait
3. `page.selectOption()` for duration dropdown
4. `setTimeout(5000)` wait
5. `page.$eval()` for temp field
6. `page.$eval()` for userId field
7. `page.$eval()` for userName field
8. `page.waitForFunction()` for grecaptcha
9. `page.evaluate()` to generate token
10. `browser.close()`
11. `fetch()` for HTTP POST submission
12. Check response status/redirect

**Why this matters:** Missing any step could cause booking failure

---

#### Test D2: Wait Times Are Correct

**What to test:** Verify 3000ms and 5000ms waits are used

**Mock setup:**
- Mock setTimeout and track durations
- detectPageType() returns 'form_loaded'

**Expected outcome:**
- First wait (after rtype selection) = 3000ms
- Second wait (after duration selection) = 5000ms

**Why this matters:** Wait times ensure form updates complete on server before proceeding

---

#### Test D3: Form Data Building

**What to test:** Verify complete form data is built with all required fields

**Mock setup:**
```
- bookingType = 'doubles'
- durationHours = 1.5
- guestName = 'TestGuest'
- Mock extracted values: temp='abc123', userId='42', userName='John Doe'
- Mock token = 'mock-recaptcha-token'
```

**Expected outcome (formData contains):**
```
- duration='30' (first occurrence - slot size)
- duration='90' (second occurrence - total duration) ← DUPLICATE FIELD
- rtype='1' (doubles)
- invite_for='Singles' (always Singles even for doubles)
- players[1][user_id]='42'
- players[1][name]='John Doe'
- players[2][name]='TestGuest'
- players[2][guest]='on'
- players[2][guestof]='1'
- players[3][name]='TestGuest'
- players[3][guestof]='1'
- players[4][name]='TestGuest'
- players[4][guestof]='1'
- g-recaptcha-response='mock-recaptcha-token'
- temp='abc123'
- bookingWaiverPolicy='true'
```

**Why this matters:** Missing or incorrect fields cause booking to fail on server side

---

#### Test D4: Singles vs Doubles Configuration

**What to test:** Verify correct config for singles (1 hour) vs doubles (1.5 hours)

**Test cases:**

**Case 1: Singles**
```
Input: bookingType='singles', durationHours=1.0
Expected config:
  - duration: '60'
  - rtype: '13'
  - playerCount: 2
  - inviteFor: 'Singles'
```

**Case 2: Doubles**
```
Input: bookingType='doubles', durationHours=1.5
Expected config:
  - duration: '90'
  - rtype: '1'
  - playerCount: 4
  - inviteFor: 'Singles'
```

**Why this matters:** Wrong rtype or duration causes form submission to fail

---

#### Test D5: Guest Players Have guestof=1

**What to test:** All guest players (players 2-4 for doubles) have guestof=1

**Mock setup:**
- bookingType = 'doubles' (4 players total)
- playerCount = 4

**Expected outcome:**
```
FormData includes:
- players[2][guestof]='1'
- players[3][guestof]='1'
- players[4][guestof]='1'
```

**Why this matters:** Missing guestof field causes "invalid guest player" error

---

### Test Suite E: Sequential Court Fallback

**Purpose:** Verify courts are tried one at a time in order, with proper success/failure handling

**Mock Requirements:**
- Mock court list
- Mock different outcomes for different courts
- Track which courts are attempted and in what order

#### Test E1: Courts Tried One at a Time (Not Parallel)

**What to test:** Verify sequential execution (one browser session limitation)

**Mock setup:**
```
- Courts array: ['1', '2', '3']
- Track timestamps when each court attempt starts
```

**Expected outcome:**
- Court 1 starts at T=0
- Court 1 completes at T=X
- Court 2 starts at T=X (not T=0)
- Court 2 completes at T=Y
- Court 3 starts at T=Y (not T=0 or T=X)

**Why this matters:** Parallel attempts cause temp hold conflicts in same session

---

#### Test E2: Success on Any Court Returns Immediately

**What to test:** When any court succeeds, stop trying remaining courts

**Mock setup:**
```
- Courts array: ['5', '6', '1', '2']
- Court 5: detectPageType() returns 'court_held'
- Court 6: detectPageType() returns 'form_loaded', booking succeeds
- Track which courts are attempted
```

**Expected outcome:**
- Court 5 attempted → fails → moves to Court 6
- Court 6 attempted → succeeds → returns immediately
- Courts 1 and 2 are NEVER attempted

**Why this matters:** Don't waste time trying more courts after success

---

#### Test E3: All Courts Exhausted Returns Failure

**What to test:** When all courts fail, return comprehensive failure result

**Mock setup:**
```
- Courts array: ['1', '2']
- Court 1: detectPageType() returns 'court_held'
- Court 2: detectPageType() returns 'network_error'
```

**Expected outcome:**
```
Result object:
{
  success: false,
  error: "All courts unavailable or failed. Tried: 1, 2",
  courtsTried: ['1', '2']
}
```

**Why this matters:** Clear error messages help debugging and user feedback

---

#### Test E4: Court Order Preserved

**What to test:** Courts attempted in exact order provided (preferred court first)

**Mock setup:**
```
- Courts array: ['3', '1', '5', '2'] (user's preferred order)
- All courts fail
- Track attempt order
```

**Expected outcome:**
- Attempts happen in order: 3, then 1, then 5, then 2
- NOT in numerical order (1, 2, 3, 5)

**Why this matters:** User specifies preferred court for a reason (e.g., closest to facilities)

---

## 4. Test Structure

### Recommended Test Framework

**Jest** with Playwright mocks

**Why Jest:**
- Built-in mocking capabilities (`jest.fn()`, `jest.mock()`)
- Easy to mock ES6 modules
- Snapshot testing for complex objects
- Good async/await support

### File Organization

```
backend-server/
  tests/
    unit/
      detectPageType.test.js       # Test Suite A
      retryLogic.test.js            # Test Suite B
      timingCalculations.test.js    # Test Suite C
      formInteraction.test.js       # Test Suite D
      sequentialCourts.test.js      # Test Suite E
    mocks/
      playwrightPageMock.js         # Mock Playwright Page object
      timeSyncMock.js               # Mock time sync functions
    integration/
      fullBookingFlow.test.js       # Integration test (no 9am constraint)
```

### Mock Object Structure

**Mock Playwright Page:**
```javascript
class MockPage {
  constructor(config) {
    this._url = config.url || '';
    this._textContent = config.textContent || '';
    this._selectorResults = config.selectorResults || {};
  }

  url() {
    return this._url;
  }

  async textContent(selector, options) {
    if (this._textContent) return this._textContent;
    throw new Error('textContent not configured');
  }

  async waitForSelector(selector, options) {
    if (this._selectorResults[selector]) {
      return this._selectorResults[selector];
    }
    throw new Error(`Timeout waiting for ${selector}`);
  }

  async goto(url, options) {
    this._url = url;
    this._gotoHistory.push({ url, timestamp: Date.now() });
  }

  // ... other methods
}
```

### Test Template

```javascript
describe('detectPageType()', () => {
  test('should detect too_early page', async () => {
    // Arrange
    const mockPage = new MockPage({
      url: 'https://jct.gametime.net/scheduling/index/bookerror',
      textContent: 'Booking Not Available\nPlease wait 5 minutes\nTime: 4:32'
    });

    // Act
    const result = await detectPageType(mockPage);

    // Assert
    expect(result).toBe('too_early');
  });
});
```

---

## 5. Mock Data Requirements

### Mock Page States

#### Mock 1: Too Early Error Page
```javascript
{
  url: 'https://jct.gametime.net/scheduling/index/bookerror/sport/1/court/50',
  textContent: 'Booking Not Available\nPlease wait until the booking window opens.\nTime: 4:32\nPlease wait 5 minutes'
}
```

#### Mock 2: Court Held Error Page
```javascript
{
  url: 'https://jct.gametime.net/scheduling/index/bookerror',
  textContent: 'Booking Not Available\nAnother member is currently booking this court. Please try again in a few moments.'
}
```

#### Mock 3: Form Loaded Successfully
```javascript
{
  url: 'https://jct.gametime.net/scheduling/index/book/sport/1/court/50/date/2025-11-15/time/540',
  selectorResults: {
    'input[name="temp"]': { value: 'abc123temp456' },
    'input[name="players[1][user_id]"]': { value: '12345' },
    'input[name="players[1][name]"]': { value: 'John Doe' },
    'input[type="radio"][name="rtype"][value="13"]': {},
    'select[name="duration"]': {}
  }
}
```

#### Mock 4: Network Error Page
```javascript
{
  url: 'https://jct.gametime.net/scheduling/index/error',
  textContent: '500 Internal Server Error\nThe server encountered an unexpected condition.'
}
```

#### Mock 5: Unknown Error Page
```javascript
{
  url: 'https://jct.gametime.net/scheduling/index/bookerror',
  textContent: 'Booking Not Available\nMaintenance in progress. Please try again later.'
}
```

#### Mock 6: Loading Slow (Form Not Ready)
```javascript
{
  url: 'https://jct.gametime.net/scheduling/index/book/sport/1/court/50/date/2025-11-15/time/540',
  selectorResults: {
    // temp field intentionally missing (will timeout)
  }
}
```

### Mock Time Values

```javascript
const MOCK_TIMES = {
  targetTimestamp: 1700049600000,  // Example: 2025-11-15 09:00:00.000 GMT
  rtts: {
    fast: 50,      // 50ms RTT → 25ms one-way
    medium: 150,   // 150ms RTT → 75ms one-way
    slow: 300      // 300ms RTT → 150ms one-way
  }
};
```

### Mock reCAPTCHA Tokens

```javascript
const MOCK_RECAPTCHA_TOKEN = 'mock-recaptcha-token-03Ah8hdj3k2jd9fj3kdf9j3kd';
```

### Mock Form Submission Responses

#### Success Response
```javascript
{
  status: 302,
  headers: {
    location: '/scheduling/confirmation/id/98765'
  }
}
```

#### Failure Response (Court Unavailable)
```javascript
{
  status: 302,
  headers: {
    location: '/scheduling/index/book/sport/1/court/50?error=unavailable'
  }
}
```

---

## 6. Integration Test Strategy

### Goal
Test the full booking flow without waiting for 9am by mocking time and server responses

### Approach: Time-Shifted Testing

**Key Idea:** Run the full `executeBookingPrecisionTimed()` with mocked time functions that simulate the 9am timeline compressed into seconds.

**Mock Requirements:**
- Mock `getCurrentSyncedTime()` to return controllable time
- Mock `waitUntilSynced()` to instantly "jump" to target time
- Mock `measureNetworkLatency()` to return known RTT
- Mock Playwright browser/page with pre-configured responses

### Integration Test Scenarios

#### Integration Test 1: Happy Path - First Court Succeeds
**Scenario:** Form loads on first try, booking succeeds

**Mocked timeline:**
```
T-30s: Login succeeds
T-20s: Court availability shows courts [1, 2, 3] available
T-5s:  RTT measured = 100ms
T-50ms: Form load request sent
T+0ms: Form loads successfully
T+8s: Booking submitted (after all 12 steps)
T+9s: Confirmation received (success)
```

**Expected outcome:** Booking succeeds on Court 1, no other courts attempted

---

#### Integration Test 2: Too Early Retry Success
**Scenario:** First attempt too early, retry succeeds

**Mocked timeline:**
```
T-30s: Login succeeds
T-20s: Availability check passes
T-5s:  RTT = 150ms
T-75ms: First form load → 'too_early' page
T-74ms: Immediate retry → 'form_loaded'
T+8s: Booking submitted successfully
```

**Expected outcome:**
- First attempt gets too_early
- Immediate retry succeeds
- Only 1 retry (not MAX_RETRIES)

---

#### Integration Test 3: Court Fallback to Second Court
**Scenario:** First court held, second court succeeds

**Mocked timeline:**
```
T-30s: Login succeeds
T-20s: Courts [2, 4] available
T-5s:  RTT = 100ms
T-50ms: Court 2 form load → 'court_held'
T-49ms: Court 4 form load → 'form_loaded'
T+8s: Booking submitted successfully for Court 4
```

**Expected outcome:**
- Court 2 attempted once, moves to Court 4
- Court 4 succeeds
- Final result shows courtBooked='4'

---

#### Integration Test 4: All Courts Exhausted
**Scenario:** All courts fail for different reasons

**Mocked timeline:**
```
T-30s: Login succeeds
T-20s: Courts [1, 2, 3] available
T-5s:  RTT = 100ms
T-50ms: Court 1 → 'court_held'
T-49ms: Court 2 → 'too_early' (retry 0)
T-49ms: Court 2 → 'too_early' (retry 1)
T-49ms: Court 2 → exhausted retries
T-48ms: Court 3 → 'network_error'
```

**Expected outcome:**
```
{
  success: false,
  error: "All courts unavailable or failed. Tried: 1, 2, 3",
  courtsTried: ['1', '2', '3']
}
```

---

#### Integration Test 5: Doubles Booking (90 Minutes)
**Scenario:** Doubles booking with 4 players, 90-minute duration

**Mocked setup:**
```
bookingType: 'doubles'
durationHours: 1.5
guestName: 'Guest Player'
```

**Expected outcome:**
- rtype = '1' (doubles)
- duration = '90' in form data
- playerCount = 4
- players[2], players[3], players[4] all have guestof='1'
- Form submission includes all 4 players

---

### Integration Test Execution

**How to run:**
```bash
npm test -- --testPathPattern=integration
```

**Estimated duration:** Each integration test should complete in < 5 seconds (compressed timeline)

**Why this works:**
- Mocked time functions eliminate actual waiting
- Mocked browser responses provide instant feedback
- Tests entire logic flow without external dependencies
- Validates component interaction and state management

---

## 7. Test Coverage Goals

### Minimum Coverage Targets

- **detectPageType()**: 100% coverage (all return paths)
- **Retry logic**: 95% coverage (all retry scenarios)
- **Form interaction**: 90% coverage (all 12 steps + error handling)
- **Sequential court logic**: 95% coverage (success/failure paths)
- **Overall**: 90%+ coverage for precision booking functions

### Coverage Blind Spots (Acceptable)

These scenarios are too complex or environment-dependent for unit testing:
- Actual reCAPTCHA token generation (requires Google API)
- Real network latency during peak load
- Browser rendering race conditions
- GameTime server rate limiting behavior

These should be covered by manual/production testing.

---

## 8. Test Execution Plan

### Phase 1: Unit Tests (This Document)
1. Implement mock objects (Page, time sync, etc.)
2. Write Test Suite A (detectPageType)
3. Write Test Suite B (retry logic)
4. Write Test Suite C (timing calculations)
5. Write Test Suite D (form interaction)
6. Write Test Suite E (sequential courts)
7. Run all unit tests, achieve 90%+ coverage
8. Fix any failures

**Estimated time:** 2-3 days

### Phase 2: Integration Tests
1. Create time-shifted mock framework
2. Write 5 integration test scenarios (outlined in section 6)
3. Run integration tests
4. Fix any failures

**Estimated time:** 1-2 days

### Phase 3: Manual Testing (Awaiting Real 9am Booking)
1. Schedule test booking for tomorrow at 9:00 AM
2. Run `executeBookingPrecisionTimed()` in production
3. Monitor logs for each phase
4. Verify success or analyze failure
5. Iterate if needed

**Estimated time:** 1 day per iteration (limited by 9am constraint)

---

## 9. Success Criteria

### Unit Tests Pass Criteria
- All test suites (A-E) pass with 0 failures
- Code coverage >= 90% for precision booking functions
- No test takes longer than 100ms (fast mocks)
- All edge cases documented and tested

### Integration Tests Pass Criteria
- All 5 integration scenarios pass
- Mocked timeline executes in < 5 seconds per test
- State transitions logged clearly
- Error handling validated

### Production Test Pass Criteria
- Booking succeeds at 9:00 AM within first 2 attempts
- Form loads at/after 9:00:00.000 (not before)
- Logs show correct page type detection
- Retry logic works as expected if too_early
- Court fallback works if preferred court unavailable

---

## 10. Implementation Notes

### DO NOT Write Test Code Yet

This document is a **test plan only**. The next steps are:

1. **User reviews this plan** and provides feedback
2. **User approves or requests modifications**
3. **Then** test code is implemented based on approved plan

### Questions for User (Before Implementation)

1. **Test framework preference:** Jest, Mocha, or other?
2. **Mock library preference:** Jest built-in, Sinon, or manual mocks?
3. **Coverage tool:** Jest coverage, NYC/Istanbul, or other?
4. **Test file location:** `backend-server/tests/` or different structure?
5. **CI/CD integration:** Should tests run on git pre-commit hook?
6. **Timeout values:** Should unit tests have strict timeout limits (e.g., 100ms)?

### Dependencies to Install (After Approval)

```bash
npm install --save-dev jest @types/jest
```

Or if using Mocha:
```bash
npm install --save-dev mocha chai sinon
```

---

## 11. Appendix: Test Priority Ranking

If time is limited, implement tests in this priority order:

### Priority 1 (Critical - Must Have)
- Test A1, A2, A3 (detectPageType core cases)
- Test B1, B2 (retry logic basics)
- Test C1 (timing calculation)
- Test D1, D3 (form steps + form data)
- Integration Test 1 (happy path)

### Priority 2 (High - Should Have)
- Test A4, A5, A6 (detectPageType edge cases)
- Test B3, B4, B5 (retry behaviors)
- Test C2, C3 (timing edge cases)
- Test D4, D5 (singles/doubles + guest players)
- Integration Test 2, 3 (retry + fallback)

### Priority 3 (Medium - Nice to Have)
- Test E1, E2, E3, E4 (sequential court logic)
- Integration Test 4, 5 (all courts fail, doubles)

---

**End of Test Plan**

**Next Step:** User review and approval before test implementation begins.
