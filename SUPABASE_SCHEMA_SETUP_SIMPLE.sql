-- ========================================
-- JC COURT BOOKING TOOL - DATABASE SCHEMA
-- SIMPLE VERSION (Fixed)
-- ========================================

-- DROP TABLES IF THEY EXIST (to start fresh)
DROP TABLE IF EXISTS public.credentials CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ========================================
-- TABLE 1: USER PROFILES
-- ========================================
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone_number TEXT,
  bio TEXT,
  avatar_url TEXT,
  subscription_plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at DESC);

-- ========================================
-- TABLE 2: CREDENTIALS
-- ========================================
CREATE TABLE public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL DEFAULT 'gametime.net',
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_credentials_user_id ON public.credentials(user_id);
CREATE INDEX idx_credentials_platform ON public.credentials(platform);
CREATE INDEX idx_credentials_created_at ON public.credentials(created_at DESC);

-- ========================================
-- TRIGGERS: Auto-update updated_at
-- ========================================
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

-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES: USER_PROFILES
-- ========================================
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- RLS POLICIES: CREDENTIALS
-- ========================================
CREATE POLICY "Users can view their own credentials"
  ON public.credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create credentials"
  ON public.credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
  ON public.credentials
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
  ON public.credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- VERIFY TABLES WERE CREATED
-- ========================================
-- If you see output from these, the tables were created successfully:
SELECT 'user_profiles' as table_name, COUNT(*) as row_count FROM public.user_profiles
UNION ALL
SELECT 'credentials' as table_name, COUNT(*) as row_count FROM public.credentials;
