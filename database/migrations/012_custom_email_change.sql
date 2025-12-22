-- Add columns for custom email change flow
-- This avoids Supabase's default behavior of sending to both old and new emails

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pending_email TEXT,
ADD COLUMN IF NOT EXISTS email_change_token TEXT,
ADD COLUMN IF NOT EXISTS email_change_token_expires TIMESTAMPTZ;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_change_token 
ON profiles(email_change_token) 
WHERE email_change_token IS NOT NULL;

COMMENT ON COLUMN profiles.pending_email IS 'New email address pending verification';
COMMENT ON COLUMN profiles.email_change_token IS 'Token for verifying email change';
COMMENT ON COLUMN profiles.email_change_token_expires IS 'Expiry time for email change token';
