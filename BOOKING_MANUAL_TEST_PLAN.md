# JC Court Booking Tool - Manual Testing Plan

**Status:** Manual Testing Ready
**Date:** 2025-10-24
**Tester Note:** No automated test agent involvement. This is a careful manual testing plan for logic validation without test GameTime.net account.

---

## Overview

The booking feature includes:
1. **BookingFormScreen** - Form for users to create bookings
2. **BookingHistoryScreen** - Display and manage existing bookings
3. **Booking Tab Route** - Navigation between form and history
4. **Zustand Store** - State management for bookings
5. **Booking Service** - Supabase database operations
6. **Booking Scheduler** - Calculates when to execute automated bookings (7-day window)

Since there's no test account on gametime.net, testing focuses on:
- Form validation and UI interactions
- Booking creation logic and database storage
- Booking history retrieval and display
- State management and navigation
- Recurrence pattern generation
- Error handling

---

## Test Environment Setup

### Prerequisites
- App running on http://localhost:8084
- User logged in with test credentials
- Supabase connected and bookings table exists
- Metro bundler active and no build errors

### Verify Setup
```bash
# Check if app is running
curl http://localhost:8084

# Verify Metro bundler
# Check browser console for errors
# Verify Supabase connection in Network tab
```

---

## Test Suite 1: Form UI and Rendering

### Test 1.1: Form Fields Display Correctly
**Description:** Verify all form fields render properly
**Steps:**
1. Navigate to Booking tab
2. Click "Create Booking" button (or ensure on form view)
3. Verify all fields are visible:
   - Preferred Court dropdown
   - Accept Any Court checkbox
   - Booking Date field
   - Time dropdown
   - Booking Type (Singles/Doubles radio buttons)
   - Duration dropdown
   - Recurrence Pattern dropdown
   - Booking Summary section
   - Schedule Booking button
   - Reset button

**Expected Result:**
- All fields render without errors
- Form is scrollable if needed
- Summary section visible at bottom
- No layout issues or overlapping elements

**Test Data:** N/A
**Notes:** Visual inspection test

---

### Test 1.2: Court Dropdown Displays All Options
**Description:** Verify court selection dropdown shows courts 1-6
**Steps:**
1. Click on "Preferred Court" dropdown
2. Verify dropdown opens
3. Check visible options: "Select a court...", Court 1-6

**Expected Result:**
- Dropdown opens smoothly
- All 7 options visible (1 placeholder + 6 courts)
- No missing or duplicate options

**Test Data:** N/A
**Notes:** Basic UI test

---

### Test 1.3: Date Input Works on Web
**Description:** Verify native HTML5 date picker displays on web platform
**Steps:**
1. Click on "Booking Date" field
2. Verify calendar picker opens (native browser date picker)
3. Verify calendar shows current month
4. Verify today and future dates can be selected
5. Verify past dates are disabled/grayed out

**Expected Result:**
- Native browser date picker appears (not text input)
- Calendar displays correctly
- Past dates disabled
- Can navigate months
- Selected date updates input

**Test Data:** N/A
**Notes:** Platform-specific (web only)

---

### Test 1.4: Time Slot Options
**Description:** Verify time dropdown shows all time slots
**Steps:**
1. Click on "Time" dropdown
2. Scroll through options

**Expected Result:**
- All 32 time slots visible: 06:00 to 22:30 (30-min increments)
- Times are in HH:MM format
- Default selection is 10:00

**Test Data:** N/A
**Notes:** Check availability matches requirements

---

### Test 1.5: Booking Type Radio Buttons
**Description:** Verify Singles/Doubles selection works
**Steps:**
1. Verify "Singles" radio button is selected by default
2. Click "Doubles" radio button
3. Verify it becomes selected
4. Click "Singles" again
5. Verify it becomes selected again

**Expected Result:**
- Only one option selected at a time
- Visual indication of selected option (filled circle)
- Can switch between options

**Test Data:** N/A
**Notes:** Radio button behavior test

---

### Test 1.6: Booking Summary Updates in Real-Time
**Description:** Verify summary section updates as form changes
**Steps:**
1. Note current summary values
2. Change Preferred Court to "Court 3"
3. Verify summary updates immediately
4. Change date using date picker
5. Verify summary updates immediately
6. Change time to "14:00"
7. Verify summary updates immediately
8. Toggle "Accept Any Court" checkbox
9. Verify summary updates immediately

**Expected Result:**
- Summary updates instantly as each field changes
- All displayed values match current form state
- Summary accurately represents current selections

