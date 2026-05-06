-- ============================================================
-- VyaparBook — Payment Proofs Setup
-- Run this script in the Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to the payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS transaction_id text,
ADD COLUMN IF NOT EXISTS proof_url text;

-- 2. Create a new Storage Bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_proofs', 'payment_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies (Allow public access for now)
-- Drop existing policies if any to avoid errors
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment_proofs');

-- Allow public insert access
CREATE POLICY "Public Insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment_proofs');

-- Allow public update access
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment_proofs');

SELECT 'Payment proofs setup complete!' AS status;
