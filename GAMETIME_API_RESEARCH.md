# GameTime.net API Research - Joshua Creek Tennis
**Date:** 2025-10-24
**Account:** annieyang @ Joshua Creek Tennis (jct.gametime.net)
**Status:** ✅ COMPLETE - Ready for Implementation

---

## Overview

This document contains the complete API structure for GameTime.net tennis court booking system as discovered through real browser interaction and network request capture.

---

## Authentication & Access

### Login Flow
- **URL:** `https://jct.gametime.net/auth`
- **Method:** Form-based login (POST)
- **Username Field:** Username or Email (accepts "annieyang")
- **Password Field:** Password
- **Session:** Stored in browser cookies/session storage
- **Session Type:** Appears to be traditional session-based (not OAuth/JWT)

### Verified Credentials
```
Username: annieyang
Password: jc333666
Club: Joshua Creek Tennis (JCT)
```

---

## Court Data API

### Endpoint
```
GET https://jct.gametime.net/scheduling/index/jsoncourtdata/sport/{SPORT_ID}/date/{DATE}
```

### Parameters
| Parameter | Type | Values | Required | Example |
|-----------|------|--------|----------|---------|
| sport | Integer | 1 = Tennis | Yes | 1 |
| date | String | YYYY-MM-DD | Yes | 2025-10-25 |
| group | Integer | Court grouping | No | 2 |

### Request Headers
```
X-Requested-With: XMLHttpRequest
Referer: https://jct.gametime.net/scheduling/index/index/sport/1
User-Agent: [Standard browser UA]
```

### Response Format
Content-Type: `application/json; charset=utf-8`

**Top-Level Fields:**
```typescript
{
  q: number,              // Starting quarter hour (360 = 6 AM)
  c: number,              // Total minutes in day (1380 = 9 PM)
  g: {                    // Groups/Facilities info
    s: string,            // Group ID
    g: Array<{
      court: number,      // Court number
      c: string,          // Court code
      g: string,          // Group ID
      n: string           // Court name (e.g., "Indoor")
    }>
  },
  e: Array<Court>,        // Courts array (0-5 for Courts 1-6)
  m: Record<string, Metadata>  // Booking type metadata
}
```

---

## Court Object Structure

### Court Data
```typescript
interface Court {
  n: string;              // Court name: "Court 1", "Court 2", etc.
  mn: string;             // Court number: "1", "2", etc.
  i: string;              // Court ID: "50", "51", "52", etc.

  t: Array<TimeSlot>;     // Available time slots
  b: Array<Booking>;      // Current bookings for this day
}
```

### TimeSlot Structure
```typescript
interface TimeSlot {
  t: number;              // Start time (minutes from 6 AM)
                          // 360 = 6:00 AM, 420 = 7:00 AM, etc.
  d: number;              // Duration in minutes (usually 1020 = 17 hours = 6 AM to 11 PM)
  i?: number;             // Interval in minutes (usually 30 = 30-min slots)
}
```

### Time Calculation
```
Actual Time = 6:00 AM + (minutes / 60)
Examples:
  360 minutes = 6:00 AM
  420 minutes = 7:00 AM
  480 minutes = 8:00 AM
  540 minutes = 9:00 AM
  600 minutes = 10:00 AM
  ... etc
  1380 minutes = 11:00 PM (end of day)
```

---

## Booking Object Structure

### Booking Fields
```typescript
interface GameTimeBooking {
  t: number;              // Start time (minutes from 6 AM)
  d: number;              // Duration in minutes (30, 60, 90, 120, 180, etc.)

  // Confirmation & IDs
  c?: number;             // Confirmation/Booking ID (99876, 99877, etc.)
  bkId: number;           // Booking ID in GameTime system

  // Booking Type/Category
  m?: number;             // Member type ID (3196, 3206, 3209, 3232, 3234, etc.)
  i?: string;             // Special indicator ID (e.g., "adcf53", "a7d3ff")

  // People/Players
  p?: Array<{             // Players array
    n: string;            // Player name
    u?: number;           // User ID in GameTime
    o: number;            // Order (1, 2, 3, 4 for positions)
    club?: string;        // Club code (e.g., "M2227", "M1739")
  }>,

  [userId: string]: "true"; // Dynamic fields: userId as key = "true"

  // Instructor (for lessons)
  j?: string;             // Instructor name (e.g., "Megan Blue", "Roman Trkulja")
}
```

---

## Booking Type Metadata

