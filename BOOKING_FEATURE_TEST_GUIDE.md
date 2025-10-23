# Booking Feature - Test Guide

## Overview

This document provides comprehensive testing instructions for the automated court booking scheduler feature. The system prepares bookings up to the point of GameTime form submission but does NOT automatically submit to prevent accidental charges on live accounts.

---

## Architecture Overview

### Component Stack

```
BookingFormScreen (UI)
    ↓
useBooking Hook
    ↓
bookingStore (Zustand)
    ↓
bookingScheduler.createBookingWithSchedule()
    ↓
bookingService.createBooking()
    ↓
Supabase (Database)
    ↓
bookingService.getPendingBookingsToExecute() [Scheduler]
    ↓
gameTimeAutomation.executeBookingTask() [Backend]
    ↓
Puppeteer [Browser Automation]
    ↓
GameTime.net [Manual Submission]
```

### Database Flow

```
bookings table
├─ id: UUID
├─ user_id: UUID (from auth.users)
├─ preferred_court: 1-6
├─ accept_any_court: boolean
├─ booking_date: YYYY-MM-DD
├─ booking_time: HH:mm
├─ booking_type: 'singles' | 'doubles'
├─ duration_hours: 1 | 1.5
├─ scheduled_execute_time: ISO timestamp (8:00 AM UTC on 7-days-before date)
├─ auto_book_status: 'pending' | 'in_progress' | 'success' | 'failed'
├─ status: 'pending' | 'confirmed' | 'cancelled'
├─ gametime_confirmation_id: string (after successful booking)
├─ actual_court: 1-6 (after successful booking)
├─ error_message: string (if booking fails)
└─ retry_count: number (incremented on failures)
```

---

## Pre-Test Setup

### 1. Verify Database Migration

Confirm that `BOOKINGS_MIGRATION.sql` has been executed:

```bash
# In Supabase SQL Editor, verify these tables exist:
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
```

Expected tables:
- `bookings` ✓
- `recurring_booking_instances` ✓
- `user_profiles` ✓
- `credentials` ✓

### 2. Verify Environment Variables

Ensure `.env.local` contains:
```
EXPO_PUBLIC_SUPABASE_URL=https://zsgmjpzopirshfjstoen.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Verify Credentials Stored

Before testing booking submission, ensure GameTime credentials are stored:
```bash
# In Credentials screen, add:
Username: annieyang
Password: jc333666
```

### 4. Start Development Server

```bash
npm run web
# or
npx expo start --web --port 8084
```

---

## Test Cases

### Test 1: Create a Single Booking

**Objective:** Verify booking form submission creates database record with correct 7-day schedule

**Steps:**

1. Login with test account
2. Navigate to Booking screen
3. Fill form:
   - Court: Select "Court 1"
   - Accept Any Court: ✓ (checked)
   - Date: 2025-10-31 (any future date, preferably 10+ days out)
   - Time: 18:00 (6:00 PM)
   - Type: Singles
   - Duration: 1.5 hours
   - Recurrence: Once

4. Click "Schedule Booking"

**Expected Results:**

✓ Success alert: "Booking created successfully! The system will automatically submit..."
✓ Form resets to default values
✓ Booking appears in database with status `pending` and `auto_book_status: pending`

**Database Verification:**

```sql
SELECT id, booking_date, booking_time, scheduled_execute_time, auto_book_status
FROM bookings
WHERE user_id = (SELECT auth.users.id)
ORDER BY created_at DESC
LIMIT 1;
```

Expected:
- `booking_date`: 2025-10-31
- `booking_time`: 18:00
- `scheduled_execute_time`: 2025-10-24 08:00:00 UTC (7 days before at 8:00 AM)
- `auto_book_status`: pending

---

### Test 2: 7-Day Window Calculation

**Objective:** Verify scheduler correctly calculates 8:00 AM on 7-days-before date

**Test Cases:**

| Booking Date | Expected Execute Time | Days Before |
|--------------|----------------------|-------------|
| 2025-10-25 | 2025-10-18 08:00 UTC | 7 |
| 2025-10-26 | 2025-10-19 08:00 UTC | 7 |
| 2025-11-30 | 2025-11-23 08:00 UTC | 7 |

**Steps:**

1. Create 3 separate bookings with dates from the table above
2. Verify each generates correct `scheduled_execute_time`

**Database Verification:**

```sql
SELECT
  booking_date,
  scheduled_execute_time,
  DATE_PART('day', scheduled_execute_time::date - booking_date::date) as days_difference
