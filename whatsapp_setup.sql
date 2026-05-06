-- ============================================================
-- VyaparBook — WhatsApp Integration Setup
-- Run this in Supabase SQL Editor AFTER all other setup scripts
-- ============================================================

-- Table 1: WhatsApp registered users (phone → user mapping)
CREATE TABLE IF NOT EXISTS whatsapp_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text UNIQUE NOT NULL,           -- e.g., "919876543210"
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- Table 2: Pending sessions (waiting for user confirmation)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_data jsonb NOT NULL,          -- parsed transaction/payment JSON
  pending_intent text,                  -- e.g., 'ASK_RATE', 'ASK_COMMODITY', 'CONFIRM'
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'rejected', 'expired')
  ),
  created_at timestamp DEFAULT now(),
  expires_at timestamp DEFAULT now() + INTERVAL '30 minutes'
);

-- Disable RLS for now (same as other tables)
ALTER TABLE whatsapp_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions DISABLE ROW LEVEL SECURITY;

-- Index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone ON whatsapp_users(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone, status);

-- Auto-expire sessions older than 30 minutes (cleanup function)
CREATE OR REPLACE FUNCTION expire_whatsapp_sessions()
RETURNS void AS $$
  UPDATE whatsapp_sessions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
$$ LANGUAGE sql;

SELECT 'WhatsApp tables setup complete!' AS status;
