-- Migration: Cleanup legacy email change columns
-- Date: 2024-12-22
-- Description: Remove old email change columns that are no longer used
--              The new system uses pending_email, email_change_token, email_change_token_expires

-- Drop the old function that used the legacy columns
DROP FUNCTION IF EXISTS public.request_email_change(text);

-- Remove the old legacy columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS pending_new_email,
DROP COLUMN IF EXISTS email_change_code;

-- Clear any stale data in the new columns (optional - run if needed)
-- UPDATE public.profiles 
-- SET pending_email = NULL, 
--     email_change_token = NULL, 
--     email_change_token_expires = NULL 
-- WHERE email_change_token_expires < NOW();
