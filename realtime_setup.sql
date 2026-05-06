-- ============================================================
-- VyaparBook — Realtime Sync Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add 'source' column to deals table (whatsapp / pwa / manual)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source text DEFAULT 'pwa';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS source text DEFAULT 'pwa';
ALTER TABLE voice_logs ADD COLUMN IF NOT EXISTS source text DEFAULT 'pwa';

-- 2. Enable Realtime on all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE parties;
ALTER PUBLICATION supabase_realtime ADD TABLE stock;

-- Done!
SELECT 'Realtime sync setup complete!' AS status;
