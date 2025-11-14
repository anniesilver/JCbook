# Precision Booking Fix - Implementation Plan

**Date:** 2025-11-14
**Status:** IMPLEMENTED - Ready for Testing
**Branch:** dev/backend-server

---

## Problem Statement

Current precision booking implementation fails because it attempts to load the booking form at T-15s (before 9:00 AM). GameTime redirects to a "Booking Not Available" error page with a countdown timer when accessed before 9am. The code then times out waiting for `input[name="temp"]` which doesn't exist on the error page.

**Current Error:**
```
[PlaywrightBooking] Phase 3: Loading Booking Form
[Precision] T-15s: Loading booking form for Court 1...
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded
  waiting for selector "input[name="temp"]"
```

---

## Root Cause Analysis

1. **Form Loading Too Early**: Loading booking form at T-15s (8:59:45 AM) triggers redirect to error page
2. **Error Page Detection Failure**: Code doesn't detect the redirect, just times out waiting for form elements
3. **No Retry Logic**: Single attempt per court, no retry mechanism for "too early" scenario
4. **Single Session Limitation**: Cannot load multiple booking forms in one browser session (temp hold conflict)

---

## Key Discoveries

1. **Error page appears before 9am** with countdown timer showing time until booking opens
2. **5-minute temp hold window**: Once form loads successfully (at/after 9am), we have 5 full minutes to complete everything
3. **Single session constraint**: Cannot load multiple forms in one session due to temp hold conflicts
4. **Strategy paradigm shift**: Race to LOAD form at 9am (not submit at 9am), then complete leisurely within 5-minute window

---

## Solution Strategy

### New Approach: Race to Load Form at 9am

**OLD Strategy (BROKEN):**
- Load form at T-15s (before 9am) → Redirects to error
- Extract fields and wait
- Submit at T-0 → Never gets here

**NEW Strategy (FIXED):**
- Wait until optimal time to load form
- Race to have form load request ARRIVE at server at T+0 (exactly 9:00:00.000 AM)
- Account for network latency (send at T-RTT/2 so request arrives at T+0)
- If "too early", retry immediately
- Once form loads successfully, have 5 minutes to complete all steps leisurely
- Sequential court fallback (try one court at a time)

---

## Time Synchronization Strategy

**Use HTTP HEAD requests (NOT countdown timer)**

The countdown timer is for human users and shows rounded time (minutes:seconds). The HTTP `Date` header provides exact server timestamp in milliseconds.

### Sync Timeline (Already Implemented in server.js)

- **T-10min**: `syncWithGameTimeServer()` via HTTP HEAD - Initial sync
- **T-2min**: `syncWithGameTimeServer()` via HTTP HEAD - Final precision sync
- **T-5s**: `measureNetworkLatency()` - Measure RTT with 3 HEAD requests, take median

### Why HTTP HEAD is More Accurate

1. `Date` header shows exact timestamp when server sent response (ms precision)
2. Countdown timer is rounded for display (not ms-sensitive)
3. Countdown updates via client-side JavaScript (drifts from actual server time)
4. Already implemented and tested in `timeSync.js`

**Countdown Timer Usage**: Only as visual indicator that we're on "too early" error page, NOT for time sync

---

## Network Latency Compensation

### Problem
If we load the form at T+0, by the time the request reaches the server it's already past 9am. We need to send the request EARLY so it ARRIVES at T+0.

### Solution
**Send form load request at T-(RTT/2)**

- Measure RTT at T-5s (e.g., 150ms)
- One-way latency = RTT/2 (e.g., 75ms)
- Send form load request at T-75ms
- Request travels for 75ms → Arrives at server at T+0 (exactly 9:00:00.000 AM)
- Server processes and responds
- Response arrives back at browser around T+75ms

**Example Timeline:**
```
T-5s:     Measure RTT = 150ms → one-way = 75ms
T-75ms:   Send GET request to load booking form
T+0ms:    Request ARRIVES at GameTime server (9:00:00.000 AM)
T+75ms:   Response arrives back at browser
          → Form loads successfully OR error page loads
```

