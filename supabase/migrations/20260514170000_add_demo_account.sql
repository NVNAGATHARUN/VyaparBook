-- Migration: Add Demo Account for Evaluators

-- Define the UUIDs
DO $$ 
DECLARE
  v_demo_user_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_demo_email text := 'demo@vyaparbook.com';
  v_demo_password text := 'demo123';
  v_demo_phone text := '+910000000000';
BEGIN
  -- 1. Insert into auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_demo_email) THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_demo_user_id, '00000000-0000-0000-0000-000000000000', v_demo_email, crypt(v_demo_password, gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Demo User"}', now(), now(), '', '', '', ''
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
    ) VALUES (
      v_demo_user_id::text, v_demo_user_id, format('{"sub": "%s", "email": "%s"}', v_demo_user_id, v_demo_email)::jsonb, 'email', now(), now(), now(), gen_random_uuid()
    );
  END IF;

  -- 2. Insert into public.users if not exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = v_demo_email) THEN
    INSERT INTO public.users (id, name, phone, email, business_name)
    VALUES (v_demo_user_id, 'Demo Evaluator', v_demo_phone, v_demo_email, 'Demo Vyapar');
  END IF;

END $$;