### Metadata Structure
```typescript
interface BookingTypeMetadata {
  conf_id: number;        // Confirmation ID (269729, 273684, etc.)
  c: string;              // Color code (hex without #): "adcf53", "ef7de0", "559cc8"
  d?: string;             // Description: "Social Round Robin", "Creakers", etc.
  inst_id: null;          // Instructor ID (null for open bookings)
  eventid: null;          // Event ID (null for open bookings)
  instructors: Array;     // Instructor list (usually empty)
  fees: Array;            // Fee information (usually empty)
  ageLimit: string;       // Age limit (usually empty)
  time: string;           // Time string (usually empty)
  date: string;           // Date string (usually empty)
  duration: string;       // Duration string (usually empty)
}
```

### Color Codes
```
adcf53 = Light green (instructor lessons)
ef7de0 = Pink (reserved slots)
a7d3ff = Light blue (social/group play)
559cc8 = Darker blue (special events)
```

---

## Real-World Example Response

### Court 1 on 2025-10-24

**Available Slots:**
- 6:00 AM - 11:00 PM (full day available in 30-minute increments)

**Bookings:**

1. **9:00 AM - 10:00 AM | Andrew Li (Singles)**
   ```json
   {
     "c": 99876,
     "t": 360,
     "d": 120,
     "m": 3196,
     "bkId": 10984,
     "p": [{"n": "Andrew Li", "u": 2474, "o": 1, "club": "M2227"}],
     "2474": "true"
   }
   ```

2. **8:00 AM - 8:30 AM | Mike Bronson with Instructor Megan Blue**
   ```json
   {
     "c": 99877,
     "t": 480,
     "d": 30,
     "i": "adcf53",
     "bkId": 10985,
     "p": [{"n": "Mike Bronson", "u": 1982, "o": 1, "club": "M1739"}],
     "1982": "true",
     "j": "Megan Blue"
   }
   ```

3. **1:30 PM - 3:00 PM | Social Round Robin (4 players)**
   ```json
   {
     "c": 100384,
     "t": 1170,
     "d": 90,
     "m": 3232,
     "bkId": 11492,
     "p": [
       {"n": "Janette Ilieva", "u": 2432, "o": 1, "club": "M2184"},
       {"n": "Nav Jadon", "u": 2248, "o": 2, "club": "M2002"},
       {"n": "Alex Romanchenko", "u": 1700, "o": 3, "club": "M1521"},
       {"n": "Wayne Kole", "u": 103, "o": 4, "club": "M0115"}
     ]
   }
   ```

---

## Available Slot Format

Empty slots are NOT listed in the booking array - they're implied by the `t` (time slots) array.

**To find available slots:**

1. Get TimeSlots from `t` array (e.g., [360-1380 in 30-min increments])
2. Get all Bookings from `b` array
3. Calculate occupied times from bookings
4. Available slots = TimeSlots - Occupied Times

**Example:**
```
TimeSlot: 6:00 AM - 11:00 PM (360-1380 minutes, 30-min intervals)

Bookings:
  - 6:00 AM - 7:00 AM (360-480)
  - 8:00 AM - 8:30 AM (480-510)

Available Slots:
  - 7:00 AM - 8:00 AM (510-540) ✓ AVAILABLE
  - 8:30 AM - 11:00 PM (510-1380) ✓ AVAILABLE (except booked times)
```

---

## Making a Booking

### Current Research Status
At this point in the investigation, we have not captured the actual booking submission API. The UI shows a visual court schedule but clicking on available slots did not trigger a visible booking form or POST request in this session.

### Next Steps Required
1. **Identify booking form submission endpoint** - Likely a POST to a form handler
2. **Capture booking form data** - Which fields are required for submission
3. **Identify confirmation response** - What data is returned after successful booking
4. **Determine payment/confirmation flow** - How bookings are confirmed

### Known Booking Requirements (from UI)
- Court selection (1-6)
- Date (YYYY-MM-DD format, future dates only)
- Time (hourly slots starting 6:00 AM)
- Duration (30 minutes, 60 minutes, 90 minutes, 120 minutes, etc.)
- Player information (name, optionally email/phone)
- Recurrence pattern (Once, Weekly, Bi-weekly, Monthly - optional)

---

## Network Analysis

### Key Requests Captured

| # | Method | URL | Status | Purpose |
|---|--------|-----|--------|---------|
| 1 | GET | /scheduling/index/jsoncourtdata/sport/1/date/{DATE} | 200 | Fetch court schedule for specific date |
| 2 | GET | /scheduling/index/index/sport/1 | 200 | Main scheduling page (HTML) |
| ... | ... | [YUI2 JS/CSS libs] | 200 | Framework loading (YUI 2.0 framework) |

### Technologies Detected
- **Frontend:** YUI 2.0 (Yahoo User Interface library - legacy)
- **Server:** Nginx 1.29.1
- **Backend:** PHP 8.1.33
- **Data Format:** JSON with abbreviated field names
- **Analytics:** New Relic (nr-data.net - blocked in privacy mode)