---

## Implementation Details

### 1. Add `detectPageType()` Function

**Purpose**: Fast detection of page type using redirect URL

**Why URL check instead of element waiting**:
- Checking URL is instant
- Waiting for elements can timeout (slow and error-prone)
- User correction: "maybe it's faster to check if we are redirect to another error page instead of waiting for elements?"

**Detection Logic:**
1. Check if URL contains `/bookerror` or `/error` (fast redirect detection)
2. If error page and contains “Booking Not Available”，  read text to distinguish error types:
   - "Please wait " and "Time" → `too_early`
   - "Another member is currently booking this court" → `court_held`
   - Other text → `not recongnized`  → `unknown`
3. If not error page, check for `input[name="temp"]` element:
   - Exists → `form_loaded`
   - Missing → `loading_slow`

**Return Values:**
- `'form_loaded'` - Booking form loaded successfully, proceed with booking
- `'too_early'` - Error page with countdown, retry immediately
- `'court_held'` - Court already held by someone else, try next court
- `'network_error'` - Network or server error, try next court
- `'unknown'` - Unrecognized page state,try next court
- `'loading_slow'` - Loading page but too slow, retry immediately



---

### 2. Modified Timeline for `executeBookingPrecisionTimed()`

**Current Timeline (BROKEN):**
```
T-30s:  Login + verify session
T-20s:  Check court availability
T-15s:  Load booking form for first court → FAILS, redirects to error
T-RTT:  Generate reCAPTCHA token → Never gets here (timeout)
T-0:    Submit → Never happens
```

**New Timeline (FIXED):**
```
T-30s:      Login + verify session
T-20s:      Check court availability (KEEP THIS - user correction)
T-5s:       Measure network latency (RTT)
            Get cookies (needed for all submissions)

FOR EACH COURT (sequential, one at a time):
  First Attempt:
    T-(RTT/2):  Send form load request
                (Request arrives at server at T+0)
    T+(~RTT/2): Response arrives, detect page type

    IF form_loaded:
      → Have 5 minutes to complete everything leisurely:
        1. Select booking type radio button (Singles/Doubles)
        2. Wait for form to update
        3. Select duration dropdown (60 or 90 minutes)
        4. Wait for temp hold to update on server
        5. Extract form fields (temp, userId, userName)
        6. Wait for reCAPTCHA to be ready
        7. Generate FRESH reCAPTCHA token
        8. Close browser
        9. Submit via HTTP POST
        10. Check result

      IF success → DONE!
      IF failed → Try next court

    ELSE IF too_early:
      → Retry same court immediately (no time calculation)
      → Loop back to "Send form load request"

    ELSE IF court_held:
      → Try next court

    ELSE IF network_error:
      → Try next court

    ELSE IF loading_slow:
      → Retry 

    ELSE unknown:
      → Retry
  

All courts exhausted:
  → Return failure
```

---

### 3. Retry Logic and Sequential Court Fallback

**Key Constraint**: Cannot load multiple booking forms in one browser session

**Why?** Each form load creates a temporary hold on the server. Loading multiple forms in the same session causes temp hold conflicts.

**Solution**: Try courts sequentially, one at a time

**Retry Loop Structure:**
```
FOR each court in courtsToAttempt:
  retryCount = 0
  MAX_RETRIES = 2

  WHILE retryCount < MAX_RETRIES:

    IF retryCount == 0:
      # First attempt - calculate optimal timing
      loadFormTime = T - (RTT / 2)
      waitUntilSynced(loadFormTime)
    ELSE:
      # Retry - load immediately, no waiting

    page.goto(bookingFormUrl)
    pageType = detectPageType(page)

    HANDLE pageType:
      - form_loaded: Complete booking, return or try next court
      - too_early: retryCount++, continue (retry same court)
      - court_held: break (move to next court)
      - network_error: break (move to next court)
      - unknown: retryCount++, continue if under limit
      - loading_slow: retryCount++, continue if under limit

All courts failed → return failure
```

---

### 4. All Steps When Form Loads Successfully

**Critical**: Don't skip any steps from the old working version

