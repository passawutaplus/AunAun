ALTER TABLE public.job_trackers ADD COLUMN IF NOT EXISTS quotation_id uuid;
ALTER TABLE public.job_trackers ADD COLUMN IF NOT EXISTS brief_id uuid;
CREATE INDEX IF NOT EXISTS idx_job_trackers_quotation ON public.job_trackers(user_id, quotation_id) WHERE quotation_id IS NOT NULL;