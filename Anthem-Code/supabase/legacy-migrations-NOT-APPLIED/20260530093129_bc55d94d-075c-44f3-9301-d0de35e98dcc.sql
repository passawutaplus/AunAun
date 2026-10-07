
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('user','project','comment','studio','message')),
  target_id uuid NOT NULL,
  target_owner_id uuid,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','nsfw','copyright','scam','impersonation','other')),
  details text NOT NULL DEFAULT '',
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  admin_note text NOT NULL DEFAULT '',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters insert own reports"
ON public.user_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id AND (target_owner_id IS NULL OR reporter_id <> target_owner_id));

CREATE POLICY "Reporters view own; admins view all"
ON public.user_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update reports"
ON public.user_reports FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete reports"
ON public.user_reports FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_user_reports_status_created ON public.user_reports (status, created_at DESC);
CREATE INDEX idx_user_reports_target ON public.user_reports (target_type, target_id);
CREATE INDEX idx_user_reports_reporter ON public.user_reports (reporter_id);
CREATE UNIQUE INDEX uniq_open_report_per_reporter_target
  ON public.user_reports (reporter_id, target_type, target_id) WHERE status = 'open';

CREATE TRIGGER trg_user_reports_updated_at
BEFORE UPDATE ON public.user_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL DEFAULT 'general',
  route text NOT NULL DEFAULT '',
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  viewport text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.app_feedback TO authenticated;
GRANT ALL ON public.app_feedback TO service_role;

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
ON public.app_feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own; admins view all"
ON public.app_feedback FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete feedback"
ON public.app_feedback FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_app_feedback_feature_created ON public.app_feedback (feature, created_at DESC);
CREATE INDEX idx_app_feedback_rating ON public.app_feedback (rating);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_feedback;
