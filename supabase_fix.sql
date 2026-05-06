-- ============================================================
-- VyaparBook FIX — Run this in Supabase SQL Editor
-- This fixes the "cannot drop columns from view" error
-- ============================================================

-- Step 1: Drop views that already exist (with wrong columns)
DROP VIEW IF EXISTS party_summary CASCADE;
DROP VIEW IF EXISTS deal_summary CASCADE;

-- Step 2: Recreate party_summary view
CREATE VIEW party_summary AS
SELECT
  p.user_id,
  p.id AS party_id,
  p.name AS party_name,
  d.type AS deal_type,
  SUM(d.total_amount) AS total_business,
  COALESCE(SUM(pay.paid), 0) AS total_paid,
  SUM(d.total_amount) - COALESCE(SUM(pay.paid), 0) AS total_pending
FROM parties p
JOIN deals d ON d.party_id = p.id
LEFT JOIN (
  SELECT deal_id, SUM(amount) AS paid
  FROM payments
  GROUP BY deal_id
) pay ON pay.deal_id = d.id
GROUP BY p.user_id, p.id, p.name, d.type;

-- Step 3: Recreate deal_summary view
CREATE VIEW deal_summary AS
SELECT
  d.user_id,
  d.id,
  d.party_id,
  d.type,
  d.commodity,
  d.total_amount,
  COALESCE(SUM(p.amount), 0) AS total_paid,
  d.total_amount - COALESCE(SUM(p.amount), 0) AS pending_amount
FROM deals d
LEFT JOIN payments p ON p.deal_id = d.id
GROUP BY d.user_id, d.id, d.party_id, d.type, d.commodity, d.total_amount;

-- Step 4: Disable RLS on all tables (allows public anon key access)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_logs DISABLE ROW LEVEL SECURITY;

-- Done! 
SELECT 'VyaparBook setup complete!' AS status;