**Test Data:**
- Court 3, any date, 14:00, toggle accept any court
**Notes:** Real-time binding test

---

## Test Suite 2: Form Validation

### Test 2.1: Missing Court Selection
**Description:** Cannot submit without selecting a court
**Steps:**
1. Fill all fields except leave court as "Select a court..."
2. Click "Schedule Booking"

**Expected Result:**
- Form does NOT submit
- Error message: "Please select a court"
- Error displayed in red box above form fields

**Test Data:**
- Court: Not selected (default)
- Date: Tomorrow
- Time: 10:00
- Type: Singles
- Duration: 1 hour
- Recurrence: Once

**Notes:** First validation rule

---

### Test 2.2: Missing Date
**Description:** Cannot submit without selecting a date
**Steps:**
1. Select court: Court 1
2. Clear date field (if possible)
3. Click "Schedule Booking"

**Expected Result:**
- Form does NOT submit
- Error message: "Please select a booking date"

**Test Data:**
- Court: Court 1
- Date: [Empty or invalid]
- Time: 10:00
- Type: Singles
- Duration: 1 hour
- Recurrence: Once

**Notes:** Test boundary condition

---

### Test 2.3: Past Date Not Allowed
**Description:** Cannot book for dates in the past
**Steps:**
1. Fill form with all valid data
2. Try to select a past date using date picker
3. Verify past dates are disabled in calendar

**Expected Result:**
- Past dates appear grayed out in calendar
- Cannot click/select past dates
- If validation runs: "Booking date must be in the future"

**Test Data:**
- Court: Court 1
- Date: Any date before today (attempted)
- Time: 10:00
- Type: Singles
- Duration: 1 hour
- Recurrence: Once

**Notes:** Calendar UI validation + server-side validation

---

### Test 2.4: Same-Day Booking Allowed
**Description:** Verify current logic allows booking for today
**Steps:**
1. Fill form with all fields
2. Select today's date using date picker
3. Click "Schedule Booking"

**Expected Result:**
- Form submits successfully
- Booking created with today's date
- **NOTE:** This may be a business logic question - clarify if same-day bookings should be allowed

**Test Data:**
- Court: Court 1
- Date: Today
- Time: 14:00
- Type: Singles
- Duration: 1 hour
- Recurrence: Once

**Notes:** BUSINESS LOGIC - May need clarification from product owner

---

### Test 2.5: Missing Time
**Description:** Cannot submit without time
**Steps:**
1. Fill form with all fields valid
2. Try to omit time selection
3. Click "Schedule Booking"

**Expected Result:**
- Form does NOT submit
- Error message: "Please select a booking time"

**Test Data:** All fields except time
**Notes:** Time is required

---

### Test 2.6: Missing Booking Type
**Description:** Cannot submit without booking type
**Steps:**
1. Fill form with all fields
2. Verify booking type is selected (default is Singles)
3. Unselect if possible
4. Click "Schedule Booking"

**Expected Result:**
- Form does NOT submit if type is not selected
- Error message: "Please select a booking type (Singles or Doubles)"

**Test Data:** All fields
**Notes:** Booking type has default, so should always be valid

---

### Test 2.7: Missing Duration
**Description:** Cannot submit without duration
**Steps:**
1. Fill form with all fields
2. Verify duration is selected (default is 1 hour)
3. Click "Schedule Booking"

**Expected Result:**
- Form submits (duration has default value)
- Duration validation passes

**Test Data:** All fields
**Notes:** Duration has default, should always be valid

---

### Test 2.8: Missing Recurrence
**Description:** Cannot submit without recurrence pattern
**Steps:**
1. Fill form with all fields
2. Verify recurrence is selected (default is Once)
3. Click "Schedule Booking"

**Expected Result:**
- Form submits (recurrence has default value)
- Recurrence validation passes

**Test Data:** All fields
**Notes:** Recurrence has default, should always be valid

---

### Test 2.9: Invalid Date Format
**Description:** Validate date format validation (if manual entry possible)
**Steps:**
1. Try to enter invalid date format manually (if web allows)
2. Click "Schedule Booking"

**Expected Result:**
- Error message: "Invalid date format. Please use YYYY-MM-DD"
- Or calendar picker prevents invalid entry

**Test Data:**
- Date: "10/24/2025" or "invalid"

**Notes:** HTML5 date input should prevent this on web

---

### Test 2.10: Form Reset Button
**Description:** Verify form resets to default values
**Steps:**
1. Fill form with all custom values:
   - Court: Court 5
   - Date: 30 days from today
   - Time: 18:00
   - Type: Doubles
   - Duration: 1.5 hours
   - Recurrence: Weekly
   - Accept Any Court: Yes
