-- ============================================================
-- VyaparBook — Atomic Deal Creation (FIXED)
-- Updates: current_stock, total_purchased, AND total_sold.
-- Supports: PWA (auth.uid) and Edge Functions (p_user_id).
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_deal_atomic(
  p_party_id uuid,
  p_type text,
  p_commodity text,
  p_quantity numeric,
  p_unit text,
  p_rate numeric,
  p_total_amount numeric,
  p_advance_paid numeric,
  p_deal_date date,
  p_source text,
  p_payment_mode text DEFAULT 'cash',
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_deal_id uuid;
  v_current_stock numeric;
  v_total_purchased numeric;
  v_total_sold numeric;
  v_stock_id uuid;
  v_delta numeric;
BEGIN
  -- 1. Get authenticated user ID or use provided fallback (for Edge Functions)
  v_user_id := COALESCE(auth.uid(), p_user_id);
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID required (not authenticated and no p_user_id provided)';
  END IF;

  -- 2. Verify party belongs to user
  IF NOT EXISTS (SELECT 1 FROM parties WHERE id = p_party_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Party not found or access denied';
  END IF;

  -- 3. Insert Deal
  INSERT INTO deals (
    user_id, party_id, type, commodity, quantity, unit,
    rate, total_amount, deal_date, source, notes
  ) VALUES (
    v_user_id, p_party_id, p_type, p_commodity, p_quantity, p_unit,
    p_rate, p_total_amount, p_deal_date, p_source, p_notes
  ) RETURNING id INTO v_deal_id;

  -- 4. Insert Advance Payment
  IF p_advance_paid > 0 THEN
    INSERT INTO payments (
      deal_id, user_id, amount, payment_mode, payment_date, source
    ) VALUES (
      v_deal_id, v_user_id, p_advance_paid, p_payment_mode, p_deal_date, p_source
    );
  END IF;

  -- 5. Stock is now handled automatically by the 'trg_stock_consistency' trigger!
  -- No manual code needed here anymore. Perfect consistency guaranteed.

  -- 6. Return success
  RETURN json_build_object(
    'success', true,
    'deal_id', v_deal_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Atomic deal creation failed: %', SQLERRM;
END;
$$;
