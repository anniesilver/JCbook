# Doubles Booking Implementation Summary

**Date:** 2025-11-11
**Status:** ✅ Completed and Working
**Branch:** main
**Commits:** e601578..6efd3b2 (5 commits)

## Overview

Successfully implemented doubles booking support for the JC Court Booking automation system. The system now supports both singles (1 hour, 2 players) and doubles (1.5 hours, 4 players) bookings through both immediate and precision-timed booking modes.

## Feature Specifications

### Singles Booking
- **Duration:** 60 minutes (1 hour)
- **Players:** 2 (registered user + 1 guest)
- **Form Fields:**
  - `rtype=13`
  - `duration=60`
  - `invite_for=Singles`
  - `playerCount=2`

### Doubles Booking
- **Duration:** 90 minutes (1.5 hours)
- **Players:** 4 (registered user + 3 guests)
- **Form Fields:**
  - `rtype=1`
  - `duration=90`
  - `invite_for=Singles` (quirk: stays as "Singles" even for doubles)
  - `playerCount=4`
  - All guest players require `guestof=1` field

## Implementation Details

### Code Changes

#### 1. Dynamic Configuration Function (`playwrightBooking.js:30-46`)

Added `getBookingConfig()` function to dynamically determine booking parameters:

```javascript
function getBookingConfig(bookingType, durationHours) {
  if (bookingType === 'doubles' || durationHours === 1.5) {
    return {
      duration: '90',
      rtype: '1',
      inviteFor: 'Singles',
      playerCount: 4
    };
  }
  return {
    duration: '60',
    rtype: '13',
    inviteFor: 'Singles',
    playerCount: 2
  };
}
```

#### 2. Updated Function Signatures

Modified booking functions to accept `bookingType` and `durationHours` parameters:
- `tryBookCourt()`
- `executeBooking()`
- `executeBookingPrecisionTimed()`

#### 3. Form Interaction Sequence (`playwrightBooking.js:253-286, 779-812`)

**Critical Discovery:** GameTime's form requires specific interaction sequence:

1. **Click Singles/Doubles radio button** (`rtype` value)
2. **Wait 500ms** for form to update
3. **Select duration from dropdown** (60 or 90)
4. **Wait 2 seconds** for server to update temp hold
5. **Extract temp field** (now correctly tied to booking type and duration)

```javascript
// Step 1: Click radio button
const rtypeSelector = `input[type="radio"][name="rtype"][value="${config.rtype}"]`;
await page.click(rtypeSelector);

// Step 2: Wait for form update
await new Promise(r => setTimeout(r, 500));

// Step 3: Select duration
await page.selectOption('select[name="duration"]', config.duration);

// Step 4: Wait for temp hold update
await new Promise(r => setTimeout(r, 2000));

// Step 5: Extract temp field
temp = await page.$eval('input[name="temp"]', el => el.value);
```

#### 4. Player Field Generation (`playwrightBooking.js:310-315`)

Dynamic player field generation based on `playerCount`:

```javascript
for (let i = 2; i <= config.playerCount; i++) {
  formData.append(`players[${i}][user_id]`, '');
  formData.append(`players[${i}][name]`, guestName);
  formData.append(`players[${i}][guest]`, 'on');
  formData.append(`players[${i}][guestof]`, '1');  // All guests need this
}
```

## Problems Encountered and Solutions

### Problem 1: Duration Mismatch
**Symptom:** Doubles bookings created 1-hour slots instead of 1.5-hour slots

**Root Cause:** GameTime's temporary hold system
- Form load creates temp reservation (defaults to 1 hour for singles)
- `temp` field contains ID tied to this specific duration
- Our code extracted temp (1 hour) then sent `duration=90` → mismatch!

**Solution:** Change duration dropdown BEFORE extracting temp field, triggering JavaScript to update temp hold on server

**Commits:**
- `bd0f7c7` - Added duration dropdown interaction before temp extraction

### Problem 2: Duration Dropdown Timeout
**Symptom:** `page.selectOption: Timeout 30000ms exceeded`

**Root Cause:** Duration dropdown is disabled until booking type radio button is clicked

**Solution:** Click Singles/Doubles radio button FIRST, then select duration

**Commits:**
- `6efd3b2` - Added radio button selection before duration dropdown

### Problem 3: Missing guestof Field
**Symptom:** Booking submission rejected by server

**Root Cause:** Only added `guestof=1` to player[2], but doubles needs it for players[2], [3], and [4]

**Solution:** Add `guestof=1` to ALL guest players in loop

**Commits:**
- `542e917` - Fixed guestof field for all guest players

### Problem 4: Incorrect rtype Value
**Symptom:** Initial implementation used wrong rtype value