2. Click "Reset" button
3. Verify form returns to defaults:
   - Court: "Select a court..." (0)
   - Date: Today
   - Time: 10:00
   - Type: Singles
   - Duration: 1 hour
   - Recurrence: Once
   - Accept Any Court: No

**Expected Result:**
- All fields reset to initial defaults
- Errors cleared
- Summary updates to show defaults

**Test Data:** See steps
**Notes:** State management test

---

## Test Suite 3: Booking Creation and Database

### Test 3.1: Successful Booking Submission
**Description:** Verify booking creates successfully in database
**Steps:**
1. Fill form with valid data:
   - Court: Court 2
   - Date: 15 days from today
   - Time: 10:00
   - Type: Singles
   - Duration: 1 hour
   - Recurrence: Once
2. Click "Schedule Booking"
3. Verify loading spinner appears
4. Wait for success message

**Expected Result:**
- Loading spinner shows briefly
- Success alert: "Booking created successfully! The system will automatically submit your booking at 8:00 AM on the scheduled date."
- Alert has "OK" button
- After clicking OK:
  - Form resets to defaults
  - User may stay on form or auto-redirect to history
  - No errors in browser console

**Test Data:**
- Court: 2
- Date: 15 days from today (YYYY-MM-DD format)
- Time: 10:00
- Type: Singles
- Duration: 1
- Recurrence: Once

**Notes:** Core functionality test - DATABASE IMPACT: Check Supabase

---

### Test 3.2: Verify Booking Saved in Database
**Description:** Confirm booking appears in Supabase
**Steps:**
1. Create booking as per Test 3.1
2. Open Supabase dashboard
3. Go to SQL Editor
4. Run query:
```sql
SELECT * FROM bookings
WHERE user_id = '[current user ID]'
ORDER BY created_at DESC
LIMIT 1;
```
5. Verify booking data matches form input

**Expected Result:**
- Booking record exists in database
- Fields match submitted data:
  - preferred_court: 2
  - booking_date: [15 days from today]
  - booking_time: 10:00
  - booking_type: singles
  - duration_hours: 1
  - recurrence: once
  - accept_any_court: false
  - auto_book_status: pending
  - status: pending

**Test Data:** From Test 3.1
**Notes:** Database verification - Critical for logic validation

---

### Test 3.3: Scheduled Execute Time Calculation
**Description:** Verify booking scheduler calculates 7-day window correctly
**Steps:**
1. Create booking with booking_date = "2025-11-07" (example)
2. Check database scheduled_execute_time field
3. Verify logic:
   - 7 days before 2025-11-07 = 2025-10-31
   - At 8:00 AM UTC
   - Expected: 2025-10-31T08:00:00Z (approximately)

**Expected Result:**
- scheduled_execute_time is 7 days before booking_date
- Time is 08:00 UTC
- Format: ISO 8601 timestamp

**Test Data:**
- Booking date: 2025-11-07
- Expected execute time: ~2025-10-31T08:00:00Z

**Notes:** CRITICAL LOGIC - Verify scheduler math

---

### Test 3.4: Recurring Booking Creates Multiple Instances
**Description:** Verify recurring bookings generate correct instances
**Steps:**
1. Fill form:
   - Court: Court 1
   - Date: 2025-11-07 (Friday)
   - Time: 10:00
   - Type: Singles
   - Duration: 1 hour
   - Recurrence: Weekly (4 instances expected)
2. Submit booking
3. Query database:
```sql
SELECT * FROM bookings
WHERE user_id = '[user_id]'
  AND recurrence = 'weekly'
ORDER BY booking_date;
```
4. Verify 4 instances created for:
   - 2025-11-07 (original)
   - 2025-11-14 (1 week later)
   - 2025-11-21
   - 2025-11-28

**Expected Result:**
- Database shows 4 booking records
- Each has same time, court, type, duration
- Dates increment by 7 days (weekly)
- All have auto_book_status: pending

**Test Data:**
- Court: 1
- Start date: Friday 2025-11-07
- Recurrence: Weekly

**Notes:** CRITICAL LOGIC - Recurrence generation

---

### Test 3.5: Bi-Weekly Recurrence
**Description:** Verify bi-weekly bookings create with 14-day intervals
**Steps:**
1. Fill form:
   - Court: Court 2
   - Date: 2025-11-07
   - Time: 14:00
   - Type: Doubles
   - Duration: 1.5 hours
   - Recurrence: Bi-Weekly
