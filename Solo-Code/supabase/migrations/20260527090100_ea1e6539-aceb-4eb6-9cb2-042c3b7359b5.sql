ALTER TABLE public.feedback_jobs
  ADD COLUMN IF NOT EXISTS revision_quota INTEGER,
  ADD COLUMN IF NOT EXISTS quotation_id UUID;