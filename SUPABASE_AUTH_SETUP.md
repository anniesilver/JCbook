# Supabase Authentication & Database Setup Guide

## Overview

This guide provides step-by-step instructions for setting up Supabase as the backend for the JC Court Booking Tool. The setup includes:

- Creating a Supabase project
- Enabling authentication
- Creating database tables and RLS policies
- Configuring your React Native app to connect to Supabase

**Estimated Time:** 15-20 minutes

---

## Step 1: Create a Supabase Project

### 1.1 Go to Supabase Website

1. Visit [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"** if you already have an account

### 1.2 Create an Account (if needed)

1. Click **"Sign Up"**
2. Choose one of:
   - Sign up with GitHub (recommended)
   - Sign up with Google
   - Sign up with email/password
3. Follow the email verification process if needed

### 1.3 Create a New Project

1. Click **"New Project"**
2. Enter project details:
   - **Name:** `JC Court Booking` (or your preferred name)
   - **Database Password:** Create a strong password (save this somewhere safe)
   - **Region:** Select the region closest to you
   - **Pricing Plan:** Select "Free" (sufficient for development)
3. Click **"Create New Project"**

**Wait 2-5 minutes** for the project to be created. You'll see a loading screen.

### 1.4 Verify Project Creation

Once the project is ready, you'll see the Supabase dashboard. Save these credentials (you'll need them later):

- **Project URL:** Found in Settings > API > Project URL
- **Anon Public Key:** Found in Settings > API > Project API keys > `anon` key

---

## Step 2: Enable Email/Password Authentication

### 2.1 Configure Auth Providers

1. In the Supabase dashboard, go to **Authentication > Providers**
2. Find **"Email"** provider (should be enabled by default)
3. If not enabled, click the toggle to enable it
4. Click on **"Email"** to configure:
   - **Confirm email:** Toggle ON (requires email verification)
   - Or toggle OFF for testing (users can sign up without email verification)
   - Click **"Save"**

**For Development/Testing:**
- Disable email confirmation to quickly test the app without email verification
- **For Production:** Enable email verification for security

### 2.2 (Optional) Enable Disable Email Confirmation for Testing

If you want to test without email verification:

1. Go to **Authentication > Providers > Email**
2. Find **"Confirm email"** toggle
3. Toggle OFF
4. Click **"Save"**

This allows users to register and immediately log in without confirming their email.

---

## Step 3: Create Database Tables & RLS Policies

### 3.1 Open the SQL Editor

1. In the Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**

### 3.2 Run the Schema Setup Script

1. Open the file: `SUPABASE_SCHEMA_SETUP.sql` from the JC Court Booking project
2. Copy the entire contents
3. Paste it into the SQL Editor in Supabase
4. Click **"Run"** button (or press Ctrl+Enter)

**Expected Output:**
```
Success. No rows returned
```

### 3.3 Verify Tables Were Created

1. Go to **Table Editor** (left sidebar)
2. You should see two new tables:
   - `user_profiles`
   - `credentials`
3. Click on each table to verify the columns match the schema

**If tables are not visible:**
- Refresh the page
- Check that the SQL ran without errors
- Look for error messages in the output panel

---

## Step 4: Configure Your React Native App

### 4.1 Get Your Supabase Credentials

1. Go to **Settings > API** in your Supabase project
2. Copy these values:
   - **Project URL**
   - **Anon Public Key** (under Project API keys)

### 4.2 Update Environment Variables

