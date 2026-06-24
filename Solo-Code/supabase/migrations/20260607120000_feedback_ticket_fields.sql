-- Link Give Feedback to support tickets + rating on ticket row

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  ADD COLUMN IF NOT EXISTS beta_feedback_id uuid REFERENCES public.beta_feedback(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_rating ON public.support_tickets(rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON public.support_tickets(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_beta_fb ON public.support_tickets(beta_feedback_id) WHERE beta_feedback_id IS NOT NULL;
