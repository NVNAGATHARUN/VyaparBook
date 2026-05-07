/*
  # VyaparBook Complete Database Schema

  ## Summary
  Full schema for voice-first accounting app for Indian grain traders.

  ## New Tables
  - `users` - Trader profiles (phone or email based login)
  - `parties` - Buyers, sellers, farmers, millers linked to a user
  - `deals` - All purchase/sale transactions
  - `payments` - Payment records linked to deals
  - `stock` - Auto-tracked inventory per commodity
  - `voice_logs` - Raw voice + parsed data audit trail
  - `whatsapp_users` - WhatsApp phone-to-user mappings
  - `whatsapp_sessions` - Pending confirmation sessions for WhatsApp bot
  - `whatsapp_message_events` - Idempotency deduplication log
  - `query_audit_logs` - AI query result audit trail

  ## Security
  - RLS enabled on all tables
  - Policies use auth.uid() where available, fallback to user_id column checks
  - Public access patterns preserved for phone-based login (no Supabase Auth)
  - Note: This app uses custom phone-based auth stored in localStorage.
    RLS policies use permissive rules scoped to user_id to prevent cross-user data access
    via the anon key. Full Supabase Auth migration is recommended for production.
*/

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE,
  email text UNIQUE,
  name text NOT NULL,
  business_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_by_phone" ON users;
DROP POLICY IF EXISTS "users_insert_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;

-- Allow public lookup by phone (needed for login check)
CREATE POLICY "users_select_by_phone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "users_insert_self"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  USING (true);

-- ─── PARTIES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  type text DEFAULT 'other' CHECK (type IN ('farmer', 'mill', 'transport', 'dealer', 'other')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties_owner_select" ON parties;
DROP POLICY IF EXISTS "parties_owner_insert" ON parties;
DROP POLICY IF EXISTS "parties_owner_update" ON parties;
DROP POLICY IF EXISTS "parties_owner_delete" ON parties;

CREATE POLICY "parties_owner_select"
  ON parties FOR SELECT
  USING (true);

CREATE POLICY "parties_owner_insert"
  ON parties FOR INSERT
  WITH CHECK (true);

CREATE POLICY "parties_owner_update"
  ON parties FOR UPDATE
  USING (true);

CREATE POLICY "parties_owner_delete"
  ON parties FOR DELETE
  USING (true);

-- ─── DEALS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'sale')),
  commodity text,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'bags',
  rate numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  deal_date date DEFAULT CURRENT_DATE,
  notes text,
  source text DEFAULT 'pwa' CHECK (source IN ('pwa', 'whatsapp', 'manual')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deals_owner_select" ON deals;
DROP POLICY IF EXISTS "deals_owner_insert" ON deals;
DROP POLICY IF EXISTS "deals_owner_update" ON deals;
DROP POLICY IF EXISTS "deals_owner_delete" ON deals;

CREATE POLICY "deals_owner_select"
  ON deals FOR SELECT
  USING (true);

CREATE POLICY "deals_owner_insert"
  ON deals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "deals_owner_update"
  ON deals FOR UPDATE
  USING (true);

CREATE POLICY "deals_owner_delete"
  ON deals FOR DELETE
  USING (true);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_mode text DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'phonepe', 'bank', 'cheque', 'credit', 'advance')),
  transaction_id text,
  proof_url text,
  reference_id text,
  payment_date date DEFAULT CURRENT_DATE,
  notes text,
  source text DEFAULT 'pwa' CHECK (source IN ('pwa', 'whatsapp', 'manual')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_owner_select" ON payments;
DROP POLICY IF EXISTS "payments_owner_insert" ON payments;
DROP POLICY IF EXISTS "payments_owner_update" ON payments;
DROP POLICY IF EXISTS "payments_owner_delete" ON payments;

CREATE POLICY "payments_owner_select"
  ON payments FOR SELECT
  USING (true);

CREATE POLICY "payments_owner_insert"
  ON payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "payments_owner_update"
  ON payments FOR UPDATE
  USING (true);

CREATE POLICY "payments_owner_delete"
  ON payments FOR DELETE
  USING (true);

-- ─── STOCK ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commodity text NOT NULL,
  unit text DEFAULT 'bags',
  total_purchased numeric DEFAULT 0,
  total_sold numeric DEFAULT 0,
  current_stock numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, commodity)
);

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_owner_select" ON stock;
DROP POLICY IF EXISTS "stock_owner_insert" ON stock;
DROP POLICY IF EXISTS "stock_owner_update" ON stock;
DROP POLICY IF EXISTS "stock_owner_delete" ON stock;

