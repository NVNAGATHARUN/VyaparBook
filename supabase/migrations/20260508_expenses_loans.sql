
-- ─── EXPENSES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('rent', 'electricity', 'labor', 'transport', 'fuel', 'other')),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  expense_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_owner_all"
  ON expenses FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── LOANS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_type text NOT NULL CHECK (loan_type IN ('hand', 'bank', 'gold')),
  direction text NOT NULL CHECK (direction IN ('taken', 'given')),
  party_name text NOT NULL,
  principal numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  interest_type text NOT NULL DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound')),
  rate_mode text NOT NULL DEFAULT 'percentage' CHECK (rate_mode IN ('percentage', 'rupees_per_hundred')),
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  next_installment_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loans_owner_all"
  ON loans FOR ALL
  USING (true)
  WITH CHECK (true);
