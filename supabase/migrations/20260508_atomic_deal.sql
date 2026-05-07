-- ============================================================
-- VyaparBook — Atomic Deal Creation
-- Run in Supabase Dashboard → SQL Editor
-- Wraps deal insert + advance payment + stock upsert in a 
-- single Postgres transaction. Security Definer so it ignores RLS
-- internally, but explicitly checks auth.uid().
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
  p_notes text DEFAULT NULL
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
  v_stock_id uuid;
  v_delta numeric;
BEGIN
  -- 1. Get authenticated user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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

  -- 5. Upsert Stock (if commodity and qty provided)
  IF p_commodity IS NOT NULL AND p_quantity > 0 THEN
    -- Find existing stock
    SELECT id, current_stock INTO v_stock_id, v_current_stock
    FROM stock
    WHERE user_id = v_user_id AND lower(commodity) = lower(p_commodity)
    FOR UPDATE; -- Lock row for concurrency

    v_delta := CASE WHEN p_type = 'purchase' THEN p_quantity ELSE -p_quantity END;

    IF v_stock_id IS NOT NULL THEN
      -- Update existing
      UPDATE stock
      SET current_stock = GREATEST(0, v_current_stock + v_delta),
          updated_at = now()
      WHERE id = v_stock_id;
    ELSE
      -- Insert new
      INSERT INTO stock (user_id, commodity, unit, current_stock)
      VALUES (v_user_id, lower(p_commodity), p_unit, GREATEST(0, v_delta));
    END IF;
  END IF;

  -- 6. Return success
  RETURN json_build_object(
    'success', true,
    'deal_id', v_deal_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error here triggers automatic rollback of all inserts/updates above
  RAISE EXCEPTION 'Atomic deal creation failed: %', SQLERRM;
END;
$$;