FROM bookings
WHERE user_id = (SELECT auth.users.id)
ORDER BY created_at DESC
LIMIT 3;
```

Expected: All rows show `days_difference: -7`

---

### Test 3: Recurring Bookings

**Objective:** Verify recurring booking pattern generation

**Steps:**

1. Create booking with:
   - Date: 2025-10-31 (Friday)
   - Recurrence: Weekly
   - Recurrence End Date: 2025-11-14 (2 weeks later)

2. Verify database contains correct instances

**Database Verification:**

```sql
SELECT
  booking_date,
  scheduled_execute_time,
  recurrence
FROM bookings
WHERE user_id = (SELECT auth.users.id)
  AND recurrence = 'weekly'
ORDER BY booking_date;
```

Expected results:
- 2025-10-31 (Oct 31 booking)
- 2025-11-07 (Nov 7 booking - 1 week later)
- 2025-11-14 (Nov 14 booking - 2 weeks later)

---

### Test 4: Date Validation

**Objective:** Verify future-only bookings are enforced

**Steps:**

1. Try to create booking with past date (e.g., 2025-10-22 when today is 2025-10-23)
2. Try to create booking with today's date

**Expected Results:**

✗ Error alert: "Booking date must be in the future"

---

### Test 5: Form Validation

**Objective:** Verify all required fields are validated

**Test Cases:**

| Field | Test Value | Expected Result |
|-------|-----------|-----------------|
| Court | Not selected (0) | Error: "Please select a court" |
| Date | Empty | Error: "Please select a booking date" |
| Time | Empty | Error: "Please select a booking time" |
| Type | Not selected | Error: "Please select a booking type" |
| Duration | Not selected | Error: "Please select a duration" |
| Recurrence | Not selected | Error: "Please select a recurrence" |

**Steps:**

For each test case:
1. Leave field empty
2. Fill other fields
3. Click "Schedule Booking"
4. Verify error message

**Expected:** All validation errors show correct messages

---

### Test 6: Court Fallback Option

**Objective:** Verify `accept_any_court` flag is stored correctly

**Steps:**

1. Create booking with "Accept any court" ✓ checked
2. Create another booking with "Accept any court" ☐ unchecked

**Database Verification:**

```sql
SELECT id, preferred_court, accept_any_court
FROM bookings
WHERE user_id = (SELECT auth.users.id)
ORDER BY created_at DESC
LIMIT 2;
```

Expected:
- First booking: `accept_any_court: true`
- Second booking: `accept_any_court: false`

---

### Test 7: Multiple Users

**Objective:** Verify RLS policies - users can only see their own bookings

**Setup:**

1. Create/login with User A
2. Create a booking
3. Logout
4. Create/login with User B
5. Verify User B cannot see User A's bookings

**Database Verification:**

```sql
-- As User A
SELECT COUNT(*) FROM bookings;  -- Should be 1+

