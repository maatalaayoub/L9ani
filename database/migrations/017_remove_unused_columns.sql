-- Migration: Remove unused legacy columns from profiles table
-- These columns have been replaced by token-based verification:
--   email_verified_code -> email_verification_token (link-based)
--   email_change_code -> email_change_token (link-based)
--   pending_new_email -> pending_email

-- Remove unused columns
ALTER TABLE profiles
DROP COLUMN IF EXISTS email_verified_code,
DROP COLUMN IF EXISTS email_change_code,
DROP COLUMN IF EXISTS pending_new_email;

-- Note: The following columns are still in use and should NOT be deleted:
-- - email_verification_token, email_verification_token_expires (signup verification)
-- - email_change_token, email_change_token_expires (email change verification)
-- - password_reset_token, password_reset_token_expires (password reset)
-- - pending_email (stores new email during change process)
-- - last_email_change (tracks when email was last changed)
