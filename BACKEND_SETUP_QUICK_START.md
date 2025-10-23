# Backend Setup Quick Start Guide

## What Was Created

Three files have been created to help you set up the Supabase backend for the JC Court Booking Tool:

### 1. SUPABASE_SCHEMA_SETUP.sql (9.2 KB)
**Location:** `C:\ANNIE-PROJECT\jc\SUPABASE_SCHEMA_SETUP.sql`

Complete SQL script containing:
- user_profiles table (extends auth.users)
- credentials table (encrypted credential storage)
- Indexes for performance
- Triggers for auto-update timestamps
- Row Level Security (RLS) policies
- Permission grants

**How to Use:**
1. Create a Supabase project at https://supabase.com
2. Copy the entire contents of this file
3. Paste into Supabase > SQL Editor
4. Click "Run"
5. Done! Tables are created and secured.

---

### 2. SUPABASE_AUTH_SETUP.md (12 KB)
**Location:** `C:\ANNIE-PROJECT\jc\SUPABASE_AUTH_SETUP.md`

Comprehensive step-by-step setup guide including:
- Creating a Supabase account and project (Step 1)
- Enabling email/password authentication (Step 2)
- Running the schema setup script (Step 3)
- Configuring your React Native app (Step 4)
- Testing the authentication flow (Step 5)
- Testing credential storage (Step 6)
- Advanced configuration options
- Troubleshooting guide
- Security best practices
- Database schema reference

**Follow these steps in order** - it will take 15-20 minutes.

---

### 3. BACKEND_SETUP_QUICK_START.md (This File)
Quick reference for what was created and how to use it.

---

## Quick Setup (5 Minutes)

If you already have Supabase experience, here's the quick version:

### Step 1: Create Project
1. Go to https://supabase.com
2. Sign up or sign in
3. Create new project (free tier)
4. Save your credentials:
   - Project URL
   - Anon Public Key

### Step 2: Create Database Tables
1. In Supabase dashboard, go to SQL Editor
2. Create new query
3. Copy entire contents of `SUPABASE_SCHEMA_SETUP.sql`
4. Paste into SQL Editor
5. Click "Run"

### Step 3: Configure App
1. Update `.env.local` file with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. Restart development server:
   ```bash
   npx expo start --clear
   ```

### Step 4: Test
1. Register new user in app
2. Save credentials in app
3. Verify both appear in Supabase dashboard

---

## Database Schema Overview

### user_profiles Table
Stores additional user information beyond basic auth:
- `id` - Unique profile ID
- `user_id` - Link to auth.users
- `display_name` - User's display name
- `phone_number` - Contact number
- `bio` - User bio/description
- `avatar_url` - Profile picture URL
- `subscription_plan` - 'free', 'basic', or 'pro'
- `is_active` - Account active status
- `created_at` - When created
- `updated_at` - Last updated (auto)

**RLS Security:** Users can only see/modify their own profile

### credentials Table
Stores encrypted credentials for external services:
- `id` - Unique credential ID
- `user_id` - Link to auth.users
- `platform` - Service name (e.g., 'gametime.net')
- `username` - Username for the service
- `password` - **ENCRYPTED** password (never plaintext!)
- `is_active` - Credential active status
- `last_used_at` - Last time this credential was used
- `created_at` - When created
- `updated_at` - Last updated (auto)

**RLS Security:** Users can only see/modify their own credentials
**Constraint:** Only one credential per platform per user

---

## What the Schema Provides

### Security
- Row Level Security (RLS) enabled
- Passwords encrypted before storage (client-side)
- Users can only access their own data
- Cascade delete: deleting a user removes all their credentials

### Performance
- Indexes on user_id for fast lookups
- Index on created_at for sorting
- Index on platform for filtering
- Index on is_active for quick status checks

### Reliability
- Auto-update timestamps (no manual management)
- Foreign key constraints (referential integrity)
- Unique constraints (prevent duplicates)

