-- Add proof_url column to deals table to store weighbridge slips, invoices, or manual chits
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS proof_url text;