**Root Cause:** Analyzed failed test log instead of working payload from Chrome DevTools

**Solution:** Used real working payload captured from Chrome to determine `rtype=1` for doubles

**Commits:**
- `99fc50b` - Corrected rtype (note: commit message says 13, but was later corrected to 1)

## Technical Details: GameTime Temp Hold System

### How It Works

1. **Form Load:** GameTime creates temporary reservation on server
   - Default: Singles, 1 hour
   - Display message: "Your temporary booking will be held for 5:00 minutes"

2. **Temp Field:** Hidden input `<input name="temp" id="tempId" value="7033" />`
   - Contains ID of temporary reservation
   - ID is tied to specific booking type AND duration on server

3. **Form Interaction:** JavaScript event handlers on radio buttons and duration dropdown
   - When user changes booking type or duration
   - JavaScript makes AJAX call to update temp hold on server
   - Server updates the temporary reservation to new type/duration
   - Temp ID remains same but now tied to new settings

4. **Submission:** Form submits with temp ID
   - Server validates temp ID matches submitted duration/type
   - If mismatch: booking rejected or uses wrong duration
   - If match: booking succeeds

### Why Manual Form Interaction Required

Cannot simply POST with different duration because:
- Temp ID on server is tied to specific duration
- Server validates temp ID matches POST payload
- Must trigger JavaScript to update temp hold before extraction
- This is why we must interact with the form UI, not just submit data

## Testing

### Test Environment
- **Site:** https://jct.gametime.net
- **Test Account:** annieyang
- **Test Courts:** Various courts (ID mapping in COURT_ID_MAPPING)

### Test Results

✅ **Singles Booking (60 min)**
- Immediate mode: Working
- Precision-timed mode: Working
- Creates 1-hour reservation with 2 players

✅ **Doubles Booking (90 min)**
- Immediate mode: Working
- Precision-timed mode: Working
- Creates 1.5-hour reservation with 4 players

### Test Scripts Created

During debugging, created several test scripts in `test-login-comparison/`:

1. **test-payload-comparison.js** - Compare generated payload vs working Chrome payload
2. **test-capture-manual-submit.js** - Capture real form submissions
3. **test-completely-manual.js** - Zero automation test
4. **test-stealth-browser.js** - Enhanced anti-detection (not needed)

These scripts were instrumental in discovering the temp hold system behavior.

## Commit History

```
6efd3b2 fix: select radio button before duration dropdown
bd0f7c7 fix: change duration dropdown before extracting temp field
542e917 fix: add guestof=1 to ALL guest players for doubles booking
99fc50b fix: correct rtype for doubles booking (should be 13, not 1)
d81b414 feat: add doubles booking support with dynamic configuration
```

## Files Modified

- `backend-server/playwrightBooking.js` - Core booking logic with form interaction
- `backend-server/server.js` - Pass bookingType and durationHours to booking functions

## Database Schema

Existing database schema already supports doubles:
- `booking_type` column: 'singles' | 'doubles'
- `duration_hours` column: 1 | 1.5

No database changes required.

## API Integration

The system reads from Supabase:
```sql
SELECT booking_type, duration_hours FROM bookings WHERE ...
```

And passes to booking functions:
```javascript
executeBooking({
  username,
  password,
  courts,
  date,
  time,
  guestName: 'G',
  bookingType: booking.booking_type,  // 'singles' or 'doubles'
  durationHours: booking.duration_hours  // 1 or 1.5
});
```

## Future Considerations

### Potential Enhancements
1. Support for custom player names (currently uses 'G' for all guests)
2. Mixed booking types (different durations for different courts)
3. Better error handling for form interaction timeouts

### Maintenance Notes
1. If GameTime changes form structure, update selectors:
   - Radio button: `input[type="radio"][name="rtype"]`
   - Duration dropdown: `select[name="duration"]`
2. If temp hold system changes, may need to adjust wait times (currently 2s)
3. Monitor for any changes to rtype values (13 vs 1)

## Lessons Learned

1. **Form Interaction Matters:** Cannot always bypass UI with direct POST
2. **Temporary Holds:** Complex systems may use temp reservations that must be updated
3. **JavaScript Validation:** Server-side validation may depend on client-side JS actions
4. **Real Payloads:** Always use working payloads from production, not failed test logs
5. **Timing:** Allow proper time for async JavaScript operations (2s for temp hold update)

## Conclusion

The doubles booking feature is now fully functional and deployed. Both singles and doubles bookings work reliably through both immediate and precision-timed booking modes. The implementation correctly handles GameTime's temporary hold system by interacting with the form UI before submission.

---

**Implementation completed:** 2025-11-11
**Tested and verified:** ✅ Working
**Deployed to:** main branch, origin/main
