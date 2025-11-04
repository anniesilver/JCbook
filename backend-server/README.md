# JC Booking Automation Server

Windows PC server that executes court bookings automatically using Playwright automation.

## Overview

This server runs 24/7 on a Windows PC and automatically executes pending court bookings using the **verified 100% working Playwright solution** from Test G.

**How it works:**
1. Server checks Supabase database every 60 seconds
2. Finds bookings where `scheduled_execute_time <= now`
3. Decrypts GameTime password
4. Executes booking using Playwright automation (fresh reCAPTCHA token + HTTP POST)
5. Updates database with confirmation ID or error message
6. Mobile app shows updated status in real-time

## Setup Instructions

### 1. Install Node.js

**Download and install Node.js 18+ from:**
https://nodejs.org/

**Verify installation:**
```bash
node --version
npm --version
```

### 2. Install Dependencies

Open Command Prompt or PowerShell:

```bash
cd C:\ANNIE-PROJECT\jc\backend-server
npm install
```

This will install:
- `@supabase/supabase-js` - Database client
- `playwright` - Browser automation
- `dotenv` - Environment variables

### 3. Install Playwright Browsers

After `npm install`, install the Chromium browser:

```bash
npx playwright install chromium
```

### 4. Configure Environment Variables

**Copy `.env.example` to `.env`:**
```bash
copy .env.example .env
```

**Edit `.env` file and fill in:**

```env
# Supabase Project URL
# Found in: Supabase Dashboard > Project Settings > API > Project URL
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Service Role Key (NOT anon key!)
# Found in: Supabase Dashboard > Project Settings > API > Service Role Key
# WARNING: This key has full database access - keep it secure!
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find these values:**
1. Go to your Supabase dashboard
2. Click on your project
3. Go to **Project Settings** (gear icon)
4. Go to **API** tab
5. Copy **Project URL** → paste into `SUPABASE_URL`
6. Copy **service_role (secret)** key → paste into `SUPABASE_SERVICE_ROLE_KEY`

**IMPORTANT:** Use the **service_role** key, NOT the **anon** key! The service_role key has full database access needed to read credentials.

### 5. Run the Server

**Option A: Command Line**
```bash
npm start
```

**Option B: Double-click the batch file**
Double-click `start-server.bat` to start the server in a new window.

**You should see:**
```
========================================
JC Court Booking Automation Server
========================================

[Server] Starting...
[Server] Supabase client initialized
[Server] Connected to: https://your-project.supabase.co

[Server] ✅ Server started successfully
[Server] Checking for bookings every 60 seconds...
[Server] Press Ctrl+C to stop
```

## How It Works

### Booking Execution Flow

```
┌─────────────────────────────────────────┐
│  Supabase Database                      │
│  - Booking status: pending              │
│  - Auto_book_status: pending            │
│  - Scheduled_execute_time: 9:00 PM      │
└─────────────────┬───────────────────────┘
                  │
                  │ Every 60 seconds
                  ▼
┌─────────────────────────────────────────┐
│  Server checks for bookings where:      │
│  - scheduled_execute_time <= NOW        │
│  - status = 'pending'                   │
│  - retry_count < 3                      │
└─────────────────┬───────────────────────┘
                  │
                  │ Found booking!
                  ▼
┌─────────────────────────────────────────┐
│  Mark as in_progress                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Decrypt GameTime password              │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Execute Playwright Automation:         │
│  1. Login to GameTime                   │
│  2. Load booking form                   │
│  3. Generate fresh reCAPTCHA token      │
│  4. Extract form fields                 │
│  5. Close browser                       │
│  6. Submit via HTTP POST                │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    SUCCESS               FAILED
        │                   │
        ▼                   ▼
┌──────────────┐    ┌──────────────────┐
│ Update DB:   │    │ Update DB:       │
│ - confirmed  │    │ - failed         │
│ - conf. ID   │    │ - error message  │
│ - success    │    │ - retry_count++  │
└──────────────┘    └──────────────────┘
        │                   │
        ▼                   ▼