2. Submit booking
3. Query database for bi-weekly instances
4. Verify 2-3 instances at 14-day intervals

**Expected Result:**
- Booking instances created at 14-day intervals
- First: 2025-11-07
- Second: 2025-11-21
- Third: 2025-12-05

**Test Data:**
- Court: 2
- Start date: 2025-11-07
- Recurrence: Bi-Weekly

**Notes:** Recurrence variant test

---

### Test 3.6: Monthly Recurrence
**Description:** Verify monthly bookings create appropriately
**Steps:**
1. Fill form:
   - Court: Court 3
   - Date: 2025-11-07
   - Time: 15:00
   - Type: Singles
   - Duration: 1 hour
   - Recurrence: Monthly
2. Submit booking
3. Query for monthly instances
4. Verify 2-3 instances approximately 30 days apart

**Expected Result:**
- Monthly instances created at ~30-day intervals
- Dates approximately:
  - 2025-11-07
  - 2025-12-07
  - 2025-01-07 (next year)

**Test Data:**
- Court: 3
- Start date: 2025-11-07
- Recurrence: Monthly

**Notes:** Monthly recurrence uses ~30-day intervals (not exact calendar months)

---

## Test Suite 4: Booking History and Display

### Test 4.1: Navigation to History Tab
**Description:** Verify can navigate to "My Bookings" tab
**Steps:**
1. On Booking tab, click "My Bookings" button/tab
2. Verify history screen displays

**Expected Result:**
- Smoothly transitions to history view
- Form disappears
- History screen shows:
  - "My Bookings" title
  - "0 bookings" or count if bookings exist
  - Statistics cards (Total, Pending, Processing, Confirmed, Failed)
  - Filter tabs (All, Pending, Confirmed, Failed)
  - Sort options (Date, Status)
  - Bookings list (or empty state)

**Test Data:** N/A
**Notes:** Navigation test

---

### Test 4.2: Bookings Load on History Screen
**Description:** Verify bookings load automatically when history screen opens
**Steps:**
1. Create 2-3 bookings (from Test 3.1, 3.4, 3.5)
2. Click on "My Bookings" tab
3. Wait for loading spinner to disappear
4. Verify bookings display

**Expected Result:**
- Loading spinner shows briefly
- Bookings appear in list
- Each booking shows:
  - Court number
  - Date
  - Time
  - Type (Singles/Doubles)
  - Duration
  - Status badge
- List is scrollable if many bookings

**Test Data:** Use bookings from previous tests
**Notes:** State loading and UI test

---

### Test 4.3: Filter by Status - Pending
**Description:** Verify can filter to show only pending bookings
**Steps:**
1. On history screen, click "Pending" filter tab
2. Verify list updates to show only pending bookings
3. Count should be ≤ total bookings

**Expected Result:**
- List shows only bookings with status 'pending'
- "Pending" tab is highlighted/active
- Count matches pending booking count
- Other statuses not shown

**Test Data:** Use bookings from previous tests
**Notes:** Filter functionality

---

### Test 4.4: Filter by Status - All
**Description:** Verify "All" filter shows all bookings
**Steps:**
1. On history screen, click "All" filter tab
2. Count bookings shown

**Expected Result:**
- All bookings visible regardless of status
- Count equals total bookings in database

**Test Data:** N/A
**Notes:** Filter reset test

---

### Test 4.5: Sort by Date
**Description:** Verify bookings sort by date (newest first)
**Steps:**
1. On history screen, click "Date" sort button
2. Observe booking order
3. Verify most recent date at top

**Expected Result:**
- Bookings sorted by date, newest first
- Oldest bookings at bottom of list
- "Date" button highlighted/active

**Test Data:** Use bookings from previous tests
**Notes:** Sorting test

---

### Test 4.6: Sort by Status
**Description:** Verify bookings sort by status priority
**Steps:**
1. On history screen, click "Status" sort button
2. Observe booking order
3. Verify priority: processing > pending > failed > confirmed

**Expected Result:**
- Bookings grouped by status in priority order
- Processing first, confirmed last
- "Status" button highlighted/active

**Test Data:** Multiple bookings with different statuses
**Notes:** Status priority: processing(1) > pending(2) > failed(3) > confirmed(4)

---

### Test 4.7: Booking Card Display
**Description:** Verify each booking card shows correct information
**Steps:**
1. On history screen, look at first booking card
2. Verify displays:
   - Court (e.g., "Court 1")
   - Date (e.g., "2025-11-07")
   - Time (e.g., "10:00")
   - Type (e.g., "Singles")
   - Duration (e.g., "1 hour")
   - Status badge (e.g., "PENDING" in yellow)

