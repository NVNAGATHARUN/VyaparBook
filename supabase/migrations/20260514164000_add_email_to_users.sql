-- ─── Fix: Add email column to public.users and update RPC ──────────────────

-- Step 1: Add email column to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;

-- Step 2: Populate existing emails from auth.users
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE u.id = a.id;

-- Step 3: Update the RPC to use the now-correct email column
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
BEGIN
  -- Search by raw phone (10 digits) or with +91 prefix
  SELECT u.email INTO v_email
  FROM public.users u
  WHERE u.phone = p_phone 
     OR u.phone = '+91' || p_phone
     OR u.phone = '91' || p_phone
  LIMIT 1;
  
  RETURN v_email;
END;
$$;
