-- Ecosystem Phase 1 base: cross-app link tracking (prerequisite for Ops Hub control plane)
-- Source: scripts/ecosystem/ecosystem-phase1.sql

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS seat_quantity integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.ecosystem_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  source_app text NOT NULL DEFAULT 'anthem',
  source_page text,
  ref_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ecosystem_links_user_created_idx
  ON public.ecosystem_links (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ecosystem_links_created_idx
  ON public.ecosystem_links (created_at DESC);

ALTER TABLE public.ecosystem_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Users insert own ecosystem links"
  ON public.ecosystem_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Users read own ecosystem links"
  ON public.ecosystem_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Service role manages ecosystem links"
  ON public.ecosystem_links FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
