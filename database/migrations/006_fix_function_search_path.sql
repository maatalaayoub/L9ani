-- =====================================================
-- Migration: Fix mutable search_path in functions
-- Date: 2024-12-17
-- Description: Sets search_path to empty string for security
--              This prevents search_path injection attacks
-- =====================================================

-- Fix is_admin function with immutable search_path
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE auth_user_id = user_id 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix update_updated_at_column function if it exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fix is_report_owner function with immutable search_path
CREATE OR REPLACE FUNCTION is_report_owner(p_report_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.reports 
        WHERE id = p_report_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix is_report_approved function with immutable search_path
CREATE OR REPLACE FUNCTION is_report_approved(p_report_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.reports 
        WHERE id = p_report_id AND status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix resend_verification_code function with immutable search_path
CREATE OR REPLACE FUNCTION public.resend_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_code text;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  new_code := floor(random() * 900000 + 100000)::text;

  UPDATE public.profiles
  SET email_verified_code = new_code,
      email_verified = false
  WHERE auth_user_id = current_user_id;

  RETURN new_code;
END;
$$;

-- Fix request_email_change function with immutable search_path
CREATE OR REPLACE FUNCTION public.request_email_change(new_email text)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_code text;
  current_user_id uuid;
  last_change timestamptz;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF new_email IS NULL OR new_email = '' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;

  -- Check cooldown
  SELECT last_email_change INTO last_change FROM public.profiles WHERE auth_user_id = current_user_id;
  
  IF last_change IS NOT NULL AND (EXTRACT(EPOCH FROM (now() - last_change)) < 172800) THEN
    RAISE EXCEPTION 'You can only change your email once every 48 hours. Please contact support if this is urgent.';
  END IF;

  new_code := floor(random() * 900000 + 100000)::text;

  UPDATE public.profiles
  SET pending_new_email = new_email,
      email_change_code = new_code
  WHERE auth_user_id = current_user_id;

  RETURN new_code;
END;
$$;

-- Fix verify_email_with_code function with immutable search_path
CREATE OR REPLACE FUNCTION public.verify_email_with_code(code_input text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = current_user_id 
    AND email_verified_code = code_input
    AND email_verified_code IS NOT NULL
  ) THEN
    UPDATE public.profiles
    SET email_verified = true,
        email_verified_code = null
    WHERE auth_user_id = current_user_id;
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Fix auto_confirm_email trigger function with immutable search_path
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.email_confirmed_at := now();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user trigger function with immutable search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_username text;
  final_username text;
  first_name text;
  last_name text;
  phone_number text;
  verification_code text;
BEGIN
  RAISE NOTICE 'handle_new_user triggered for auth user id: %', new.id;
  
  -- Extract metadata
  first_name := new.raw_user_meta_data->>'firstName';
  last_name := new.raw_user_meta_data->>'lastName';
  phone_number := new.raw_user_meta_data->>'phoneNumber';

  RAISE NOTICE 'Metadata - firstName: %, lastName: %, phone: %', first_name, last_name, phone_number;

  -- Generate username
  IF first_name IS NOT NULL AND last_name IS NOT NULL THEN
     base_username := lower(regexp_replace(first_name || last_name, '[^a-zA-Z0-9]', '', 'g'));
  ELSIF first_name IS NOT NULL THEN
     base_username := lower(regexp_replace(first_name, '[^a-zA-Z0-9]', '', 'g'));
  ELSE
     base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
  END IF;

  final_username := base_username || floor(random() * 9000 + 1000)::text;
  verification_code := floor(random() * 900000 + 100000)::text;

  RAISE NOTICE 'Generated username: %, verification_code: %', final_username, verification_code;
  RAISE NOTICE 'About to insert - auth_user_id: %, email: %', new.id, new.email;

  -- Insert into profiles table
  -- user_id will auto-generate as random 10-digit number
  -- auth_user_id stores the UUID from auth.users
  INSERT INTO public.profiles (
    auth_user_id,
    username,
    email,
    first_name,
    last_name,
    phone,
    email_verified,
    email_verified_code
  )
  VALUES (
    new.id,
    final_username,
    new.email,
    COALESCE(first_name, ''),
    COALESCE(last_name, ''),
    COALESCE(phone_number, ''),
    false,
    verification_code
  );

  RAISE NOTICE 'Successfully inserted profile for auth_user_id: %', new.id;

  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- If the profile already exists, just update it
    RAISE NOTICE 'Profile already exists for auth_user_id: %, updating...', new.id;
    UPDATE public.profiles
    SET email = new.email,
        first_name = COALESCE(first_name, ''),
        last_name = COALESCE(last_name, ''),
        phone = COALESCE(phone_number, '')
    WHERE auth_user_id = new.id;
    RETURN new;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for auth_user_id %: % (SQLSTATE: %)', new.id, SQLERRM, SQLSTATE;
    -- Re-raise to prevent user creation if profile creation fails
    RAISE;
END;
$$;

-- Fix generate_random_user_id function with immutable search_path
CREATE OR REPLACE FUNCTION public.generate_random_user_id()
RETURNS BIGINT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  new_id bigint;
  id_exists boolean;
BEGIN
  LOOP
    -- Generate random number between 1000000000 and 9999999999 (10 digits)
    new_id := floor(random() * 9000000000 + 1000000000)::bigint;
    
    -- Check if this ID already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = new_id) INTO id_exists;
    
    -- If it doesn't exist, we can use it
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Note: When search_path is set to '', all table references
-- must be fully qualified (e.g., public.admin_users)
-- =====================================================