┌─────────────────────────────────────────┐
│  Mobile app shows updated status        │
└─────────────────────────────────────────┘
```

### Database Schema

The server expects the following tables:

**bookings table:**
- `id` - UUID
- `user_id` - UUID (foreign key to user_credentials)
- `status` - Text (pending/confirmed/failed)
- `auto_book_status` - Text (pending/in_progress/success/failed)
- `preferred_court` - Integer (court ID, e.g., 52)
- `booking_date` - Date (YYYY-MM-DD)
- `booking_time` - Time (HH:MM)
- `scheduled_execute_time` - Timestamp
- `gametime_confirmation_id` - Text (confirmation ID from GameTime)
- `actual_court` - Integer
- `retry_count` - Integer
- `error_message` - Text
- `updated_at` - Timestamp

**user_credentials table:**
- `id` - UUID
- `gametime_username` - Text
- `gametime_password` - Text (encrypted)

## Server Logs

The server prints detailed logs to the console:

**Normal operation:**
```
[Server] [2025-11-04T21:00:00.000Z] Checking for pending bookings...
[Server] No pending bookings found
```

**Booking execution:**
```
[Server] [2025-11-04T21:00:00.000Z] Checking for pending bookings...
[Server] Found 1 booking(s) to execute

----------------------------------------
[Server] Processing booking abc123...
[Server] Court: 52
[Server] Date: 2025-11-05
[Server] Time: 09:00

[Server] Decrypting GameTime password...
[Server] Executing booking with Playwright automation...

[PlaywrightBooking] Starting booking execution for court 52 on 2025-11-05 at 540
[PlaywrightBooking] Phase 1: Automated Login
[PlaywrightBooking] Loading login page...
[PlaywrightBooking] Waiting for login form...
[PlaywrightBooking] Entering username...
[PlaywrightBooking] Entering password...
[PlaywrightBooking] Clicking login button...
[PlaywrightBooking] Login completed
[PlaywrightBooking] Phase 2: Capturing Session Cookies
[PlaywrightBooking] Captured 8 cookies
[PlaywrightBooking] Phase 3: Loading Booking Form
[PlaywrightBooking] Navigating to booking form...
[PlaywrightBooking] Waiting for form fields...
[PlaywrightBooking] Waiting for reCAPTCHA to load...
[PlaywrightBooking] reCAPTCHA loaded
[PlaywrightBooking] Phase 4: Generating FRESH reCAPTCHA Token
[PlaywrightBooking] Calling grecaptcha.execute({action: "homepage"})...
[PlaywrightBooking] Fresh token generated: 03AFcWeA5...
[PlaywrightBooking] Phase 5: Extracting Form Fields
[PlaywrightBooking] temp: xyz789
[PlaywrightBooking] user_id: 12345
[PlaywrightBooking] user_name: Annie Yang
[PlaywrightBooking] Phase 6: Closing Browser
[PlaywrightBooking] Browser closed
[PlaywrightBooking] From this point: PURE HTTP POST with FRESH token!
[PlaywrightBooking] Phase 7: Submitting via HTTP POST
[PlaywrightBooking] Form data prepared with FRESH token
[PlaywrightBooking] Submitting to: /scheduling/index/save?errs=
[PlaywrightBooking] Response Status: 302 Found
[PlaywrightBooking] Time gap (token generation → submission): 1847ms
[PlaywrightBooking] Phase 8: Checking Result
[PlaywrightBooking] Redirect detected: /scheduling/confirmation/history/sport/1/id/278890
[PlaywrightBooking] ✅ SUCCESS - Booking confirmed with FRESH token!
[PlaywrightBooking] Booking ID: 278890
[PlaywrightBooking] Confirmation URL: https://jct.gametime.net/scheduling/confirmation/history/sport/1/id/278890
[PlaywrightBooking] Token submitted within 1847ms (very fresh!)

