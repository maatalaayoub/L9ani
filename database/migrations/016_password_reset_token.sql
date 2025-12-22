-- Migration: Add password reset token columns for custom email-based password reset
-- This enables custom password reset flow using Resend instead of Supabase's built-in emails

-- Add new columns for token-based password reset
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_password_reset_token 
ON profiles(password_reset_token) 
WHERE password_reset_token IS NOT NULL;

COMMENT ON COLUMN profiles.password_reset_token IS 'Secure token for password reset link';
COMMENT ON COLUMN profiles.password_reset_token_expires IS 'Expiry timestamp for the password reset token';
