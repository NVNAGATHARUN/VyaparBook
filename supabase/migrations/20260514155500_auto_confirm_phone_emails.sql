-- Auto-confirm emails for phone-based logins (which use @vyaparbook.com)
CREATE OR REPLACE FUNCTION public.auto_confirm_phone_emails()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email LIKE '%@vyaparbook.com' THEN
    NEW.email_confirmed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_confirm_phone_emails ON auth.users;

CREATE TRIGGER trigger_auto_confirm_phone_emails
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_phone_emails();

-- Manually update any existing users who are stuck
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email LIKE '%@vyaparbook.com' AND email_confirmed_at IS NULL;
