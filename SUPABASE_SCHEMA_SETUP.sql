/*
 * JC COURT BOOKING TOOL - SUPABASE DATABASE SCHEMA
 *
 * BEFORE RUNNING THIS SCRIPT:
 * ==========================================
 * 1. Create a Supabase project at https://supabase.com (free tier is sufficient)
 * 2. Navigate to your project's SQL Editor in the Supabase Dashboard
 * 3. Copy this entire script and paste it into the SQL Editor
 * 4. Click "Run" to execute all statements
 * 5. Verify all tables are created successfully
 * 6. Copy your project URL and API key to the .env.local file in your React Native app
 *
 * IMPORTANT NOTES:
 * ==========================================
 * - Supabase auth.users table is automatically created when you enable authentication
 * - This script extends the built-in auth.users table with custom user profiles
 * - Row Level Security (RLS) is enabled for all custom tables
 * - Credentials are encrypted on the client side before storage (no plaintext passwords)
 * - All timestamps use UTC timezone
 * - The app will use the anonymous API key which has RLS policies applied
 *
 * TABLES CREATED:
 * ==========================================
 * 1. user_profiles - Extended user information
 * 2. credentials - Encrypted user credentials for external services (gametime.net)
 */

-- ================================================================
-- TABLE 1: USER PROFILES
-- ================================================================
-- Extends the built-in auth.users table with additional user information
-- This table links to auth.users via user_id foreign key

CREATE TABLE IF NOT EXISTS public.user_profiles (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key to Supabase auth.users
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User Information
  display_name TEXT,
  phone_number TEXT,
  bio TEXT,
  avatar_url TEXT,

  -- Subscription/Plan Information
  subscription_plan VARCHAR(50) DEFAULT 'free', -- 'free', 'basic', 'pro'
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
  ON public.user_profiles(user_id);

-- Create index on created_at for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at
  ON public.user_profiles(created_at DESC);

-- ================================================================
-- TABLE 2: CREDENTIALS
-- ================================================================
-- Stores encrypted user credentials for external services (gametime.net)
-- Passwords are encrypted on the client side before being sent to the database
-- This ensures the database never contains plaintext passwords

CREATE TABLE IF NOT EXISTS public.credentials (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key to user_profiles (cascade delete when user is deleted)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Credential Information
  platform VARCHAR(100) NOT NULL DEFAULT 'gametime.net', -- Service name (gametime.net, etc)
  username TEXT NOT NULL,
  password TEXT NOT NULL, -- Always encrypted (never plaintext)

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: Only one credential set per platform per user
  UNIQUE(user_id, platform)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_credentials_user_id
  ON public.credentials(user_id);

-- Create index on platform for filtering
CREATE INDEX IF NOT EXISTS idx_credentials_platform
  ON public.credentials(platform);

-- Create index on is_active for finding active credentials
CREATE INDEX IF NOT EXISTS idx_credentials_is_active
  ON public.credentials(is_active);

-- Create index on created_at for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_credentials_created_at
  ON public.credentials(created_at DESC);

-- ================================================================
-- TRIGGER: Auto-update user_profiles.updated_at
-- ================================================================
-- Automatically updates the updated_at timestamp whenever a row is modified

CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- ================================================================
-- TRIGGER: Auto-update credentials.updated_at
-- ================================================================
-- Automatically updates the updated_at timestamp whenever a row is modified

CREATE OR REPLACE FUNCTION update_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_credentials_updated_at
  BEFORE UPDATE ON public.credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_credentials_updated_at();

-- ================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ================================================================
-- RLS ensures users can only access their own data

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on credentials
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES: USER_PROFILES
-- ================================================================
-- Users can only see their own profile

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own profile
CREATE POLICY "Users can create their own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- RLS POLICIES: CREDENTIALS
-- ================================================================
-- Users can only see, create, update, and delete their own credentials

-- Policy: Users can view their own credentials
CREATE POLICY "Users can view their own credentials"
  ON public.credentials
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create credentials
CREATE POLICY "Users can create credentials"
  ON public.credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own credentials
CREATE POLICY "Users can update their own credentials"
  ON public.credentials
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own credentials
CREATE POLICY "Users can delete their own credentials"
  ON public.credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- GRANTS: Anonymous Role (used by app with API key)
-- ================================================================
-- The app uses the anonymous API key with RLS policies for access control

-- Grant permissions on user_profiles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO anon;

-- Grant permissions on credentials
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credentials TO anon;

-- Grant usage on sequences (for auto-generated IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ================================================================
-- INITIAL DATA / SETUP VERIFICATION
-- ================================================================
-- Uncomment the following to verify tables were created successfully

-- SELECT 'user_profiles table created' as status;
-- SELECT 'credentials table created' as status;

-- ================================================================
-- END OF SCHEMA SETUP
-- ================================================================
-- After running this script successfully, you should see:
-- - 2 tables created (user_profiles, credentials)
-- - 4 indexes per table
-- - 2 triggers (for auto-updating timestamps)
-- - 8 RLS policies total (4 per table)
-- - All functions and permissions configured
--
-- If any errors occur, check that:
-- 1. You're in the correct Supabase project
-- 2. Authentication is enabled in your project
-- 3. You have the necessary permissions to create tables
--
-- For help: https://supabase.com/docs
