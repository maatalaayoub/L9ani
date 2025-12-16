-- =====================================================
-- L9ani Database Migration: Remove Legacy Tables
-- =====================================================
-- This migration removes the old missing_persons table
-- since we've migrated to the new modular reports schema.
-- 
-- WARNING: Only run this AFTER ensuring all data has been
-- migrated to the new schema or if no data exists!
-- =====================================================

-- =====================================================
-- STEP 1: Drop Legacy Tables
-- =====================================================

-- Drop policies first
DROP POLICY IF EXISTS "Users can view approved missing persons" ON missing_persons;
DROP POLICY IF EXISTS "Users can insert their own reports" ON missing_persons;
DROP POLICY IF EXISTS "Users can update their own pending reports" ON missing_persons;
DROP POLICY IF EXISTS "Admins can update any report" ON missing_persons;
DROP POLICY IF EXISTS "Users can delete their own pending reports" ON missing_persons;

-- Drop triggers
DROP TRIGGER IF EXISTS update_missing_persons_updated_at ON missing_persons;

-- Drop indexes
DROP INDEX IF EXISTS idx_missing_persons_user_id;
DROP INDEX IF EXISTS idx_missing_persons_status;
DROP INDEX IF EXISTS idx_missing_persons_city;
DROP INDEX IF EXISTS idx_missing_persons_created_at;

-- Drop the table
DROP TABLE IF EXISTS missing_persons CASCADE;

-- Also drop the sightings table if it exists (not used in new schema)
DROP POLICY IF EXISTS "Users can view approved sightings" ON sightings;
DROP POLICY IF EXISTS "Users can insert their own sightings" ON sightings;
DROP POLICY IF EXISTS "Users can update their own pending sightings" ON sightings;
DROP POLICY IF EXISTS "Admins can update any sighting" ON sightings;
DROP TABLE IF EXISTS sightings CASCADE;

-- =====================================================
-- Cleanup Complete
-- =====================================================
-- The database now only uses the modular schema:
-- - reports (core table)
-- - report_details_person
-- - report_details_pet
-- - report_details_document
-- - report_details_electronics
-- - report_details_vehicle
-- - report_details_other
-- =====================================================
