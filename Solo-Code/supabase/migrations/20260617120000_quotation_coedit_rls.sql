-- Co-edit RLS: collaborators can view/edit team & studio quotations

CREATE OR REPLACE FUNCTION public.is_quotation_collaborator(p_quotation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quotation_collaborators c
    WHERE c.quotation_id = p_quotation_id
      AND c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_quotation_lead_collaborator(p_quotation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quotation_collaborators c
    WHERE c.quotation_id = p_quotation_id
      AND c.user_id = auth.uid()
      AND c.role = 'lead'
  );
$$;

REVOKE ALL ON FUNCTION public.is_quotation_collaborator(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_quotation_lead_collaborator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_quotation_collaborator(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_quotation_lead_collaborator(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Collaborators view quotations" ON public.quotations;
CREATE POLICY "Collaborators view quotations"
  ON public.quotations FOR SELECT
  TO authenticated
  USING (public.is_quotation_collaborator(id));

DROP POLICY IF EXISTS "Lead collaborators update quotations" ON public.quotations;
CREATE POLICY "Lead collaborators update quotations"
  ON public.quotations FOR UPDATE
  TO authenticated
  USING (public.is_quotation_lead_collaborator(id))
  WITH CHECK (public.is_quotation_lead_collaborator(id));

DROP POLICY IF EXISTS "Lead collaborators manage collaborators" ON public.quotation_collaborators;
CREATE POLICY "Lead collaborators manage collaborators"
  ON public.quotation_collaborators FOR ALL
  TO authenticated
  USING (public.is_quotation_lead_collaborator(quotation_id))
  WITH CHECK (public.is_quotation_lead_collaborator(quotation_id));
