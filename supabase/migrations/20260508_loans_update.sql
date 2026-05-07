
-- ─── UPDATE LOANS TABLE ──────────────────────────────────────────────────────
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES parties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phone text;

-- Add a column to track last reminder sent
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS last_reminder_sent timestamptz;
