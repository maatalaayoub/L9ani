-- Migration: Add function to unlink OAuth identities
-- Date: 2024-12-22
-- Description: Creates a function to unlink OAuth identities when email is changed
--              This prevents users from logging in with their old Google account

-- Function to unlink all OAuth identities for a user
-- This is called when a user changes their email to disconnect Google login
CREATE OR REPLACE FUNCTION public.unlink_oauth_identities(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Delete all non-email identities for this user
    DELETE FROM auth.identities 
    WHERE user_id = target_user_id 
    AND provider != 'email';
    
    -- Log the action
    RAISE NOTICE 'Unlinked OAuth identities for user: %', target_user_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.unlink_oauth_identities(uuid) TO service_role;

-- Revoke from public for security
REVOKE ALL ON FUNCTION public.unlink_oauth_identities(uuid) FROM PUBLIC;

COMMENT ON FUNCTION public.unlink_oauth_identities(uuid) IS 
'Unlinks all OAuth identities (like Google) for a user. Used when changing email to prevent login with old OAuth account.';
