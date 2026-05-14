-- ─── Fix: Add missing RLS policies for core tables ───────────────────────────
-- These were missing, causing all inserts/selects from the PWA to be silently blocked.

-- ── DEALS ──────────────────────────────────────────────────────────────────
CREATE POLICY "deals_own_select" ON public.deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "deals_own_insert" ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deals_own_update" ON public.deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "deals_own_delete" ON public.deals FOR DELETE USING (auth.uid() = user_id);

-- ── PAYMENTS ───────────────────────────────────────────────────────────────
CREATE POLICY "payments_own_select" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_own_insert" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_own_update" ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payments_own_delete" ON public.payments FOR DELETE USING (auth.uid() = user_id);

-- ── STOCK ──────────────────────────────────────────────────────────────────
CREATE POLICY "stock_own_select" ON public.stock FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "stock_own_insert" ON public.stock FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stock_own_update" ON public.stock FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "stock_own_delete" ON public.stock FOR DELETE USING (auth.uid() = user_id);

-- ── PARTIES ────────────────────────────────────────────────────────────────
CREATE POLICY "parties_own_select" ON public.parties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "parties_own_insert" ON public.parties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "parties_own_update" ON public.parties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "parties_own_delete" ON public.parties FOR DELETE USING (auth.uid() = user_id);

-- ── USERS ──────────────────────────────────────────────────────────────────
CREATE POLICY "users_own_select" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_own_insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_own_update" ON public.users FOR UPDATE USING (auth.uid() = id);

-- ── VOICE LOGS ─────────────────────────────────────────────────────────────
CREATE POLICY "voice_logs_own_select" ON public.voice_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "voice_logs_own_insert" ON public.voice_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── WHATSAPP TABLES (service role only via edge function) ──────────────────
-- These use service_role which bypasses RLS — no policies needed for anon/user access.
-- But we allow users to see their own whatsapp_sessions
CREATE POLICY "whatsapp_sessions_own_select" ON public.whatsapp_sessions FOR SELECT USING (auth.uid() = user_id);
