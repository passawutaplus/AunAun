-- Supplier cover image
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Beta feedback table (per-feature suggestions from early-access testers)
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_name text,
  feature text NOT NULL,
  message text NOT NULL,
  rating smallint,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_feature ON public.beta_feedback(feature);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON public.beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created ON public.beta_feedback(created_at DESC);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own beta feedback"
  ON public.beta_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own beta feedback"
  ON public.beta_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own beta feedback"
  ON public.beta_feedback FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all beta feedback"
  ON public.beta_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete any beta feedback"
  ON public.beta_feedback FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));