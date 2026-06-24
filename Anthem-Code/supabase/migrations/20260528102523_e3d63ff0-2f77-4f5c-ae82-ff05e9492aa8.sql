CREATE TABLE public.project_views (
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_views TO authenticated;
GRANT ALL ON public.project_views TO service_role;

ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own view history"
  ON public.project_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own view history"
  ON public.project_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own view history"
  ON public.project_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own view history"
  ON public.project_views FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_project_views_user_viewed ON public.project_views (user_id, viewed_at DESC);
CREATE INDEX idx_project_views_project ON public.project_views (project_id);