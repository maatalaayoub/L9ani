-- =====================================================
-- L9ani Storage Setup: Create profile-pictures Bucket
-- =====================================================
-- Run this in Supabase SQL Editor to set up the storage
-- bucket for user profile pictures.
-- =====================================================

-- =====================================================
-- STEP 1: Create the storage bucket
-- =====================================================
-- Note: This needs to be done via Supabase Dashboard > Storage
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New Bucket"
-- 3. Name it: profile-pictures
-- 4. Make it PUBLIC (toggle on)
-- 5. Click "Create Bucket"

-- =====================================================
-- STEP 2: Set up storage policies (run in SQL Editor)
-- =====================================================

-- Drop existing policies first (if any)
DROP POLICY IF EXISTS "Users can upload their profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;

-- Allow authenticated users to upload their own profile picture
CREATE POLICY "Users can upload their profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own profile picture
CREATE POLICY "Users can update their profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-pictures' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own profile picture
CREATE POLICY "Users can delete their profile picture"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-pictures' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (for viewing profile pictures)
CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- =====================================================
-- Folder Structure in profile-pictures bucket:
-- =====================================================
-- profile-pictures/
-- └── {user_id}/
--     └── profile.{ext}  (jpg, png, webp)
-- =====================================================
