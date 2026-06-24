
CREATE TABLE public.archetype_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  main_archetype text NOT NULL,
  secondary_archetype text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  share_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.archetype_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_can_select_own_results"
  ON public.archetype_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "public_can_select_via_share"
  ON public.archetype_results FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_insert"
  ON public.archetype_results FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "owner_can_delete_own_results"
  ON public.archetype_results FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_archetype_results_user ON public.archetype_results(user_id);
CREATE INDEX idx_archetype_results_token ON public.archetype_results(share_token);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archetype text,
  ADD COLUMN IF NOT EXISTS archetype_secondary text;