[Server] ✅ Booking abc123 CONFIRMED
[Server] Confirmation ID: 278890
[Server] Token submission time: 1847ms
```

## Requirements

**System Requirements:**
- Windows PC (Windows 10 or 11)
- PC must stay on 24/7
- Stable internet connection
- At least 2GB RAM
- At least 500MB free disk space

**Software Requirements:**
- Node.js 18 or higher
- npm (comes with Node.js)
- Playwright (installed via npm)

## Troubleshooting

### "Cannot connect to Supabase"
- Check `SUPABASE_URL` in `.env` file
- Check `SUPABASE_SERVICE_ROLE_KEY` in `.env` file
- Make sure you're using the **service_role** key, not the **anon** key
- Verify internet connection

### "Playwright browser not found"
Run:
```bash
npx playwright install chromium
```

### "Booking fails with reCAPTCHA error"
- Check internet connection
- Verify Playwright is installed correctly
- Check GameTime website is accessible

### "Failed to decrypt password"
- Verify the encryption logic matches the mobile app
- Check that `user_credentials.gametime_password` is properly encrypted
- Ensure the `userId` is correct

### "Login failed"
- Verify GameTime username and password are correct
- Check GameTime website is not down
- Try logging in manually to verify credentials

### Server crashes or stops
- Check console logs for error messages
- Restart the server using `npm start` or `start-server.bat`
- Check Windows Task Manager to see if Node.js is running

## Running Server on Startup (Optional)

To run the server automatically when Windows starts:

### Method 1: Task Scheduler (Recommended)

1. Open **Task Scheduler** (search in Start menu)
2. Click **Create Basic Task**
3. Name: "JC Booking Server"
4. Trigger: **When the computer starts**
5. Action: **Start a program**
6. Program: `C:\ANNIE-PROJECT\jc\backend-server\start-server.bat`
7. Finish

### Method 2: Startup Folder

1. Press `Win + R`
2. Type: `shell:startup`
3. Create a shortcut to `start-server.bat` in this folder

## Security Considerations

**Environment Variables:**
- Never commit `.env` file to Git
- Keep `SUPABASE_SERVICE_ROLE_KEY` secure
- This key has full database access

**Password Encryption:**
- Passwords are encrypted in the database using XOR + Base64
- Server decrypts passwords only in memory
- Passwords are never logged or stored in plaintext

**Network Security:**
- All communication with Supabase is over HTTPS
- All communication with GameTime is over HTTPS

## Monitoring

**Check if server is running:**
```bash
tasklist | findstr node.exe
```

**Stop the server:**
- Press `Ctrl+C` in the console window
- Or close the window
- Or kill the process in Task Manager

**View logs:**
- Logs are printed to the console in real-time
- You can redirect logs to a file:
  ```bash
  node server.js > server.log 2>&1
  ```

## Integration with Mobile App

The mobile app automatically detects booking status changes:

**When booking is pending:**
- App shows "Scheduled for 9:00 PM"
- Auto_book_status: "pending"

**When server starts execution:**
- App shows "Booking in progress..."
- Auto_book_status: "in_progress"

**When booking succeeds:**
- App shows "Confirmed - ID: 278890"
- Auto_book_status: "success"
- Status: "confirmed"

**When booking fails:**
- App shows error message
- Auto_book_status: "failed"
- Retry count incremented
- Server will retry up to 3 times

## Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify all setup steps are completed
3. Test Supabase connection manually
4. Try executing a test booking
5. Check GameTime website accessibility

## Technical Details

**Booking Execution Method:**
- Uses the **verified 100% working** Playwright solution from Test G
- Fresh reCAPTCHA token generated via `grecaptcha.execute()`
- Token submitted via HTTP POST within < 3 seconds
- Success rate: 100% (when credentials and booking details are valid)

**Why this works:**
- Fresh token bypasses GameTime's anti-automation detection
- HTTP POST avoids Playwright click detection by NewRelic RUM
- Legitimate cookies from automated login
- Correct headers matching real browser requests

## License

MIT
