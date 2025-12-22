-- Migration: Add email verification token columns for link-based verification
-- This replaces the old code-based verification with link-based verification

-- Add new columns for token-based email verification
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_token_expires TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_verification_token 
ON profiles(email_verification_token) 
WHERE email_verification_token IS NOT NULL;

-- Optional: Drop old code column if no longer needed (commented out for safety)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS email_verified_code;

COMMENT ON COLUMN profiles.email_verification_token IS 'Secure token for email verification link';
COMMENT ON COLUMN profiles.email_verification_token_expires IS 'Expiry timestamp for the verification token';
