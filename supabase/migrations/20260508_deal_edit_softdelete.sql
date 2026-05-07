-- VyaparBook: Deal soft-delete + edit support
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add soft-delete columns to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- 2. Index for fast filtering of non-deleted deals
CREATE INDEX IF NOT EXISTS deals_not_deleted_idx
  ON public.deals(user_id, is_deleted, deal_date DESC)
  WHERE is_deleted = false;

-- 3. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_updated_at ON public.deals;
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Soft delete function (callable from client)
CREATE OR REPLACE FUNCTION public.soft_delete_deal(p_deal_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.deals
    SET is_deleted = true, deleted_at = now()
    WHERE id = p_deal_id AND user_id = p_user_id AND is_deleted = false;
END;
$$;
