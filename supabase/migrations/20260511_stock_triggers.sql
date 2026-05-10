-- ============================================================
-- VyaparBook — Automated Stock Triggers
-- This ensures stock is ALWAYS consistent, even if deals are
-- added/deleted from the Supabase Dashboard directly.
-- ============================================================

-- 1. Create the function that handles stock adjustments
CREATE OR REPLACE FUNCTION public.handle_stock_on_deal_change()
RETURNS TRIGGER AS $$
DECLARE
  v_delta numeric;
  v_commodity text;
  v_type text;
  v_qty numeric;
  v_unit text;
  v_user_id uuid;
BEGIN
  -- Determine which deal data to use
  IF (TG_OP = 'DELETE') THEN
    v_commodity := OLD.commodity;
    v_type := OLD.type;
    v_qty := -OLD.quantity; -- Reverse the effect
    v_unit := OLD.unit;
    v_user_id := OLD.user_id;
  ELSIF (TG_OP = 'INSERT') THEN
    v_commodity := NEW.commodity;
    v_type := NEW.type;
    v_qty := NEW.quantity;
    v_unit := NEW.unit;
    v_user_id := NEW.user_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If commodity or quantity or type changed, we need complex logic.
    -- To keep it simple, we'll reverse OLD and add NEW in the next steps.
    -- But for performance, let's just reverse the OLD now.
    
    -- Reverse OLD
    PERFORM public.adjust_stock_manual(OLD.user_id, OLD.commodity, OLD.type, -OLD.quantity, OLD.unit);
    
    -- Then set up NEW to be added by the rest of the function
    v_commodity := NEW.commodity;
    v_type := NEW.type;
    v_qty := NEW.quantity;
    v_unit := NEW.unit;
    v_user_id := NEW.user_id;
  END IF;

  -- Apply the adjustment
  PERFORM public.adjust_stock_manual(v_user_id, v_commodity, v_type, v_qty, v_unit);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to adjust stock records
CREATE OR REPLACE FUNCTION public.adjust_stock_manual(
  p_user_id uuid,
  p_commodity text,
  p_type text,
  p_quantity numeric,
  p_unit text
)
RETURNS void AS $$
DECLARE
  v_stock_id uuid;
  v_current numeric;
  v_purchased numeric;
  v_sold numeric;
  v_delta numeric;
BEGIN
  IF p_commodity IS NULL OR p_quantity = 0 THEN RETURN; END IF;

  SELECT id, current_stock, total_purchased, total_sold 
  INTO v_stock_id, v_current, v_purchased, v_sold
  FROM stock
  WHERE user_id = p_user_id AND lower(commodity) = lower(p_commodity)
  FOR UPDATE;

  -- Calculate change in current stock
  -- If type=purchase and qty=positive -> Increase stock
  -- If type=purchase and qty=negative (reversing) -> Decrease stock
  -- If type=sale and qty=positive -> Decrease stock
  -- If type=sale and qty=negative (reversing) -> Increase stock
  v_delta := CASE WHEN p_type = 'purchase' THEN p_quantity ELSE -p_quantity END;

  IF v_stock_id IS NOT NULL THEN
    UPDATE stock
    SET current_stock = GREATEST(0, v_current + v_delta),
        total_purchased = COALESCE(total_purchased, 0) + (CASE WHEN p_type = 'purchase' THEN p_quantity ELSE 0 END),
        total_sold = COALESCE(total_sold, 0) + (CASE WHEN p_type = 'sale' THEN p_quantity ELSE 0 END),
        updated_at = now()
    WHERE id = v_stock_id;
  ELSIF p_quantity > 0 THEN
    INSERT INTO stock (user_id, commodity, unit, current_stock, total_purchased, total_sold)
    VALUES (p_user_id, lower(p_commodity), p_unit, GREATEST(0, v_delta), 
           (CASE WHEN p_type = 'purchase' THEN p_quantity ELSE 0 END),
           (CASE WHEN p_type = 'sale' THEN p_quantity ELSE 0 END));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the trigger to the deals table
DROP TRIGGER IF EXISTS trg_stock_consistency ON deals;
CREATE TRIGGER trg_stock_consistency
AFTER INSERT OR UPDATE OR DELETE ON deals
FOR EACH ROW EXECUTE FUNCTION public.handle_stock_on_deal_change();
