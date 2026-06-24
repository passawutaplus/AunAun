ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS brief_id uuid;
CREATE INDEX IF NOT EXISTS idx_quotations_brief_id ON public.quotations(brief_id);