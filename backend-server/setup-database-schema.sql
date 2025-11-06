-- ================================================
-- JC Court Booking App - Complete Database Schema
-- Run this FIRST to create all tables
-- ================================================

-- ================================================
-- USER_CREDENTIALS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gametime_username TEXT NOT NULL,
  gametime_password TEXT NOT NULL, -- Encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- Each user can only have one set of credentials
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);

-- ================================================
-- BOOKINGS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_court INTEGER NOT NULL,
  accept_any_court BOOLEAN DEFAULT FALSE,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('singles', 'doubles')),
  duration_hours NUMERIC(3,1) NOT NULL CHECK (duration_hours IN (1, 1.5)),
  recurrence TEXT NOT NULL CHECK (recurrence IN ('once', 'weekly', 'bi-weekly', 'monthly')),
  recurrence_end_date DATE,
  scheduled_execute_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  auto_book_status TEXT NOT NULL DEFAULT 'pending' CHECK (auto_book_status IN ('pending', 'in_progress', 'success', 'failed')),
  gametime_confirmation_id TEXT,
  actual_court INTEGER,
  status_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_auto_book_status ON bookings(auto_book_status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_execute_time ON bookings(scheduled_execute_time);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);

-- ================================================
-- UPDATE TRIGGERS
-- ================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_credentials
DROP TRIGGER IF EXISTS update_user_credentials_updated_at ON user_credentials;
CREATE TRIGGER update_user_credentials_updated_at
  BEFORE UPDATE ON user_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to bookings
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