1. In your React Native project, open `.env.local` file (or create it if it doesn't exist)
2. Add/update the following:

```env
EXPO_PUBLIC_SUPABASE_URL=your_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Example:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://xyzabc123.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.3 Restart Your Development Server

1. If your Expo development server is running, stop it (press Ctrl+C)
2. Start it again:
   ```bash
   npx expo start
   ```

---

## Step 5: Test Authentication

### 5.1 Register a Test User

1. Open your app on your device or web browser
2. Go to the **Register** screen
3. Enter test credentials:
   - **Email:** `test@example.com`
   - **Password:** `TestPassword123!` (must be 8+ characters)
4. Click **"Sign Up"**

**Expected Result:**
- User account created in Supabase
- Automatically logged in
- Redirected to app screens (Home tab)

### 5.2 Verify User in Supabase Dashboard

1. Go to **Authentication > Users** in your Supabase project
2. You should see your test user in the list
3. Click the user to see details

### 5.3 Verify User Profile Created

1. Go to **Table Editor > user_profiles**
2. You should see a row with your test user's ID
3. This profile was auto-created by your app (if implemented)

---

## Step 6: Test Credential Storage

### 6.1 Save Test Credentials

1. In your app, go to the **Credentials** tab
2. Click **"Add Credentials"** or similar button
3. Enter test credentials:
   - **Username:** `testuser`
   - **Password:** `testpassword123`
4. Click **"Save"**

**Expected Result:**
- Credentials saved (encrypted)
- No plaintext password stored
- Credentials appear in the list

### 6.2 Verify Credentials in Database

1. Go to **Table Editor > credentials** in Supabase
2. You should see a row with:
   - `user_id`: Your test user's ID
   - `username`: `testuser`
   - `password`: Encrypted (not readable plaintext)
   - `created_at`: Current timestamp

---

## Advanced Configuration (Optional)

### Enable Email Verification

For production, enable email verification:

1. Go to **Authentication > Providers > Email**
2. Toggle **"Confirm email"** ON
3. Configure email templates:
   - Go to **Authentication > Email Templates**
   - Customize the confirmation email if needed

### Enable Social Authentication

To add Google/GitHub sign-in:

1. Go to **Authentication > Providers**
2. Click on **"Google"** or **"GitHub"**
3. Follow the provider-specific setup steps
4. Enter your OAuth credentials

### Enable Multi-Factor Authentication (MFA)

For enhanced security:

1. Go to **Authentication > Settings**
2. Find **"Authentication"** section
3. Toggle **"TOTP"** (Time-based One-Time Password) ON

---

## Troubleshooting

### Problem: "Missing Supabase configuration" Error

**Solution:**
- Verify `.env.local` file exists in your project root
- Check that `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart your development server (`npx expo start --clear`)

### Problem: Tables Don't Appear in Table Editor

**Solution:**
1. Refresh the Supabase dashboard
2. Check the SQL Editor for error messages
3. Run the schema setup script again
4. Verify you're looking in the `public` schema (not other schemas)

### Problem: RLS Errors When Saving Credentials

**Solution:**
- Verify user is authenticated (not null in auth)
- Check that RLS policies were created (go to Table Editor > Click table > "Policies" tab)
- Ensure the `user_id` in your data matches `auth.uid()`

### Problem: "Invalid password" or Authentication Fails

**Solution:**
- Verify email is entered correctly
- Check that password is at least 8 characters
- Try creating a new test user
- Check Supabase logs for detailed error messages

### Problem: SSL/Certificate Error

**Solution:**
- This is usually a network issue
- Try on a different network
- Check your firewall/proxy settings
- Clear browser cache and try again

---

## Security Best Practices

### 1. Protect Your API Keys

- **Never commit .env.local to version control**
- Add `.env.local` to `.gitignore`
- Don't share your Supabase credentials publicly
- For team development, use Supabase's built-in API key management

### 2. Use Row Level Security (RLS)

- All tables should have RLS enabled (done in this setup)
- RLS policies ensure users can only access their own data
- Never disable RLS in production

### 3. Encrypt Sensitive Data

- Passwords are encrypted client-side before storage (done in this app)
- Never store plaintext passwords
- Consider adding encryption for other sensitive fields

### 4. Password Requirements

Enforce strong passwords:
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, special characters
- Password confirmation on registration

### 5. Session Management

- Sessions automatically expire (default: 1 hour)
- Refresh tokens extend sessions
- Secure token storage (using expo-secure-store)

---

## Database Schema Summary

### user_profiles Table
Stores additional user information beyond what's in `auth.users`:
- `id` - Unique identifier (UUID)
- `user_id` - Link to auth.users (Foreign Key)
- `display_name` - User's display name
- `phone_number` - Contact number
- `bio` - User biography
- `avatar_url` - Profile picture URL
- `subscription_plan` - 'free', 'basic', 'pro'
- `is_active` - Account active status
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

**RLS Policies:**
- Users can view their own profile
- Users can create their own profile
- Users can update their own profile
- Users can delete their own profile

### credentials Table
Stores encrypted credentials for external services:
- `id` - Unique identifier (UUID)
- `user_id` - Link to auth.users (Foreign Key)
- `platform` - Service name (e.g., 'gametime.net')
- `username` - Service username
- `password` - Encrypted password (never plaintext)
- `is_active` - Credential active status
- `last_used_at` - Last usage timestamp
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Constraints:**
- Only one credential per platform per user (UNIQUE constraint)
- Automatic cascade deletion when user is deleted

**RLS Policies:**
- Users can view their own credentials
- Users can create credentials
- Users can update their own credentials
- Users can delete their own credentials

---

## Next Steps

After completing this setup:

1. **Test the authentication flow** - Register, login, logout
2. **Test credential storage** - Save, view, update, delete credentials
3. **Proceed to next features:**
   - Booking form implementation
   - Puppeteer automation setup
   - Background task scheduling

---

## Useful Supabase Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Authentication Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [API Reference](https://supabase.com/docs/reference/javascript)
- [Troubleshooting Guide](https://supabase.com/docs/guides/troubleshooting)

---

## Support

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review Supabase logs: **Settings > Logs**
3. Check console output in your React Native app (Expo)
4. Visit the [Supabase Community](https://github.com/supabase/supabase/discussions)

---

**Setup Complete!** Your JC Court Booking Tool backend is now ready for development.