When `pageType === 'form_loaded'`, execute ALL these steps in order:

1. **Get booking configuration** (singles vs doubles)
2. **Select booking type radio button** (Singles: rtype=13, Doubles: rtype=1)
3. **Wait 3000ms** for form to update
4. **Select duration dropdown** (60 or 90 minutes)
5. **Wait 5000ms** for temp hold update on server (CRITICAL!)
6. **Extract form fields** (temp, userId, userName)
7. **Wait for reCAPTCHA to be ready**
8. **Generate FRESH reCAPTCHA token**
9. **Close browser** (already have cookies)
10. **Build complete form data** with all fields:
    - Edit, register, temp, reCAPTCHA token
    - Duration (DUPLICATE FIELD - both 30 and 60/90)
    - Court, date, time, sport
    - Booking type (rtype), invite_for
    - Player 1 (registered user)
    - Guest players (with guestof=1 for all)
    - Payee, waiver
11. **Submit via HTTP POST** with proper headers
12. **Check result** (redirect to /confirmation = success), and update database 

**Important Notes:**
- Duration field appears TWICE in form data (slot size 30, total duration 60/90)
- All guest players need `guestof=1` field
- `invite_for` is always 'Singles' (even for doubles)
- Wait times (in ms) could be longer than old version because we are not racing once we have loaded the booking page

---

## Summary of User Corrections Applied

1. ✅ **Keep availability check** at T-20s after login
   - User: "I was wrong about check availability, we still do that after login, before racing for booking form page loading."

2. ✅ **Use redirect detection** (check URL, not wait for elements)
   - User: "maybe it's faster to check if we are redirect to another error page instead of waiting for elements?"

3. ✅ **Immediate retry on "too early"** (no time calculation)
   - User: "don't calculate time any more, just try again right away"

4. ✅ **Separate network errors** from "no slots available"
   - User: "this should be something else, such as network error"

5. ✅ **Keep all key steps** from old version when form loads
   - User: "if pageType == 'form_loaded', you should do every step as old version did, don't carelessly missed any key step, it's a little bit complex."

6. ✅ **Account for network latency** when racing to load form
   - User: "the race to LOAD need consider the time needed from sending query to server got the query, so loading query should not be T+0"

7. ✅ **Sequential court fallback** (one session limitation)
   - User: "I have confirmed that, with one session, you can not load 2 different booking form page"

8. ✅ **Keep HTTP HEAD time sync** (more accurate than countdown)
   - User: "i think HTTP HEAD is more accurate because it shows the time when server send out the response data, the timer in error page is for normal user, so it's not ms sensitive"

---

## Files to Modify

### `backend-server/playwrightBooking.js`

**Changes:**
1. Add `detectPageType()` function (new function)
2. Modify `executeBookingPrecisionTimed()` function:
   - Remove old T-15s form loading code
   - Add network latency calculation for form load timing
   - Add retry loop with smart page detection
   - Add sequential court fallback logic
   - Keep all existing form interaction steps when form loads successfully

**Estimated lines:** ~643-1100 (function `executeBookingPrecisionTimed`)

---

## Testing Plan

### Test 1: Verify form loads at/after 9am
- Schedule booking for tomorrow at 9:00 AM
- Run server with precision mode
- Check logs: form should NOT load before 9am
- Verify: form loads at/after 9am

### Test 2: Verify retry logic
- Manually set target time to 9:00 AM
- Run booking at 8:59:50 AM
- Should hit "too early" page multiple times
- Should retry immediately without time calculation
- Should succeed once 9am arrives

### Test 3: Verify court fallback
- Create booking with multiple courts (preferred + alternates)
- Verify courts are tried sequentially (not parallel)
- Verify proper error handling for each court

### Test 4: Verify doubles booking
- Create doubles booking (1.5 hours, 4 players)
- Verify correct configuration (rtype, duration, player fields)
- Verify booking succeeds with 90-minute duration

---

## Success Criteria

