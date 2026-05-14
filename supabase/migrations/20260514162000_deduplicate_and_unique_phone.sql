-- ─── Fix: Remove duplicate accounts, enforce 1 phone = 1 account ─────────────

-- Step 1: Migrate Tharun's deals to Naga
UPDATE deals SET user_id = 'd311a9bc-4f15-4b6d-af15-f8a45329e8fb'
WHERE user_id = 'e13fa348-7d99-4640-8812-fc244ead9f13';

-- Step 2: Migrate Tharun's payments to Naga
UPDATE payments SET user_id = 'd311a9bc-4f15-4b6d-af15-f8a45329e8fb'
WHERE user_id = 'e13fa348-7d99-4640-8812-fc244ead9f13';

-- Step 3: Migrate Tharun's parties to Naga
UPDATE parties SET user_id = 'd311a9bc-4f15-4b6d-af15-f8a45329e8fb'
WHERE user_id = 'e13fa348-7d99-4640-8812-fc244ead9f13';

-- Step 4: For stock, merge quantities (add Tharun's stock to Naga's existing stock)
-- First, update Naga's stock where commodity matches
UPDATE stock s1
SET current_stock = s1.current_stock + s2.current_stock
FROM stock s2
WHERE s1.user_id = 'd311a9bc-4f15-4b6d-af15-f8a45329e8fb'
  AND s2.user_id = 'e13fa348-7d99-4640-8812-fc244ead9f13'
  AND lower(s1.commodity) = lower(s2.commodity);

-- Then, migrate Tharun's stock that Naga doesn't have
UPDATE stock SET user_id = 'd311a9bc-4f15-4b6d-af15-f8a45329e8fb'
WHERE user_id = 'e13fa348-7d99-4640-8812-fc244ead9f13'
  AND lower(commodity) NOT IN (
    SELECT lower(commodity) FROM stock WHERE user_id = 'd311a9bc-4f15-4b6d-af15-f8a45329e8fb'
  );

-- Delete Tharun's stock rows that were already merged above
DELETE FROM stock WHERE user_id = 'e13fa348-7d99-4640-8812-fc244ead9f13';

-- Step 5: Remove Tharun's whatsapp_users link
DELETE FROM whatsapp_users WHERE user_id = 'e13fa348-7d99-4640-8812-fc244ead9f13';

-- Step 6: Remove Tharun's user record  
DELETE FROM users WHERE id = 'e13fa348-7d99-4640-8812-fc244ead9f13';

-- Step 7: Normalize Naga's phone to + prefix
UPDATE users SET phone = '+917337474159'
WHERE id = 'd311a9bc-4f15-4b6d-af15-f8a45329e8fb';

-- Step 8: Fix whatsapp_users entry for Naga to use + prefix
UPDATE whatsapp_users SET phone = '+917337474159'
WHERE user_id = 'd311a9bc-4f15-4b6d-af15-f8a45329e8fb';

-- Step 9: Add UNIQUE constraint on users.phone
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_unique;
ALTER TABLE public.users ADD CONSTRAINT users_phone_unique UNIQUE (phone);

-- Step 10: Add UNIQUE constraint on whatsapp_users.phone
ALTER TABLE public.whatsapp_users DROP CONSTRAINT IF EXISTS whatsapp_users_phone_unique;
ALTER TABLE public.whatsapp_users ADD CONSTRAINT whatsapp_users_phone_unique UNIQUE (phone);