### Scalability
- PostgreSQL database (proven, reliable)
- Supabase cloud hosting (auto-scaling)
- No storage limits on free tier for development

---

## How This Connects to Your App

The app code already references this schema:

**authService.ts:**
- `login()` - Uses `auth.users` (built-in Supabase table)
- `register()` - Creates `auth.users` entry
- `logout()` - Clears session

**credentialsService.ts:**
- `saveCredentials()` - Inserts into `credentials` table
- `getCredentials()` - Queries `credentials` table
- `updateCredentials()` - Updates `credentials` table
- `deleteCredentials()` - Deletes from `credentials` table

**encryptionService.ts:**
- Encrypts passwords client-side before sending to database
- Decrypts passwords when retrieving from database
- Ensures passwords never stored in plaintext

---

## Security Features

### Client-Side Encryption
Passwords are encrypted using the browser's native crypto API before being sent to Supabase. This means:
- Supabase never sees plaintext passwords
- Only encrypted passwords stored in database
- Decryption happens in the app with user's data

### Row Level Security (RLS)
PostgreSQL RLS policies enforce data isolation:
- Users can only SELECT their own data
- Users can only INSERT/UPDATE/DELETE their own data
- No user can access another user's information

### Session Management
- JWT tokens used for authentication
- Sessions auto-expire after 1 hour
- Refresh tokens extend session duration
- Tokens stored securely on device

### API Key Security
- Anonymous API key used (no private key exposed)
- RLS policies prevent unauthorized access
- No bypass possible without valid JWT token

---

## Troubleshooting

### "Missing Supabase configuration" Error
**Solution:** Check `.env.local` file has both:
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY

### Tables Don't Appear
**Solution:**
1. Refresh Supabase dashboard
2. Check SQL ran without errors
3. Look for error messages in SQL Editor output

### RLS Errors When Saving Credentials
**Solution:**
1. Make sure you're logged in
2. Check user ID matches auth.uid()
3. Verify RLS policies were created

### Can't Register User
**Solution:**
1. Check email format is valid
2. Check password is 8+ characters
3. Verify project has auth enabled

---

## Next Steps

After setup is complete:

1. **Test Thoroughly**
   - Register test account
   - Save credentials
   - Update credentials
   - Delete credentials
   - Logout and log back in

2. **Verify Data**
   - Check Supabase > Table Editor > users
   - Check Supabase > Table Editor > credentials
   - Verify passwords are encrypted (not readable)

3. **Proceed to Next Features**
   - Booking form implementation
   - Puppeteer automation
   - Background tasks and notifications

---

## File Locations

All files are in your project root:

```
C:\ANNIE-PROJECT\jc\
├── SUPABASE_SCHEMA_SETUP.sql        <- SQL script to run
├── SUPABASE_AUTH_SETUP.md           <- Detailed setup guide
├── BACKEND_SETUP_QUICK_START.md     <- This file
├── PROGRESS.md                      <- Updated with backend documentation
├── .env.local                       <- Your Supabase credentials (CREATE THIS)
└── ... (other project files)
```

---

## Support & Resources

**Supabase Documentation:**
- Main: https://supabase.com/docs
- Auth: https://supabase.com/docs/guides/auth
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- API: https://supabase.com/docs/reference/javascript

**Common Issues:**
- https://supabase.com/docs/guides/troubleshooting

**Community Help:**
- https://github.com/supabase/supabase/discussions

---

## Summary

You now have everything needed to set up a secure, production-ready backend:

- **SUPABASE_SCHEMA_SETUP.sql** - Database tables and security
- **SUPABASE_AUTH_SETUP.md** - Step-by-step instructions
- **Encrypted credential storage** - Passwords never in plaintext
- **Row Level Security** - Data isolation per user
- **Auto-scaling infrastructure** - Supabase cloud hosting

Follow the steps in SUPABASE_AUTH_SETUP.md for detailed instructions, or use BACKEND_SETUP_QUICK_START.md above for quick reference.

**Estimated time to fully setup:** 15-20 minutes

Happy coding!
