-- ============================================================
-- VyaparBook — Fix Phone Password Recovery
-- Allows users who verified their phone via OTP to securely 
-- reset the password of their dummy email account.
-- ============================================================

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.reset_phone_password(p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Allows bypass of RLS to update auth.users
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_phone text;
  v_dummy_email text;
  v_target_id uuid;
BEGIN
  -- 1. Get the authenticated user's phone from the OTP session
  SELECT phone INTO v_phone FROM auth.users WHERE id = auth.uid();
  
  IF v_phone IS NULL OR v_phone = '' THEN
    RAISE EXCEPTION 'Only verified phone users can reset their password using this method.';
  END IF;

  -- 2. Calculate the dummy email associated with this phone
  v_dummy_email := 'user' || right(regexp_replace(v_phone, '\D', '', 'g'), 10) || '@vyaparbook.com';

  -- 3. Find the dummy email user ID
  SELECT id INTO v_target_id FROM auth.users WHERE email = v_dummy_email;
  
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Account not found for this phone number.';
  END IF;

  -- 4. Update the dummy email user's password using standard bcrypt hash
  UPDATE auth.users 
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = v_target_id;
  
END;
$$;
