/*
  # Performance Indexes

  ## Summary
  Adds indexes on all frequently queried columns to prevent full table scans.

  ## Indexes Added
  - deals: user_id + deal_date (dashboard, recent transactions)
  - deals: party_id (party detail page, payment matching)
  - payments: deal_id + payment_date (pending calculations)
  - payments: user_id + payment_date (recent payments)
  - stock: user_id + commodity (upsert lookups)
  - parties: user_id + name (fuzzy name search)
  - whatsapp_sessions: phone + status (bot session lookup)
  - whatsapp_message_events: phone + fingerprint (dedup)
*/

CREATE INDEX IF NOT EXISTS idx_deals_user_date
  ON deals(user_id, deal_date DESC);

CREATE INDEX IF NOT EXISTS idx_deals_party
  ON deals(party_id);

CREATE INDEX IF NOT EXISTS idx_deals_user_type
  ON deals(user_id, type);

CREATE INDEX IF NOT EXISTS idx_payments_deal
  ON payments(deal_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_user
  ON payments(user_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_user_commodity
  ON stock(user_id, commodity);

CREATE INDEX IF NOT EXISTS idx_parties_user_name
  ON parties(user_id, name);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_status
  ON whatsapp_sessions(phone, status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_events_phone
  ON whatsapp_message_events(phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_logs_user
  ON voice_logs(user_id, created_at DESC);
