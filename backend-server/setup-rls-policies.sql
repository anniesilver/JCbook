-- Row-Level Security Policies for JC Court Booking App
-- Run this in Supabase SQL Editor to allow users to create and view their bookings

-- Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;

-- Policy: Users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON bookings
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can create their own bookings
CREATE POLICY "Users can create own bookings"
ON bookings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bookings
CREATE POLICY "Users can update own bookings"
ON bookings
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own bookings
CREATE POLICY "Users can delete own bookings"
ON bookings
FOR DELETE
USING (auth.uid() = user_id);
