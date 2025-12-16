-- =====================================================
-- L9ani Storage Setup: Create reports-photos Bucket
-- =====================================================
-- Run this in Supabase SQL Editor to set up the new
-- unified storage bucket for all report photos.
-- =====================================================

-- =====================================================
-- STEP 1: Create the new storage bucket
-- =====================================================
-- Note: This needs to be done via Supabase Dashboard > Storage
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New Bucket"
-- 3. Name it: reports-photos
-- 4. Make it PUBLIC (toggle on)
-- 5. Click "Create Bucket"

-- =====================================================
-- STEP 2: Set up storage policies (run in SQL Editor)
-- =====================================================
-- Use DROP POLICY IF EXISTS to avoid errors if policies already exist

-- Drop existing policies first (if any)
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'reports-photos'
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'reports-photos' 
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'reports-photos' 
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow public read access (for viewing photos)
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reports-photos');

-- =====================================================
-- STEP 3: Optional - Delete old bucket
-- =====================================================
-- After confirming the new bucket works, you can delete
-- the old 'missing-persons-photos' bucket from the
-- Supabase Dashboard > Storage

-- =====================================================
-- Folder Structure in reports-photos bucket:
-- =====================================================
-- reports-photos/
-- ├── person/
-- │   └── {user_id}/
-- │       └── {timestamp}-{random}.jpg
-- ├── pet/
-- │   └── {user_id}/
-- │       └── {timestamp}-{random}.jpg
-- ├── document/
-- │   └── {user_id}/
-- │       └── {timestamp}-{random}.jpg
-- ├── electronics/
-- │   └── {user_id}/
-- │       └── {timestamp}-{random}.jpg
-- ├── vehicle/
-- │   └── {user_id}/
-- │       └── {timestamp}-{random}.jpg
-- └── other/
--     └── {user_id}/
--         └── {timestamp}-{random}.jpg
-- =====================================================
