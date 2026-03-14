-- Add city column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