**Expected Result:**
- All fields visible and readable
- Format matches database records
- Status badges colored correctly:
  - Pending: Yellow
  - Processing: Blue
  - Confirmed: Green
  - Failed: Red

**Test Data:** Any booking from previous tests
**Notes:** Card UI verification

---

### Test 4.8: Empty Booking History
**Description:** Verify empty state message when no bookings
**Steps:**
1. Logout current user
2. Create new test account
3. Login with new account
4. Go to Booking > My Bookings tab

**Expected Result:**
- No loading spinner (not loading)
- Empty state message: "No bookings yet"
- Subtext: "Create a booking to get started"
- Statistics cards show all 0

**Test Data:** Fresh user account
**Notes:** Empty state UX test

---

### Test 4.9: Booking Statistics Display
**Description:** Verify statistics cards show correct counts
**Steps:**
1. Create 5 bookings with different statuses:
   - 2 Pending
   - 1 Processing
   - 1 Confirmed
   - 1 Failed
2. View My Bookings tab
3. Verify stat cards show:
   - Total: 5
   - Pending: 2
   - Processing: 1
   - Confirmed: 1
   - Failed: 1

**Expected Result:**
- Each stat card displays correct count
- Cards are scrollable if screen is narrow
- Color coding matches status

**Test Data:** 5 bookings with mixed statuses (may need manual database updates to set different statuses)
**Notes:** Data aggregation test

---

## Test Suite 5: State Management and Navigation

### Test 5.1: Auto-Redirect After Booking Creation
**Description:** Verify auto-redirect to "My Bookings" after successful booking
**Steps:**
1. On Booking form tab
2. Fill form with valid data
3. Click "Schedule Booking"
4. Watch for success message
5. Click OK on alert

**Expected Result:**
- After clicking OK, automatically redirects to "My Bookings" tab
- New booking appears in list
- Booking shows "pending" status

**Test Data:** See Test 3.1
**Notes:** UX improvement test - Fixes Issue #4 from PROGRESS.md

---

### Test 5.2: Form Reset After Submission
**Description:** Verify form properly resets after successful submission
**Steps:**
1. Create booking successfully
2. Return to "Create Booking" tab
3. Verify form shows defaults:
   - Court: "Select a court..."
   - Date: Today
   - Time: 10:00
   - Type: Singles
   - Duration: 1 hour
   - Recurrence: Once

**Expected Result:**
- Form fields reset to initial defaults
- No previous booking data visible
- Ready for new booking

**Test Data:** N/A
**Notes:** State cleanup test

---

### Test 5.3: Booking Loads in History After Creation
**Description:** Verify newly created booking immediately appears in history
**Steps:**
1. Create booking
2. Auto-redirect to history (or click "My Bookings")
3. Verify new booking appears in list

**Expected Result:**
- Newly created booking visible in list
- Correct data displayed
- Booking count updated
- Statistics updated

**Test Data:** From Test 3.1
**Notes:** Fixes Issue #3 from PROGRESS.md

---

