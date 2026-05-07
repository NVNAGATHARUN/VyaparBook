-- ============================================================
-- VyaparBook — RLS Hardening + Performance Indexes
-- Run in Supabase Dashboard → SQL Editor
-- WARNING: Phone-only users (no email auth) lose access.
--          They must re-register with email.
-- ============================================================

-- ── 1. USERS TABLE ──────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;

-- Allow users to read their own row
CREATE POLICY "users_own_select" ON public.users
  FOR SELECT USING (id = auth.uid());

-- Allow inserting own row on signup (matches auth.uid())
CREATE POLICY "users_own_insert" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow updating own row
CREATE POLICY "users_own_update" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- ── 2. PARTIES TABLE ────────────────────────────────────────
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties_select_policy" ON public.parties;
DROP POLICY IF EXISTS "parties_insert_policy" ON public.parties;
DROP POLICY IF EXISTS "parties_update_policy" ON public.parties;
DROP POLICY IF EXISTS "parties_delete_policy" ON public.parties;

CREATE POLICY "parties_own_select" ON public.parties
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "parties_own_insert" ON public.parties
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "parties_own_update" ON public.parties
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "parties_own_delete" ON public.parties
  FOR DELETE USING (user_id = auth.uid());

-- ── 3. DEALS TABLE ──────────────────────────────────────────
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deals_select_policy" ON public.deals;
DROP POLICY IF EXISTS "deals_insert_policy" ON public.deals;
DROP POLICY IF EXISTS "deals_update_policy" ON public.deals;
DROP POLICY IF EXISTS "deals_delete_policy" ON public.deals;

CREATE POLICY "deals_own_select" ON public.deals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "deals_own_insert" ON public.deals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "deals_own_update" ON public.deals
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "deals_own_delete" ON public.deals
  FOR DELETE USING (user_id = auth.uid());

-- ── 4. PAYMENTS TABLE ───────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_update_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON public.payments;

CREATE POLICY "payments_own_select" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "payments_own_insert" ON public.payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_own_update" ON public.payments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "payments_own_delete" ON public.payments
  FOR DELETE USING (user_id = auth.uid());

-- ── 5. STOCK TABLE ──────────────────────────────────────────
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_select_policy" ON public.stock;
DROP POLICY IF EXISTS "stock_insert_policy" ON public.stock;
DROP POLICY IF EXISTS "stock_update_policy" ON public.stock;
DROP POLICY IF EXISTS "stock_delete_policy" ON public.stock;

CREATE POLICY "stock_own_select" ON public.stock
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "stock_own_insert" ON public.stock
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "stock_own_update" ON public.stock
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "stock_own_delete" ON public.stock
  FOR DELETE USING (user_id = auth.uid());

-- ── 6. VOICE LOGS TABLE ─────────────────────────────────────
ALTER TABLE public.voice_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_logs_select_policy" ON public.voice_logs;
DROP POLICY IF EXISTS "voice_logs_insert_policy" ON public.voice_logs;

CREATE POLICY "voice_logs_own_select" ON public.voice_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "voice_logs_own_insert" ON public.voice_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── 7. WHATSAPP TABLES (service role only) ──────────────────
-- These are accessed via service role key in Edge Functions / n8n only
-- Not accessible from the browser at all

ALTER TABLE public.whatsapp_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_users_select" ON public.whatsapp_users;
CREATE POLICY "wa_users_no_browser_access" ON public.whatsapp_users
  FOR ALL USING (false); -- Only service role bypasses RLS

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_sessions_select" ON public.whatsapp_sessions;
CREATE POLICY "wa_sessions_no_browser_access" ON public.whatsapp_sessions
  FOR ALL USING (false);

ALTER TABLE public.whatsapp_message_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_events_select" ON public.whatsapp_message_events;
CREATE POLICY "wa_events_no_browser_access" ON public.whatsapp_message_events
  FOR ALL USING (false);

ALTER TABLE public.query_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_own_select" ON public.query_audit_logs;
CREATE POLICY "audit_own_select" ON public.query_audit_logs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "audit_own_insert" ON public.query_audit_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── 8. PERFORMANCE INDEXES ───────────────────────────────────
-- Core lookup indexes
CREATE INDEX IF NOT EXISTS idx_deals_user_id
  ON public.deals(user_id);

CREATE INDEX IF NOT EXISTS idx_deals_party_id
  ON public.deals(party_id);

CREATE INDEX IF NOT EXISTS idx_deals_user_date
  ON public.deals(user_id, deal_date DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_deals_not_deleted
  ON public.deals(user_id, is_deleted)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_payments_deal_id
  ON public.payments(deal_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id
  ON public.payments(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_date
  ON public.payments(user_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_parties_user_id
  ON public.parties(user_id);

CREATE INDEX IF NOT EXISTS idx_stock_user_id
  ON public.stock(user_id);

CREATE INDEX IF NOT EXISTS idx_voice_logs_user_id
  ON public.voice_logs(user_id);

-- Party name normalization (prevents duplicate parties)
ALTER TABLE public.parties
  ADD COLUMN IF NOT EXISTS name_normalized text
    GENERATED ALWAYS AS (lower(trim(name))) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS parties_user_name_normalized_uidx
  ON public.parties(user_id, name_normalized);

-- ── 9. VIEWS: GRANT ACCESS ───────────────────────────────────
-- Views inherit RLS from underlying tables, but need explicit grants
GRANT SELECT ON public.party_summary TO authenticated;
GRANT SELECT ON public.deal_summary TO authenticated;

-- ── DONE ─────────────────────────────────────────────────────
SELECT 'RLS hardening + indexes applied!' AS status;