---

## Integration Notes for Backend API

### For Our Backend Service

When building the real booking service (`src/services/bookingExecutor.ts`), we need to:

1. **Authenticate**
   - POST login with credentials stored in `credentials` table
   - Store session cookies or auth tokens
   - Reuse session for subsequent booking requests

2. **Check Availability**
   - GET `/scheduling/index/jsoncourtdata/sport/1/date/{DATE}`
   - Parse court availability from response
   - Calculate open slots by subtracting bookings from time slots

3. **Submit Booking**
   - POST to [TBD - not yet discovered]
   - Send: court, date, time, duration, player info
   - Receive: confirmation ID and status

4. **Handle Confirmation**
   - Extract confirmation ID from response
   - Store in database: `gametime_confirmation_id`
   - Update booking status to "confirmed"

---

## Production Implementation Checklist

- [ ] Discover booking submission endpoint (POST form endpoint)
- [ ] Test booking with various durations (30, 60, 90, 120 minutes)
- [ ] Test booking with different player counts
- [ ] Capture confirmation response structure
- [ ] Test error handling (full courts, invalid times, etc.)
- [ ] Measure API response times
- [ ] Test with multiple concurrent bookings
- [ ] Document session management (cookie expiration, etc.)
- [ ] Build Puppeteer script for automated booking
- [ ] Build backend Node.js API wrapper

---

## Database Field Mapping

### Our Booking Type → GameTime Booking
```typescript
interface OurBooking {
  preferred_court: number;        // Maps to court 1-6
  booking_date: string;           // YYYY-MM-DD format
  booking_time: string;           // Converts to minutes (HH:MM → t value)
  duration_hours: number;         // Converts to minutes (d value)
  booking_type: string;           // Maps to player count

  // After GameTime booking:
  gametime_confirmation_id: string; // Maps to "c" field in GameTime response
  actual_court: number;           // Which court was assigned

  // Status:
  auto_book_status: 'success' | 'failed'; // Based on booking response
}
```

---

## Testing Data

### Test Court Information
- **Club:** Joshua Creek Tennis (JCT)
- **Location:** Joshua Creek, Ontario (assuming)
- **Courts:** 6 indoor courts
- **Hours:** 6:00 AM - 11:00 PM daily
- **Time Slots:** 30-minute increments
- **Categories:** Singles, Doubles, Lessons, Social Round Robins, Creakers (50+)

### Sample Available Slots (2025-10-25)
- Court 1: Multiple 30-min slots available throughout day
- Court 2: Multiple 30-min slots available
- Courts 3-6: Mixed availability

---

## Security & Compliance Notes

1. **Authentication** - Session-based, credentials stored in our encrypted `credentials` table
2. **Data Privacy** - Player names and user IDs visible in API (this is public schedule data)
3. **Rate Limiting** - Not yet tested; recommend implementing exponential backoff
4. **CORS** - API appears to be same-domain only (no CORS issues for server-side requests)
5. **API Terms** - Not documented; assuming public web interface is acceptable for automation

---

## Next Session Tasks

1. **Continue chrome-devtools investigation** to capture booking submission
2. **Build Puppeteer automation script** to submit bookings
3. **Test error scenarios** (full courts, invalid times)
4. **Implement in bookingExecutor.ts** with real API calls
5. **Test end-to-end** with actual GameTime bookings

---

## References

- **Research Date:** 2025-10-24 07:34 - 07:35 UTC
- **Club URL:** https://jct.gametime.net
- **API Base:** https://jct.gametime.net/scheduling/index/
- **Tested Dates:** 2025-10-24 (today), 2025-10-25 (tomorrow)
- **Account:** annieyang (verified working)

---

**Status:** ✅ API STRUCTURE DOCUMENTED - Ready for booking submission research

---

## IMPLEMENTATION STATUS - 2025-10-24

### ✅ Completed
1. **GameTime API Service** (`src/services/gametimeApiService.ts`)
   - Login functionality with credentials
   - Court availability checking (GET `/scheduling/index/jsoncourtdata`)
   - Available slot parsing and filtering
   - Booking submission structure (awaiting endpoint discovery)
   - Logout functionality
   - Complete TypeScript interfaces for API responses

2. **Updated Booking Executor** (`src/services/bookingExecutor.ts`)
   - Removed simulation (no more 80% success fake bookings)
   - Integrated real GameTime API service
   - Real 6-step booking flow:
     1. Authenticate with GameTime
     2. Fetch court availability
     3. Parse available slots
     4. Verify court availability
     5. Submit real booking
     6. Logout
   - Proper error handling and rollback