-- As User B
SELECT COUNT(*) FROM bookings;  -- Should be 0 (unless User B created bookings)
```

---

### Test 8: Booking Form UI

**Objective:** Verify all form elements render and function correctly

**Checklist:**

- [ ] Court dropdown displays courts 1-6
- [ ] "Accept any court" checkbox toggles
- [ ] Date input accepts YYYY-MM-DD format
- [ ] Date input shows placeholder "2025-10-25"
- [ ] Time dropdown shows 30-minute intervals (06:00 through 22:30)
- [ ] Booking Type shows "Singles" and "Doubles" radio buttons
- [ ] Duration shows only "1 hour" and "1.5 hours" (no 2 hours)
- [ ] Recurrence shows "Once", "Weekly", "Bi-Weekly", "Monthly"
- [ ] Summary section displays all filled values
- [ ] "Schedule Booking" button enables after form is valid
- [ ] "Reset" button clears all fields to defaults

---

### Test 9: Loading & Error States

**Objective:** Verify UI properly handles async operations

**Steps:**

1. Click "Schedule Booking"
2. While request is pending, observe loading state
3. Verify button shows spinner and is disabled
4. Verify no duplicate submissions if button clicked multiple times

**Expected:**
- ✓ Loading spinner shows in button
- ✓ Button disabled during submission
- ✓ No network requests duplicated

---

### Test 10: Booking Status Tracking

**Objective:** Verify booking status transitions

**Initial State:** `pending`, `auto_book_status: pending`

**After 7-day window:** `auto_book_status: in_progress` (would be set by scheduler)

**After successful submission:** `pending` → `confirmed`, `auto_book_status: success`

**After failed submission:** `auto_book_status: failed` (after 3 retries)

**Database Verification:**

```sql
SELECT id, status, auto_book_status, retry_count, error_message
FROM bookings
WHERE user_id = (SELECT auth.users.id)
ORDER BY created_at DESC;
```

---

## Manual GameTime Submission Test

### Preparation

Before attempting manual submission:

1. Create booking in app (for future date, 10+ days out)
2. Verify it appears in database with:
   ```sql
   SELECT * FROM bookings WHERE id = '<booking_id>';
   ```

### Manual Submission Steps

1. Go to https://jct.gametime.net/login
2. Login with credentials: `annieyang` / `jc333666`
3. Navigate to Tennis → Courts
4. Select the booking date from calendar
5. Click the available time slot
6. Verify form pre-fills with your booking data:
   - [ ] Court matches your preferred_court
   - [ ] Time matches your booking_time
   - [ ] Duration matches (1 or 1.5 hours)
   - [ ] Type matches (Singles/Doubles)
7. **DO NOT** click "Book" button yet
8. Report back: "Form prefilled correctly with all booking data"

### Form Submission (Manual)

Only proceed after confirming all fields are correct:

1. Complete any required fields (player names with "G")
2. Handle reCAPTCHA if present
3. Click "Book" button
4. Verify confirmation page shows booking details
5. Note confirmation ID: ________________
6. Update database with confirmation:
   ```sql
   UPDATE bookings
   SET
     auto_book_status = 'success',
     status = 'confirmed',
     gametime_confirmation_id = '<confirmation_id>',
     actual_court = <court_number>
   WHERE id = '<booking_id>';
   ```

---

## Testing Booking Retrieval

### Load User's Bookings

**Objective:** Verify users can fetch their bookings

**Steps:**

1. Create 3+ bookings
2. Navigate away from booking screen and back
3. Verify all bookings load and display

**Expected:**
- All created bookings appear
- Sorted by date ascending
- Show correct status and schedule time

---

## Debugging Tips

### Check Booking in Database

```sql
SELECT
  id,
  booking_date,
  booking_time,
  scheduled_execute_time,
  preferred_court,
  accept_any_court,
  booking_type,
  duration_hours,
  recurrence,
  auto_book_status,
  status,
  error_message,
  retry_count,
  created_at
FROM bookings
WHERE user_id = (SELECT auth.users.id)
ORDER BY created_at DESC
LIMIT 10;
```

### Check Auth State

```typescript
// In browser console
localStorage.getItem('sb-auth-token')  // Should show session token
```

### Monitor Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Create booking
4. Look for POST request to `_supabase/rest/v1/bookings`
5. Verify response status: 200/201

### Common Issues

| Issue | Solution |
|-------|----------|
| "User not authenticated" | Login first, check auth store |
| "Date must be in future" | Use date 10+ days in future |
| "Booking date must be in future" | Same as above |
| Database records not appearing | Check RLS policies in Supabase |
| 7-day calculation wrong | Verify system timezone is UTC |

---

## Success Criteria

✓ All 10 test cases pass
✓ Database contains correct booking records
✓ 7-day window calculated correctly
✓ Form validation works for all fields
✓ RLS policies prevent cross-user access
✓ UI shows proper loading/error states
✓ Manual GameTime submission works with prefilled form

---

## Next Steps (After Testing)

1. **Backend Scheduler:** Implement cron job to execute pending bookings at 8:00 AM UTC daily
2. **Puppeteer Integration:** Deploy backend with full Puppeteer automation
3. **reCAPTCHA Handling:** Integrate reCAPTCHA solving service or require manual intervention
4. **Retry Logic:** Implement automatic retries with exponential backoff
5. **Notifications:** Add user notifications when bookings succeed/fail

---

## Files Reference

- **Form UI:** `src/screens/booking/BookingFormScreen.tsx`
- **Service Layer:** `src/services/bookingService.ts`
- **Scheduler Logic:** `src/services/bookingScheduler.ts`
- **Automation:** `src/services/gameTimeAutomation.ts`
- **Store:** `src/store/bookingStore.ts`
- **Hook:** `src/hooks/useBooking.ts`
- **Types:** `src/types/index.ts`
- **Database:** `BOOKINGS_MIGRATION.sql`

---

## Contact

For issues or questions:
1. Check PROGRESS.md for current status
2. Review error messages in browser console
3. Check database state in Supabase SQL editor
4. Verify Supabase credentials in .env.local
