
-- 1) Trim price_guide_events to last 5 per user
CREATE OR REPLACE FUNCTION public.trim_price_guide_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.price_guide_events
  WHERE user_id = NEW.user_id
    AND id IN (
      SELECT id FROM public.price_guide_events
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      OFFSET 5
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trim_price_guide_history_trg ON public.price_guide_events;
CREATE TRIGGER trim_price_guide_history_trg
AFTER INSERT ON public.price_guide_events
FOR EACH ROW EXECUTE FUNCTION public.trim_price_guide_history();

-- 2) Survey responses (guest + user)
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  guest_id TEXT,
  persona TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON public.survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_guest ON public.survey_responses(guest_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created ON public.survey_responses(created_at DESC);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a survey"
  ON public.survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can view their submissions"
  ON public.survey_responses FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins can view all submissions"
  ON public.survey_responses FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
