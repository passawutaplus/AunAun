-- Contract fields on quotations (Phase 1.5)
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_accepted boolean NOT NULL DEFAULT false;
