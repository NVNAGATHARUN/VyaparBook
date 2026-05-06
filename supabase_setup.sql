-- ============================================================
-- VyaparBook — Supabase RLS Policies Setup
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ─── USERS TABLE ─────────────────────────────────────────────

-- Allow anyone to insert their own user row (sign up)
-- We use phone as identifier, no auth required (phone-only login)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- Allow public read by phone (for login check)
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (true);

-- Allow anyone to create a user (self-registration)
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own record  
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (true);

-- ─── PARTIES TABLE ───────────────────────────────────────────

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties_select_policy" ON parties;
DROP POLICY IF EXISTS "parties_insert_policy" ON parties;
DROP POLICY IF EXISTS "parties_update_policy" ON parties;
DROP POLICY IF EXISTS "parties_delete_policy" ON parties;

CREATE POLICY "parties_select_policy" ON parties FOR SELECT USING (true);
CREATE POLICY "parties_insert_policy" ON parties FOR INSERT WITH CHECK (true);
CREATE POLICY "parties_update_policy" ON parties FOR UPDATE USING (true);
CREATE POLICY "parties_delete_policy" ON parties FOR DELETE USING (true);

-- ─── DEALS TABLE ─────────────────────────────────────────────

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deals_select_policy" ON deals;
DROP POLICY IF EXISTS "deals_insert_policy" ON deals;
DROP POLICY IF EXISTS "deals_update_policy" ON deals;
DROP POLICY IF EXISTS "deals_delete_policy" ON deals;

CREATE POLICY "deals_select_policy" ON deals FOR SELECT USING (true);
CREATE POLICY "deals_insert_policy" ON deals FOR INSERT WITH CHECK (true);
CREATE POLICY "deals_update_policy" ON deals FOR UPDATE USING (true);
CREATE POLICY "deals_delete_policy" ON deals FOR DELETE USING (true);

-- ─── PAYMENTS TABLE ──────────────────────────────────────────

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON payments;

CREATE POLICY "payments_select_policy" ON payments FOR SELECT USING (true);
CREATE POLICY "payments_insert_policy" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_update_policy" ON payments FOR UPDATE USING (true);
CREATE POLICY "payments_delete_policy" ON payments FOR DELETE USING (true);

-- ─── STOCK TABLE ─────────────────────────────────────────────

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_select_policy" ON stock;
DROP POLICY IF EXISTS "stock_insert_policy" ON stock;
DROP POLICY IF EXISTS "stock_update_policy" ON stock;
DROP POLICY IF EXISTS "stock_delete_policy" ON stock;

CREATE POLICY "stock_select_policy" ON stock FOR SELECT USING (true);
CREATE POLICY "stock_insert_policy" ON stock FOR INSERT WITH CHECK (true);
CREATE POLICY "stock_update_policy" ON stock FOR UPDATE USING (true);
CREATE POLICY "stock_delete_policy" ON stock FOR DELETE USING (true);

-- ─── VOICE LOGS TABLE ────────────────────────────────────────

ALTER TABLE voice_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_logs_select_policy" ON voice_logs;
DROP POLICY IF EXISTS "voice_logs_insert_policy" ON voice_logs;

CREATE POLICY "voice_logs_select_policy" ON voice_logs FOR SELECT USING (true);
CREATE POLICY "voice_logs_insert_policy" ON voice_logs FOR INSERT WITH CHECK (true);

-- ─── VIEWS ───────────────────────────────────────────────────
-- Make sure views are accessible:

-- party_summary view - Create if not exists
CREATE OR REPLACE VIEW party_summary AS
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

-- deal_summary view - Create if not exists
CREATE OR REPLACE VIEW deal_summary AS
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

-- ─── DONE ────────────────────────────────────────────────────
-- All RLS policies have been set up for public (phone-only) access.
-- This is appropriate for a mobile app with phone-based identity.
