-- Re-add avatar_url column to profiles table for profile picture uploads
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
