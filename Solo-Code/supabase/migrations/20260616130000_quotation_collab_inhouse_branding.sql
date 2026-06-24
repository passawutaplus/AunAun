-- Team/studio quotations + org document branding (Programs B & C)

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS quotation_kind text NOT NULL DEFAULT 'solo'
    CHECK (quotation_kind IN ('solo', 'inhouse', 'studio')),
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.inhouse_orgs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS studio_id uuid,
  ADD COLUMN IF NOT EXISTS studio_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS inhouse_workspace_id uuid REFERENCES public.inhouse_workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quotations_org_id_idx ON public.quotations (org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quotations_kind_idx ON public.quotations (quotation_kind);

ALTER TABLE public.inhouse_orgs
  ADD COLUMN IF NOT EXISTS document_theme jsonb,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS brand_tagline text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

CREATE TABLE IF NOT EXISTS public.quotation_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
  revenue_percent numeric(5, 2),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_id, user_id)
);

CREATE INDEX IF NOT EXISTS quotation_collaborators_quote_idx
  ON public.quotation_collaborators (quotation_id);

ALTER TABLE public.quotation_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotation_collaborators_select" ON public.quotation_collaborators;
CREATE POLICY "quotation_collaborators_select" ON public.quotation_collaborators
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (q.user_id = auth.uid() OR public.inhouse_is_org_member(q.org_id))
    )
  );

DROP POLICY IF EXISTS "quotation_collaborators_insert" ON public.quotation_collaborators;
CREATE POLICY "quotation_collaborators_insert" ON public.quotation_collaborators
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (q.user_id = auth.uid() OR public.inhouse_is_org_admin(q.org_id))
    )
  );

DROP POLICY IF EXISTS "quotation_collaborators_update" ON public.quotation_collaborators;
CREATE POLICY "quotation_collaborators_update" ON public.quotation_collaborators
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (q.user_id = auth.uid() OR public.inhouse_is_org_admin(q.org_id))
    )
  );

DROP POLICY IF EXISTS "quotation_collaborators_delete" ON public.quotation_collaborators;
CREATE POLICY "quotation_collaborators_delete" ON public.quotation_collaborators
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (q.user_id = auth.uid() OR public.inhouse_is_org_admin(q.org_id))
    )
  );

-- Org members can read team quotations
DROP POLICY IF EXISTS "Org members view org quotations" ON public.quotations;
CREATE POLICY "Org members view org quotations" ON public.quotations
  FOR SELECT TO authenticated
  USING (
    org_id IS NOT NULL AND public.inhouse_is_org_member(org_id)
  );

DROP POLICY IF EXISTS "Org admins update org quotations" ON public.quotations;
CREATE POLICY "Org admins update org quotations" ON public.quotations
  FOR UPDATE TO authenticated
  USING (
    org_id IS NOT NULL AND public.inhouse_is_org_admin(org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL AND public.inhouse_is_org_admin(org_id)
  );