- ✅ Form loading happens at/after 9am (not before)
- ✅ Retry logic works for "too early" scenario
- ✅ Smart page detection using redirect URL
- ✅ Network latency properly compensated (T-RTT/2 sending)
- ✅ All form steps executed correctly when form loads
- ✅ Sequential court fallback works
- ✅ Booking succeeds within 5-minute temp hold window
- ✅ Both singles and doubles bookings work

---

## Implementation Checklist

- [x] Create `detectPageType()` function
- [x] Rewrite court loop in `executeBookingPrecisionTimed()`
- [x] Add network latency compensation for form load timing
- [x] Add retry logic with max 2 attempts per court
- [x] Add smart page detection after each form load
- [x] Keep all existing form steps when `form_loaded`
- [ ] Test with real booking
- [ ] Commit changes (staged, waiting for testing approval)
- [ ] Merge to main
- [ ] Push to remote

---

## Notes

- Existing time sync code in `server.js` and `timeSync.js` remains unchanged
- Doubles booking configuration in `getBookingConfig()` remains unchanged
- Court mapping in `COURT_ID_MAPPING` remains unchanged
- Only `executeBookingPrecisionTimed()` function needs major changes

---

## Implementation Summary

**Implemented:** 2025-11-14

### Changes Made to `backend-server/playwrightBooking.js`:

1. **Added `detectPageType(page)` function** (lines 630-679):
   - Fast redirect detection using URL checking (`/bookerror` or `/error`)
   - Distinguishes error types by reading page text:
     - "Please wait" + "Time" = `'too_early'`
     - "Another member is currently booking this court" = `'court_held'`
     - Other = `'unknown'` or `'network_error'`
   - If not error page, checks for `input[name="temp"]`:
     - Found = `'form_loaded'`
     - Not found = `'loading_slow'`

2. **Rewrote `executeBookingPrecisionTimed()` function** (lines 730-1167):
   - **Removed T-15s form loading phase** (this was causing the bug)
   - **New timeline:**
     - T-30s: Login + verify session
     - T-20s: Check court availability (kept per user correction)
     - T-5s: Measure RTT + get cookies
   - **Sequential court loop with retry logic:**
     - MAX_RETRIES = 2 per court
     - First attempt: Load form at T-(RTT/2) to arrive at server at T+0
     - Detect page type using new `detectPageType()` function
     - Handle each page type:
       - `form_loaded`: Execute all 12 booking steps with 3000ms and 5000ms waits
       - `too_early`: Retry same court immediately (no time calculation)
       - `court_held`: Move to next court
       - `network_error`: Move to next court
       - `loading_slow`: Retry same court
       - `unknown`: Retry same court
   - **All 12 form interaction steps when form_loaded:**
     1. Select booking type radio button (rtype)
     2. Wait 3000ms for form update
     3. Select duration dropdown
     4. Wait 5000ms for temp hold update (increased from 2000ms)
     5. Extract temp, userId, userName
     6. Wait for reCAPTCHA ready
     7. Generate fresh reCAPTCHA token
     8. Close browser (cookies already captured)
     9. Build complete form data (with duplicate duration field)
     10. Submit via HTTP POST
     11. Check result
     12. Update database (if success)

### Key Improvements:

- **No more premature form loading**: Form loads at/after 9am, not before
- **Smart error handling**: Detects and handles different error scenarios appropriately
- **Network latency compensation**: Sends form load request at T-(RTT/2) so it arrives at T+0
- **Retry logic**: Up to 2 attempts per court for transient errors
- **Sequential processing**: One court at a time to avoid temp hold conflicts
- **Longer waits**: 3000ms and 5000ms waits ensure form updates properly
- **All steps preserved**: No key steps were removed from the original working version

### Files Modified:

- `backend-server/playwrightBooking.js` (added function + rewrote function)
- `backend-server/PRECISION-BOOKING-FIX-PLAN.md` (updated status + checklist)

### Changes Staged:

```bash
git diff --staged
# Shows ~520 lines changed in playwrightBooking.js
```

---

**Status**: IMPLEMENTATION COMPLETE - Staged and ready for testing

**Next Step**: Test with real booking, then commit if successful
