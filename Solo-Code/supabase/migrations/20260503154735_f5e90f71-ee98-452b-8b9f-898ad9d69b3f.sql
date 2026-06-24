ALTER TABLE public.job_slips
  ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason text NOT NULL DEFAULT '';