-- ─── Helper to find email by phone for login ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Run as system to bypass RLS for this specific lookup
AS $$
DECLARE
  v_email text;
BEGIN
  -- We search the users table (which contains both phone and auth id)
  SELECT u.email INTO v_email
  FROM public.users u
  WHERE u.phone = p_phone OR u.phone = '+91' || p_phone
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

-- Ensure it is accessible
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon, authenticated;