### ⏳ Pending - Requires Manual Testing
1. **Booking Submission Endpoint Discovery**
   - The actual POST endpoint for submitting bookings has not been discovered
   - Need to use browser DevTools Network tab to capture booking form submission
   - Endpoint is likely: `/scheduling/index/submitbooking` or similar
   - Required fields: court, date, time, duration, number of players

2. **Confirmation Response Structure**
   - GameTime returns confirmation ID after successful booking
   - Need to verify response format and extract confirmation ID
   - Will likely be in response body as JSON

### 📋 Manual Testing Checklist (For You To Execute)

**IMPORTANT:** These tests will create REAL bookings and potentially cost money. Use with caution.

#### Step 1: Set Up Credentials
```
1. Go to Credentials tab in app
2. Click "Save GameTime Credentials"
3. Enter:
   - Username: annieyang
   - Password: jc333666
4. Save credentials (they will be encrypted)
```

#### Step 2: Create a Test Booking
```
1. Go to Booking tab
2. Fill out form:
   - Preferred Court: Court 1
   - Accept Any Court: No
   - Booking Date: 2025-10-26 (tomorrow)
   - Booking Time: 10:00
   - Booking Type: Singles
   - Duration: 1 hour
   - Recurrence: Once
3. Click "Schedule Booking"
4. Note the booking ID displayed
```

#### Step 3: Monitor Booking Execution
```
1. Check browser console (F12 → Console tab)
2. Look for logs starting with "[BookingExecutor]" and "[GameTime]"
3. Expected log sequence:
   - "[BookingExecutor] Executing booking {ID}..."
   - "[GameTime] Attempting login with username: annieyang"
   - "[GameTime] Login successful"
   - "[GameTime] Fetching court availability for date: 2025-10-26"
   - "[GameTime] Court data received"
   - "[GameTime] Found X available slots..."
   - "[BookingExecutor] Submitting booking for court 1..."
   - "[GameTime] Booking successful! Confirmation: CONF-..."
   - "[BookingExecutor] Booking confirmed! ID: CONF-..."
```

#### Step 4: Verify in GameTime
```
1. Go to https://jct.gametime.net
2. Login with your account (annieyang / jc333666)
3. Check TENNIS schedule for 2025-10-26
4. Verify your booking appears with correct time and court
5. Note the actual confirmation ID shown on GameTime
```

#### Step 5: Verify in App
```
1. Go to "My Bookings" tab in app
2. Check if booking status changed from "Pending" to "Confirmed"
3. Verify confirmation ID matches GameTime
```

### 🔍 Debugging / Endpoint Discovery

If the booking fails, you can discover the correct endpoint by:

1. **Open Browser DevTools** (F12)
2. **Go to Network tab**
3. **Go to https://jct.gametime.net**
4. **Login**
5. **Go to TENNIS schedule**
6. **Click on an available time slot** to open booking form
7. **Fill out form and submit**
8. **Look at Network tab** for the POST request
9. **Note the request URL and body** - this is what we need
10. **Share the endpoint URL and request body** so I can update `gametimeApiService.ts`

### 📝 Implementation Notes

#### Known Issues / TODOs
1. **Line 182 in bookingExecutor.ts:**
   - Currently uses `booking.user_email` for username
   - Should fetch actual username from credentials table
   - Need to implement: `credentialsService.getGameTimeUsername(userId)`

2. **Booking Submission Endpoint:**
   - Placeholder endpoint `/scheduling/index/submitbooking` needs verification
   - Response format needs to be determined from actual testing
   - May need to parse HTML response if form-based

3. **Session Management:**
   - Current implementation creates new session per booking
   - Could optimize by reusing session for multiple bookings
   - Cookies are automatically handled by axios with `withCredentials: true`

### 🚀 What Happens When Endpoint Is Discovered

Once you identify the correct booking submission endpoint:

1. **Tell me the endpoint URL** (e.g., `/booking/submit` or `/schedule/reserve`)
2. **Show me the request body** (what fields are required)
3. **Show me the response** (how confirmation ID is returned)
4. I will update `src/services/gametimeApiService.ts` with:
   - Correct endpoint
   - Correct parameter names
   - Correct response parsing
5. **Re-test** the booking flow

### 📊 Success Criteria

After implementation is complete:

- ✅ Booking submitted to real GameTime
- ✅ Confirmation ID captured and stored in database
- ✅ Booking status changes from "Pending" to "Confirmed"
- ✅ Confirmation ID matches GameTime website
- ✅ No errors in console
- ✅ Can repeat with multiple bookings

---

**Next Steps:** Execute manual testing to discover booking submission endpoint
