/*
 * JC COURT BOOKING TOOL - BOOKINGS TABLE MIGRATION
 *
 * This migration script creates the bookings table with support for:
 * - Automated court booking scheduling
 * - Multiple court options with fallback to any court
 * - Singles/Doubles booking types
 * - Flexible duration options (1 or 1.5 hours)
 * - Recurring bookings (Once, Weekly, Bi-Weekly, Monthly)
 * - GameTime integration tracking
 *
 * BEFORE RUNNING THIS SCRIPT:
 * ==========================================
 * 1. Navigate to your Supabase project's SQL Editor
 * 2. Copy this entire script and paste it into the SQL Editor
 * 3. Click "Run" to execute all statements
 * 4. Verify the bookings table is created successfully
 *
 * IMPORTANT NOTES:
 * ==========================================
 * - Bookings are linked to users via user_id foreign key
 * - All timestamps use UTC timezone
 * - Row Level Security (RLS) is enabled so users can only see their own bookings
 * - The scheduler service will query bookings by scheduled_execute_time
 * - GameTime confirmation tracking is optional (only when booking succeeds)
 */

-- ================================================================
-- TABLE: BOOKINGS
-- ================================================================
-- Stores all user-created automated booking requests
-- Each booking can have multiple instances if it's a recurring booking

CREATE TABLE IF NOT EXISTS public.bookings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key to auth.users (cascade delete when user is deleted)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Court Selection
  preferred_court INTEGER NOT NULL, -- 1-6 representing courts at the facility
  accept_any_court BOOLEAN NOT NULL DEFAULT FALSE, -- If true, try other courts if preferred is unavailable

  -- Booking Details
  booking_date TEXT NOT NULL, -- ISO format YYYY-MM-DD
  booking_time TEXT NOT NULL, -- HH:mm format (24-hour)
  booking_type VARCHAR(20) NOT NULL, -- 'singles' or 'doubles'
  duration_hours NUMERIC NOT NULL, -- 1 or 1.5 hours

  -- Actual Court (filled after successful booking)
  actual_court INTEGER, -- Which court was actually booked (NULL until confirmed)
  court TEXT, -- Legacy field for backward compatibility

  -- Booking Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
  auto_book_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'success', 'failed'

  -- Scheduling Info
  scheduled_execute_time TIMESTAMP WITH TIME ZONE NOT NULL, -- When to execute the booking (8:00 AM on 7-day-before date)

  -- GameTime Integration
  gametime_confirmation_id TEXT, -- Confirmation ID from GameTime when booking succeeds
  error_message TEXT, -- Error details if booking failed

  -- Recurrence
  recurrence VARCHAR(50) NOT NULL DEFAULT 'once', -- 'once', 'weekly', 'bi-weekly', 'monthly'
  recurrence_end_date TEXT, -- ISO format YYYY-MM-DD (optional, only for recurring bookings)

  -- Retry Logic
  retry_count INTEGER NOT NULL DEFAULT 0, -- Number of times the scheduler has tried to book this

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON public.bookings(user_id);

-- Create index on scheduled_execute_time for scheduler queries (very important!)
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_execute_time
  ON public.bookings(scheduled_execute_time)
  WHERE auto_book_status = 'pending';

-- Create index on auto_book_status for filtering pending bookings
CREATE INDEX IF NOT EXISTS idx_bookings_auto_book_status
  ON public.bookings(auto_book_status);

-- Create index on booking_date for user's future bookings query
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date
  ON public.bookings(booking_date);

-- Create index on created_at for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_bookings_created_at
  ON public.bookings(created_at DESC);

-- ================================================================
-- TABLE: RECURRING_BOOKING_INSTANCES
-- ================================================================
-- Tracks individual instances of recurring bookings
-- When a user creates a recurring booking, this table stores each generated instance

CREATE TABLE IF NOT EXISTS public.recurring_booking_instances (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Instance Details
  instance_date TEXT NOT NULL, -- ISO format YYYY-MM-DD (specific date for this instance)
  instance_booking_id UUID, -- Reference to the actual booking created for this instance

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'created', 'failed', 'skipped'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on parent_booking_id for finding all instances of a booking
CREATE INDEX IF NOT EXISTS idx_recurring_booking_instances_parent_booking_id
  ON public.recurring_booking_instances(parent_booking_id);

-- Create index on user_id for user's recurring instances
CREATE INDEX IF NOT EXISTS idx_recurring_booking_instances_user_id
  ON public.recurring_booking_instances(user_id);

-- Create index on instance_date for querying by date
CREATE INDEX IF NOT EXISTS idx_recurring_booking_instances_instance_date
  ON public.recurring_booking_instances(instance_date);

-- ================================================================
-- TRIGGER: Auto-update bookings.updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_updated_at();

-- ================================================================
-- TRIGGER: Auto-update recurring_booking_instances.updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION update_recurring_booking_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recurring_booking_instances_updated_at
  BEFORE UPDATE ON public.recurring_booking_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_booking_instances_updated_at();

-- ================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_booking_instances ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES: BOOKINGS
-- ================================================================

-- Policy: Users can view their own bookings
CREATE POLICY "Users can view their own bookings"
  ON public.bookings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create bookings for themselves
CREATE POLICY "Users can create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bookings
CREATE POLICY "Users can update their own bookings"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own bookings
CREATE POLICY "Users can delete their own bookings"
  ON public.bookings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- RLS POLICIES: RECURRING_BOOKING_INSTANCES
-- ================================================================

-- Policy: Users can view their own recurring booking instances
CREATE POLICY "Users can view their own recurring booking instances"
  ON public.recurring_booking_instances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create recurring booking instances
CREATE POLICY "Users can create recurring booking instances"
  ON public.recurring_booking_instances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recurring booking instances
CREATE POLICY "Users can update their own recurring booking instances"
  ON public.recurring_booking_instances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own recurring booking instances
CREATE POLICY "Users can delete their own recurring booking instances"
  ON public.recurring_booking_instances
  FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- GRANTS: Anonymous Role (used by app with API key)
-- ================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_booking_instances TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ================================================================
-- END OF BOOKINGS MIGRATION
-- ================================================================
-- After running this script successfully, you should see:
-- - 2 new tables created (bookings, recurring_booking_instances)
-- - 5 indexes on bookings table + 3 indexes on recurring_booking_instances
-- - 2 triggers (for auto-updating timestamps)
-- - 8 RLS policies total (4 per table)
-- - All permissions configured
--
-- The bookings table is now ready to receive booking requests from the mobile app
-- The scheduler service can query pending bookings by scheduled_execute_time
--
