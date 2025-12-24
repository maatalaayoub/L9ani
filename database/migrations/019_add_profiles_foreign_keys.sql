-- =====================================================
-- L9ani Database Migration: Add Profiles Foreign Keys
-- =====================================================
-- This migration adds foreign key constraints from reports
-- and sighting_reports tables to the profiles table,
-- enabling Supabase to automatically join and fetch
-- owner profile information.
-- =====================================================

-- =====================================================
-- STEP 0: Ensure auth_user_id has a unique constraint
-- =====================================================
-- Foreign keys can only reference columns with unique constraints
-- The profiles.auth_user_id should be unique (one profile per user)

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_auth_user_id_unique'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_auth_user_id_unique UNIQUE (auth_user_id);
    END IF;
END $$;

-- =====================================================
-- STEP 1: Add Foreign Key from reports to profiles
-- =====================================================
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reports_user_id_profiles_fkey'
        AND table_name = 'reports'
    ) THEN
        ALTER TABLE reports DROP CONSTRAINT reports_user_id_profiles_fkey;
    END IF;
END $$;

-- Add foreign key constraint from reports.user_id to profiles.auth_user_id
ALTER TABLE reports
ADD CONSTRAINT reports_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(auth_user_id)
ON DELETE CASCADE;

-- =====================================================
-- STEP 2: Add Foreign Key from sighting_reports to profiles
-- =====================================================
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sighting_reports_user_id_profiles_fkey'
        AND table_name = 'sighting_reports'
    ) THEN
        ALTER TABLE sighting_reports DROP CONSTRAINT sighting_reports_user_id_profiles_fkey;
    END IF;
END $$;

-- Add foreign key constraint from sighting_reports.user_id to profiles.auth_user_id
ALTER TABLE sighting_reports
ADD CONSTRAINT sighting_reports_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(auth_user_id)
ON DELETE CASCADE;

-- =====================================================
-- STEP 3: Create indexes for better join performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sighting_reports_user_id ON sighting_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- =====================================================
-- VERIFICATION: Test the relationships
-- =====================================================
-- After running this migration, you can test the joins with:
--
-- SELECT r.*, p.full_name, p.avatar_url 
-- FROM reports r 
-- LEFT JOIN profiles p ON r.user_id = p.auth_user_id 
-- LIMIT 5;
--
-- Or using Supabase client:
-- supabase.from('reports').select('*, profiles(full_name, avatar_url)')
-- =====================================================
