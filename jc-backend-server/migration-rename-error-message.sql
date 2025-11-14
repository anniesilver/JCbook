-- ================================================
-- Database Migration: Rename error_message to status_message
-- Purpose: The field now stores both success and error messages
-- ================================================

-- Rename the column in bookings table
ALTER TABLE bookings
RENAME COLUMN error_message TO status_message;

-- Add comment to document the field purpose
COMMENT ON COLUMN bookings.status_message IS 'Stores booking status messages including both success messages (e.g., "Booking confirmed on Court 3") and error messages (e.g., "No courts available")';

-- Update RLS policies if needed (none reference error_message specifically, so no changes needed)

-- Migration complete
SELECT 'Migration complete: error_message renamed to status_message' AS result;
