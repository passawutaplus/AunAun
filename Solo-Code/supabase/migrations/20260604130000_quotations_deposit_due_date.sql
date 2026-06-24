ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS deposit_due_date DATE;
