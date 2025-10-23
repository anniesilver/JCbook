# Supabase Setup Instructions for Testing

## Overview
The JC Court Booking Tool requires a valid Supabase project for authentication and data storage. Follow these steps to set up Supabase and enable testing.

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project" or "Sign up"
3. Sign up with GitHub, Google, or email
4. Verify your email if required

## Step 2: Create New Project

1. After logging in, click "New Project"
2. Fill in the project details:
   - **Name**: `jc-court-booking` (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Select "Free" tier (sufficient for testing)
3. Click "Create new project"
4. Wait 2-3 minutes for the project to be provisioned

## Step 3: Get Project Credentials

1. Once the project is ready, navigate to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. You'll see two important values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Anon (public) key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
4. Copy both values - you'll need them in the next step

## Step 4: Update .env.local File

Replace the placeholder values in `.env.local` with your actual credentials:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-anon-key-here
```

## Step 5: Set Up Database Tables (Optional but Recommended)

The app will work with just the authentication, but for full testing, you may want to create the credentials table:

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Paste this SQL:

```sql
-- Create credentials table for storing user credentials
CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(255) NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable Row Level Security
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only access their own credentials
CREATE POLICY "Users can manage their own credentials"
  ON credentials
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_platform ON credentials(platform);
```

4. Click "Run" to execute the query

## Step 6: Enable Email Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Make sure **Email** provider is enabled (it should be by default)
3. For testing purposes, you can:
   - Disable "Confirm email" if you want faster testing (not recommended for production)
   - Or keep it enabled and check the "Auth" section for verification emails

## Step 7: Create Test User (Optional)

You can create a test user directly in Supabase dashboard:

1. Go to **Authentication** > **Users**
2. Click "Add user" > "Create new user"
3. Enter test credentials:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Auto Confirm User: Check this box (for testing)
4. Click "Create user"

## Step 8: Verify Setup

After updating .env.local with your credentials, the tester will:
1. Start the development server
2. Verify the app launches without "Missing Supabase configuration" error
3. Test registration and login flows
4. Execute all 23 test cases

## Important Security Notes

- The **anon key** is safe to expose in client-side code (it's meant to be public)
- Never commit the **service role key** to version control
- For production, enable email confirmation and other security features
- The free tier has limits (50,000 monthly active users, 500 MB database)

## Troubleshooting

**Error: "Invalid API key"**
- Double-check you copied the anon key correctly (it's very long)
- Make sure there are no extra spaces or line breaks

**Error: "Failed to fetch"**
- Check your internet connection
- Verify the project URL is correct
- Ensure the project is not paused (free tier projects pause after 1 week of inactivity)

**Error: "Email not confirmed"**
- Either disable email confirmation in Auth settings
- Or check the Auth > Users section for the verification link

## Next Steps

Once you've completed these steps, provide the tester with:
1. Confirmation that the .env.local file has been updated
2. The test user credentials you created (or confirm test@example.com / TestPassword123! works)
3. Any additional information about the Supabase setup

The tester can then proceed with executing all 23 test cases.