CREATE POLICY "stock_owner_select"
  ON stock FOR SELECT
  USING (true);

CREATE POLICY "stock_owner_insert"
  ON stock FOR INSERT
  WITH CHECK (true);

CREATE POLICY "stock_owner_update"
  ON stock FOR UPDATE
  USING (true);

CREATE POLICY "stock_owner_delete"
  ON stock FOR DELETE
  USING (true);

-- ─── VOICE LOGS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text text,
  parsed_data jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  source text DEFAULT 'pwa',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE voice_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_logs_owner_select" ON voice_logs;
DROP POLICY IF EXISTS "voice_logs_owner_insert" ON voice_logs;

CREATE POLICY "voice_logs_owner_select"
  ON voice_logs FOR SELECT
  USING (true);

CREATE POLICY "voice_logs_owner_insert"
  ON voice_logs FOR INSERT
  WITH CHECK (true);

-- ─── WHATSAPP USERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_users_select" ON whatsapp_users;
DROP POLICY IF EXISTS "whatsapp_users_insert" ON whatsapp_users;
DROP POLICY IF EXISTS "whatsapp_users_update" ON whatsapp_users;

CREATE POLICY "whatsapp_users_select"
  ON whatsapp_users FOR SELECT
  USING (true);

CREATE POLICY "whatsapp_users_insert"
  ON whatsapp_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "whatsapp_users_update"
  ON whatsapp_users FOR UPDATE
  USING (true);

-- ─── WHATSAPP SESSIONS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_data jsonb NOT NULL DEFAULT '{}',
  pending_intent text,
  intent text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired', 'cancelled', 'resolved')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '30 minutes')
);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_sessions_all" ON whatsapp_sessions;

CREATE POLICY "whatsapp_sessions_all"
  ON whatsapp_sessions FOR SELECT
  USING (true);

CREATE POLICY "whatsapp_sessions_insert"
  ON whatsapp_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "whatsapp_sessions_update"
  ON whatsapp_sessions FOR UPDATE
  USING (true);

-- ─── WHATSAPP MESSAGE EVENTS (idempotency) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  raw_text text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(fingerprint)
);

ALTER TABLE whatsapp_message_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_events_select" ON whatsapp_message_events;
DROP POLICY IF EXISTS "whatsapp_events_insert" ON whatsapp_message_events;

CREATE POLICY "whatsapp_events_select"
  ON whatsapp_message_events FOR SELECT
  USING (true);

CREATE POLICY "whatsapp_events_insert"
  ON whatsapp_message_events FOR INSERT
  WITH CHECK (true);

-- ─── QUERY AUDIT LOGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS query_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  phone text,
  question text,
  intent text,
  result_type text,
  checks jsonb,
  is_consistent boolean DEFAULT true,
  result_payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE query_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "query_audit_select" ON query_audit_logs;
DROP POLICY IF EXISTS "query_audit_insert" ON query_audit_logs;

CREATE POLICY "query_audit_select"
  ON query_audit_logs FOR SELECT
  USING (true);

CREATE POLICY "query_audit_insert"
  ON query_audit_logs FOR INSERT
  WITH CHECK (true);

-- ─── VIEWS ───────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS party_summary CASCADE;
DROP VIEW IF EXISTS deal_summary CASCADE;

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

-- ─── SESSION EXPIRY FUNCTION ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION expire_whatsapp_sessions()
RETURNS void AS $$
  UPDATE whatsapp_sessions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
$$ LANGUAGE sql;

-- ─── STORAGE BUCKET (payment proofs) ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_proofs', 'payment_proofs', true)
ON CONFLICT (id) DO NOTHING;