### Test 5.4: Tab Navigation Persistence
**Description:** Verify tab switching preserves state
**Steps:**
1. On Booking form, fill partial data (don't submit)
2. Click "My Bookings" tab
3. Click "Create Booking" tab
4. Note: Form data may be lost (depends on implementation)

**Expected Result:**
- Tab switches work smoothly
- Form shows defaults on return (or preserves state if designed that way)
- No errors during navigation

**Test Data:** N/A
**Notes:** Navigation state test

---

### Test 5.5: Multiple Bookings Creation
**Description:** Verify can create multiple bookings in sequence
**Steps:**
1. Create booking #1 (Court 1, tomorrow, 10:00)
2. Redirect to history, verify it appears
3. Return to form
4. Create booking #2 (Court 2, 2 days from now, 14:00)
5. Verify both appear in history

**Expected Result:**
- Both bookings created successfully
- Both appear in history list
- Total count = 2
- No conflicts or errors

**Test Data:**
- Booking 1: Court 1, tomorrow, 10:00, Singles, 1 hr, Once
- Booking 2: Court 2, +2 days, 14:00, Doubles, 1.5 hr, Once

**Notes:** Consecutive creation test

---

## Test Suite 6: Error Handling

### Test 6.1: Network Error During Submission
**Description:** Verify error handling if Supabase is unavailable
**Steps:**
1. Disconnect internet (or throttle network)
2. Fill booking form
3. Click "Schedule Booking"
4. Watch for error message

**Expected Result:**
- Loading spinner appears
- Network error caught
- Error message displayed (e.g., "Network error")
- Form remains filled (not cleared)
- Can retry

**Test Data:** Valid booking data
**Notes:** Network resilience test

---

### Test 6.2: Unauthenticated User Cannot Create Booking
**Description:** Verify error if user not authenticated
**Steps:**
1. Logout user
2. Somehow navigate to booking form (or try)
3. Attempt to submit booking

**Expected Result:**
- Error: "User not authenticated"
- Form does not submit
- Redirected to login screen

**Test Data:** N/A
**Notes:** Auth validation test

---

### Test 6.3: Invalid User ID Handling
**Description:** Verify error if user ID is missing
**Steps:**
1. (Note: This is hard to test without hacking)
2. If form submits without user context
3. Should fail with auth error

**Expected Result:**
- Error message displayed
- Booking not created
- No database errors in logs

**Test Data:** N/A
**Notes:** Edge case test

---

### Test 6.4: Database Constraint Violations
**Description:** Verify handling of database constraint violations
**Steps:**
1. Create booking normally
2. Try to create identical booking immediately
3. Watch for error handling

**Expected Result:**
- If DB has unique constraints, error displayed
- User informed of issue
- Can retry with different data

**Test Data:** Same booking twice
**Notes:** Database constraint test

---

### Test 6.5: Error Message Display
**Description:** Verify error messages are user-friendly
**Steps:**
1. Trigger various errors (missing field, network error, etc.)
2. Observe error message display
3. Verify messages are clear and actionable

**Expected Result:**
- Errors displayed in red container above form
- Message is clear and specific
- No technical jargon or stack traces
- Message guides user to fix issue

**Test Data:** Various error scenarios
**Notes:** UX/error messaging quality test

---

## Test Suite 7: Booking Card Component

### Test 7.1: Retry Button Functionality
**Description:** Verify retry button on failed bookings
**Steps:**
1. Manually set a booking status to 'failed' in database (using SQL)
2. View booking in history
3. Click retry button on failed booking

**Expected Result:**
- Booking status changes from 'failed' to 'pending'
- Error message cleared
- Success toast: "Booking retry initiated"
- Booking history refreshes

**Test Data:** Database manual update
**Notes:** CRUD operation test - requires manual DB update

---

### Test 7.2: Cancel Booking Functionality
**Description:** Verify can cancel a booking
**Steps:**
1. View booking in history
2. Click cancel button on booking
3. Confirm if prompted

**Expected Result:**
- Booking status changes to 'cancelled'
- Success message: "Booking cancelled"
- Booking may disappear from list or show as cancelled
- Database updated

**Test Data:** Any pending/confirmed booking
**Notes:** Delete operation test

---

### Test 7.3: View Booking Details
**Description:** Verify can view full booking details
**Steps:**
1. Click on a booking card or "details" button
2. Verify details modal/alert appears
3. Check all information is displayed

**Expected Result:**
- Modal shows:
  - Court
  - Date
  - Time
  - Type
  - Duration
  - Status
- All values match database records

**Test Data:** Any booking
**Notes:** Detail view test

---

## Test Suite 8: Recurrence Logic (Critical)

### Test 8.1: Once Recurrence
**Description:** Verify "Once" creates single booking
**Steps:**
1. Create booking with recurrence: Once
2. Query database for booking instances
3. Count records with same recurrence_id

**Expected Result:**
- Only 1 booking record created
- No recurring_booking_instances
- Can be confirmed and completed normally

**Test Data:** Court 1, tomorrow, 10:00, Singles, 1 hr, Once
**Notes:** Baseline recurrence test

---

### Test 8.2: Weekly Recurrence - 4 Weeks
**Description:** Verify weekly recurrence creates 4 instances
**Steps:**
1. Create booking:
   - Date: 2025-11-07 (Friday)
   - Recurrence: Weekly
2. Query database:
```sql
SELECT COUNT(*) FROM bookings
WHERE recurrence = 'weekly'
  AND user_id = '[current user]'
  AND created_at = [booking creation time];
```
3. Verify 4 records created with dates:
   - 2025-11-07
   - 2025-11-14
   - 2025-11-21
   - 2025-11-28

**Expected Result:**
- Exactly 4 booking instances
- Each 7 days apart
- Same court, time, type, duration
- All have status: pending, auto_book_status: pending
- Scheduled execute times calculated for each

**Test Data:**
- Court: 1
- Date: 2025-11-07
- Time: 10:00
- Type: Singles
- Duration: 1 hour
- Recurrence: Weekly

**Notes:** CRITICAL LOGIC - Verify scheduler generates correct recurrence

---

### Test 8.3: Bi-Weekly Recurrence
**Description:** Verify bi-weekly creates instances at 14-day intervals
**Steps:**
1. Create booking:
   - Date: 2025-11-07
   - Recurrence: Bi-Weekly
2. Query database for instances
3. Verify ~2 instances at 14-day intervals

**Expected Result:**
- Instances at:
  - 2025-11-07
  - 2025-11-21
  - (Possibly 2025-12-05 depending on end date logic)
- Each 14 days apart

**Test Data:**
- Court: 2
- Date: 2025-11-07
- Recurrence: Bi-Weekly

**Notes:** 14-day interval test

---

### Test 8.4: Monthly Recurrence
**Description:** Verify monthly creates instances ~30 days apart
**Steps:**
1. Create booking:
   - Date: 2025-11-07
   - Recurrence: Monthly
2. Query for instances
3. Verify ~30-day intervals

**Expected Result:**
- Instances approximately:
  - 2025-11-07
  - 2025-12-07
  - 2026-01-07
- ~30-day intervals

**Test Data:**
- Court: 3
- Date: 2025-11-07
- Recurrence: Monthly

**Notes:** Monthly uses ~30-day intervals, not exact calendar months

---

### Test 8.5: Scheduled Execute Time for Each Instance
**Description:** Verify each recurrence instance has correct scheduled_execute_time
**Steps:**
1. Create weekly booking (2025-11-07, weekly)
2. Query first instance:
```sql
SELECT booking_date, scheduled_execute_time FROM bookings
WHERE booking_date = '2025-11-07' LIMIT 1;
```
3. Verify scheduled_execute_time = 2025-10-31T08:00:00Z (7 days before at 8 AM)
4. Query second instance:
```sql
SELECT booking_date, scheduled_execute_time FROM bookings
WHERE booking_date = '2025-11-14' LIMIT 1;
```
5. Verify scheduled_execute_time = 2025-11-07T08:00:00Z (7 days before second date at 8 AM)

**Expected Result:**
- Each instance has scheduled_execute_time = 7 days before at 08:00 UTC
- Calculation correct for each instance independently
- ISO 8601 format

**Test Data:**
- Weekly bookings for 2025-11-07, 2025-11-14, 2025-11-21, 2025-11-28

**Notes:** CRITICAL LOGIC - Verify scheduler math for automation

---

## Test Suite 9: Browser Compatibility

### Test 9.1: Chrome Web Browser
**Description:** Test on Chrome browser
**Steps:**
1. Open app in Chrome
2. Run through Test 1.1 through 5.5
3. Check console for errors
4. Verify date picker works
5. Verify form submits

**Expected Result:**
- No errors in console
- Native date picker displays
- All functionality works
- Performance acceptable

**Test Data:** See individual tests
**Notes:** Primary browser test

---

### Test 9.2: Firefox Web Browser
**Description:** Test on Firefox browser
**Steps:**
1. Open app in Firefox
2. Run through critical tests (1.1, 3.1, 4.2, 5.1)
3. Check console for errors
4. Verify date picker works

**Expected Result:**
- Firefox compatible
- Same functionality as Chrome
- Date picker works
- No browser-specific errors

**Test Data:** See individual tests
**Notes:** Alternative browser test

---

### Test 9.3: Safari Web Browser
**Description:** Test on Safari browser
**Steps:**
1. Open app in Safari
2. Run critical tests
3. Verify date picker behavior

**Expected Result:**
- Safari compatible
- Same functionality
- Date picker displays correctly

**Test Data:** See individual tests
**Notes:** macOS browser test

---

## Test Suite 10: Performance and UX

### Test 10.1: Form Load Time
**Description:** Verify form loads quickly
**Steps:**
1. Navigate to Booking tab
2. Measure time from tab click to form visible
3. Should be < 1 second

**Expected Result:**
- Form loads instantly
- No noticeable delay
- Smooth rendering

**Test Data:** N/A
**Notes:** Performance test

---

### Test 10.2: Booking Submission Response Time
**Description:** Verify booking submission completes in reasonable time
**Steps:**
1. Create booking
2. Time from "Schedule Booking" click to success message
3. Should be < 3 seconds

**Expected Result:**
- Loading indicator shows immediately
- Submission completes within 3 seconds
- Success message appears
- No timeout errors

**Test Data:** Valid booking data
**Notes:** API performance test

---

### Test 10.3: History Loading Performance
**Description:** Verify history loads smoothly with many bookings
**Steps:**
1. Create 20+ bookings
2. Click "My Bookings" tab
3. Measure load time and smoothness
4. Scroll through list

**Expected Result:**
- History loads within 2 seconds
- List scrolls smoothly
- No jank or stuttering
- No memory leaks (check DevTools)

**Test Data:** 20+ bookings
**Notes:** Scroll performance test

---

### Test 10.4: Form Summary Updates Smoothly
**Description:** Verify summary updates don't cause lag
**Steps:**
1. Rapidly change form fields
2. Watch summary section
3. Verify no lag or missed updates

**Expected Result:**
- Summary updates instantly
- No visible delay
- All changes reflected
- Smooth animation/transitions

**Test Data:** Rapid field changes
**Notes:** Real-time update performance

---

## Summary of Test Cases

**Total Tests:** 89+ test cases across 10 test suites

**Critical Tests (Must Pass):**
- Test 3.1: Successful booking submission
- Test 3.2: Verify booking in database
- Test 3.3: Scheduled execute time calculation
- Test 3.4: Recurring booking instances
- Test 4.2: Bookings load in history
- Test 5.1: Auto-redirect after creation
- Test 8.2: Weekly recurrence creates 4 instances
- Test 8.5: Scheduled execute time for each instance

**High-Priority Tests (Should Pass):**
- Test 2.1-2.10: Form validation
- Test 4.1-4.9: History display and filtering
- Test 5.2-5.5: State management
- Test 6.1-6.5: Error handling

**Nice-to-Have Tests:**
- Test 9.1-9.3: Browser compatibility
- Test 10.1-10.4: Performance

---

## Known Issues from Previous Testing

**Issue #3: Stale Data in My Bookings Tab (MEDIUM - UX)**
- After creating booking, user must refresh to see new booking
- Fixed by calling loadUserBookings() when tab becomes active
- Status: Should be tested in Test 5.3

**Issue #4: No Auto-Redirect After Booking Submission (MEDIUM - UX)**
- After successful booking, user not redirected to "My Bookings"
- Fixed by passing onBookingSuccess callback
- Status: Should be tested in Test 5.1

**Issue #1: Same-Day Booking Allowed (LOW)**
- Current validation allows today's date
- Should clarify if this is desired behavior
- Status: To be tested in Test 2.4

---

## Testing Notes

### Database Queries for Verification

**View all user's bookings:**
```sql
SELECT * FROM bookings
WHERE user_id = '[USER_ID]'
ORDER BY created_at DESC;
```

**Check specific booking dates:**
```sql
SELECT id, preferred_court, booking_date, booking_time,
       recurrence, auto_book_status, scheduled_execute_time
FROM bookings
WHERE user_id = '[USER_ID]' AND recurrence = 'weekly'
ORDER BY booking_date;
```

**View booking statistics:**
```sql
SELECT
  auto_book_status,
  COUNT(*) as count,
  MIN(booking_date) as earliest,
  MAX(booking_date) as latest
FROM bookings
WHERE user_id = '[USER_ID]'
GROUP BY auto_book_status;
```

### Browser Console Checks

After each major operation, check browser console for:
- ❌ Red errors (should be 0)
- ⚠️ Yellow warnings (should be minimal, not related to booking)
- ✅ Green success messages (expected from Supabase operations)

### Network Tab Checks

After submission, verify in Network tab:
- Supabase REST API call succeeds (200 or 201 status)
- POST to: `https://[project-id].supabase.co/rest/v1/bookings`
- Response includes booking ID
- Headers include Authorization token

---

## Test Execution Log Template

Use this to document your test results:

```
Test Case: [Number and Title]
Expected Result: [Description]
Actual Result: [What actually happened]
Status: ✅ PASS / ⚠️ FAIL / 🚫 BLOCKED
Notes: [Any observations or issues]
Date: [YYYY-MM-DD]
Time: [HH:MM]
```

---

## Conclusion

This comprehensive manual testing plan covers:
✅ UI and rendering
✅ Form validation
✅ Database operations
✅ State management
✅ Navigation
✅ Error handling
✅ Recurrence logic (critical)
✅ Browser compatibility
✅ Performance

**Ready for careful manual testing without automated test agent.**

---

**Last Updated:** 2025-10-24
**Branch:** dev/booking-form
**Status:** Testing Plan Complete - Ready for Execution
