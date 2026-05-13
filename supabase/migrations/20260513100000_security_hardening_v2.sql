-- ============================================================
-- VyaparBook — Security Hardening & Data API Access Updates
-- 1. Drops old permissive policies that left tables public
-- 2. Secures expenses and loans with RLS policies
-- 3. Grants explicit Data API access to meet May 30 requirements
-- ============================================================

-- ── 1. DROP OLD PERMISSIVE POLICIES ─────────────────────────────────
-- These were created in the initial schema but incorrectly named 
-- when we tried dropping them in previous RLS hardening migrations.

-- users
DROP POLICY IF EXISTS "users_select_by_phone" ON public.users;
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;

-- parties
DROP POLICY IF EXISTS "parties_owner_select" ON public.parties;
DROP POLICY IF EXISTS "parties_owner_insert" ON public.parties;
DROP POLICY IF EXISTS "parties_owner_update" ON public.parties;
DROP POLICY IF EXISTS "parties_owner_delete" ON public.parties;

-- deals
DROP POLICY IF EXISTS "deals_owner_select" ON public.deals;
DROP POLICY IF EXISTS "deals_owner_insert" ON public.deals;
DROP POLICY IF EXISTS "deals_owner_update" ON public.deals;
DROP POLICY IF EXISTS "deals_owner_delete" ON public.deals;

-- payments
DROP POLICY IF EXISTS "payments_owner_select" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_update" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_delete" ON public.payments;

-- stock
DROP POLICY IF EXISTS "stock_owner_select" ON public.stock;
DROP POLICY IF EXISTS "stock_owner_insert" ON public.stock;
DROP POLICY IF EXISTS "stock_owner_update" ON public.stock;
DROP POLICY IF EXISTS "stock_owner_delete" ON public.stock;

-- voice_logs
DROP POLICY IF EXISTS "voice_logs_owner_select" ON public.voice_logs;
DROP POLICY IF EXISTS "voice_logs_owner_insert" ON public.voice_logs;

-- whatsapp_users
DROP POLICY IF EXISTS "whatsapp_users_select" ON public.whatsapp_users;
DROP POLICY IF EXISTS "whatsapp_users_insert" ON public.whatsapp_users;
DROP POLICY IF EXISTS "whatsapp_users_update" ON public.whatsapp_users;

-- whatsapp_sessions
DROP POLICY IF EXISTS "whatsapp_sessions_all" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_insert" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_update" ON public.whatsapp_sessions;

-- whatsapp_message_events
DROP POLICY IF EXISTS "whatsapp_events_select" ON public.whatsapp_message_events;
DROP POLICY IF EXISTS "whatsapp_events_insert" ON public.whatsapp_message_events;

-- query_audit_logs
DROP POLICY IF EXISTS "query_audit_select" ON public.query_audit_logs;
DROP POLICY IF EXISTS "query_audit_insert" ON public.query_audit_logs;

-- ── 2. SECURE EXPENSES & LOANS ──────────────────────────────────────
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_owner_all" ON public.expenses;
CREATE POLICY "expenses_own_select" ON public.expenses
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "expenses_own_insert" ON public.expenses
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "expenses_own_update" ON public.expenses
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "expenses_own_delete" ON public.expenses
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "loans_owner_all" ON public.loans;
CREATE POLICY "loans_own_select" ON public.loans
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "loans_own_insert" ON public.loans
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "loans_own_update" ON public.loans
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "loans_own_delete" ON public.loans
  FOR DELETE USING (user_id = auth.uid());

-- ── 3. EXPLICIT GRANTS FOR DATA API ─────────────────────────────────
-- To comply with Supabase Data API changes effective May 30

-- Function to grant standard API access to a table
CREATE OR REPLACE FUNCTION grant_api_access(table_name text) RETURNS void AS $$
BEGIN
  EXECUTE format('GRANT SELECT ON public.%I TO anon;', table_name);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', table_name);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role;', table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
SELECT grant_api_access('users');
SELECT grant_api_access('parties');
SELECT grant_api_access('deals');
SELECT grant_api_access('payments');
SELECT grant_api_access('stock');
SELECT grant_api_access('voice_logs');
SELECT grant_api_access('whatsapp_users');
SELECT grant_api_access('whatsapp_sessions');
SELECT grant_api_access('whatsapp_message_events');
SELECT grant_api_access('query_audit_logs');
SELECT grant_api_access('expenses');
SELECT grant_api_access('loans');

-- Views
GRANT SELECT ON public.party_summary TO anon;
GRANT SELECT ON public.party_summary TO authenticated;
GRANT SELECT ON public.party_summary TO service_role;

GRANT SELECT ON public.deal_summary TO anon;
GRANT SELECT ON public.deal_summary TO authenticated;
GRANT SELECT ON public.deal_summary TO service_role;

-- Cleanup helper function
DROP FUNCTION grant_api_access(text);
