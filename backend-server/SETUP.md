# JC Court Booking Backend Server - Setup Guide

Complete setup instructions for the automated court booking backend server.

## Overview

This backend server runs 24/7 on a Windows PC and automatically executes court bookings using Playwright browser automation. It polls the Supabase database every 60 seconds for pending bookings and executes them at the scheduled time.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** (comes with Node.js)
3. **Supabase Account** with a project set up
4. **Windows PC** that stays on 24/7

## Setup Steps

### 1. Database Setup

You need to set up the database schema in your Supabase project.

#### Option A: Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard → **SQL Editor**
2. Run the following scripts **in order**:

   **First**: `setup-database-schema.sql`
   - Creates `user_credentials` and `bookings` tables
   - Sets up indexes and triggers

   **Second**: `setup-rls-policies.sql`
   - Enables Row-Level Security (RLS)
   - Creates policies so users can only see their own data

#### Option B: Command Line
If you have `psql` configured:
```bash
psql <your-supabase-connection-string> -f setup-database-schema.sql
psql <your-supabase-connection-string> -f setup-rls-policies.sql
```

### 2. Environment Configuration

Create a `.env` file in the `backend-server` directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important**: Use the **SERVICE_ROLE_KEY**, not the anon key. The server needs full database access to execute bookings for all users.

### 3. Install Dependencies

```bash
cd backend-server
npm install
```

This will install:
- `@supabase/supabase-js` - Database client
- `playwright` - Browser automation
- `dotenv` - Environment variable loading

### 4. Install Playwright Browsers

Playwright needs to download browser binaries:

```bash
npx playwright install chromium
```

### 5. Start the Server

```bash
node server.js
```

You should see:
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

1. **Polling**: Server checks database every 60 seconds for pending bookings where `scheduled_execute_time <= NOW()`

2. **Court Fallback Logic** (NEW):
   - Tries preferred court first
   - If `accept_any_court = true` and preferred court fails:
     - Tries all other courts (1-6) one by one
     - Stops immediately when any court succeeds
   - Updates `status_message` with detailed feedback

3. **Booking Execution**:
   - Launches Playwright browser (Chromium)
   - Logs into GameTime.net with user credentials
   - Navigates to booking form
   - Generates fresh reCAPTCHA token
   - Submits booking via HTTP POST
   - Checks result (redirect to confirmation or error page)

4. **Database Updates**:
   - Success: `status = 'confirmed'`, `auto_book_status = 'success'`, stores confirmation ID and actual court
   - Failure: `auto_book_status = 'failed'`, stores error message in `status_message`

5. **Retry Logic**:
   - Failed bookings will retry up to 3 times
   - 2-second delay between bookings to avoid rate limiting

## Database Schema

### user_credentials
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users
- `gametime_username` (TEXT) - GameTime.net username
- `gametime_password` (TEXT) - Encrypted password
- `created_at`, `updated_at` (TIMESTAMPTZ)

### bookings
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users
- `preferred_court` (INTEGER) - Court number 1-6
- `accept_any_court` (BOOLEAN) - Try other courts if preferred unavailable
- `booking_date` (DATE) - Date in YYYY-MM-DD
- `booking_time` (TIME) - Time in HH:MM
- `booking_type` (TEXT) - 'singles' or 'doubles'
- `duration_hours` (NUMERIC) - 1 or 1.5
- `recurrence` (TEXT) - 'once', 'weekly', 'bi-weekly', or 'monthly'
- `scheduled_execute_time` (TIMESTAMPTZ) - When to execute the booking
- `status` (TEXT) - 'pending', 'confirmed', or 'cancelled'
- `auto_book_status` (TEXT) - 'pending', 'in_progress', 'success', or 'failed'
- `gametime_confirmation_id` (TEXT) - GameTime booking ID
- `actual_court` (INTEGER) - Which court was actually booked
- `status_message` (TEXT) - Success or error message shown to user
- `retry_count` (INTEGER) - Number of retry attempts
- `created_at`, `updated_at` (TIMESTAMPTZ)

## Migrating Existing Database

If you already have the database set up with the old `error_message` column:

1. Run `migration-rename-error-message.sql` to rename it to `status_message`

**For fresh setup**: Just run `setup-database-schema.sql` which already has the correct column name.

## Troubleshooting

### "Credentials not found for user"
- User hasn't saved their GameTime credentials in the mobile app
- Check `user_credentials` table in Supabase

### "Login failed - still on auth page"
- Username or password is incorrect
- Check credentials in database
- Test login manually at https://jct.gametime.net/auth

### Browser automation fails
- Ensure Playwright browsers are installed: `npx playwright install chromium`
- Check if Windows Firewall is blocking browser

### Database connection errors
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Check Supabase project is not paused

## Files Structure

```
backend-server/
├── server.js                           # Main server - polls database and executes bookings
├── playwrightBooking.js                # Playwright automation logic
├── decryptPassword.js                  # Password decryption (XOR + Base64)
├── setup-database-schema.sql           # Initial database schema (run FIRST)
├── setup-rls-policies.sql              # Row-Level Security policies (run SECOND)
├── migration-rename-error-message.sql  # Migration for existing databases only
├── package.json                        # Dependencies
├── .env                                # Environment variables (create this)
└── SETUP.md                            # This file
```

## Production Deployment

For production use:

1. **Set Playwright to headless mode**:
   - Edit `playwrightBooking.js` line 63: `headless: true`

2. **Run as Windows Service**:
   - Use `node-windows` or `pm2` to run server as a background service
   - Ensures server restarts after crashes or reboots

3. **Enable Logging**:
   - Redirect output to log file: `node server.js > booking.log 2>&1`

4. **Monitor Health**:
   - Set up monitoring to ensure server is running
   - Check logs regularly for errors

## Support

For issues or questions, check:
- Server console logs
- Supabase database tables
- Booking screenshots (saved in `backend-server/` directory)
