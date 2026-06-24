-- In-House follow-up: pending invites for home page + invitee read policy

CREATE OR REPLACE FUNCTION public.get_my_pending_inhouse_invites()
RETURNS TABLE (
  id uuid,
  org_id uuid,
  token text,
  email text,
  role public.inhouse_member_role,
  expires_at timestamptz,
  org_name text,
  org_slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.org_id,
    i.token,
    i.email,
    i.role,
    i.expires_at,
    o.name AS org_name,
    o.slug AS org_slug
  FROM public.inhouse_invites i
  JOIN public.inhouse_orgs o ON o.id = i.org_id
  JOIN public.profiles p ON p.user_id = auth.uid()
  WHERE i.accepted_at IS NULL
    AND i.expires_at > now()
    AND (
      i.email IS NULL
      OR lower(trim(i.email)) = lower(trim(COALESCE(p.email, '')))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_pending_inhouse_invites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_pending_inhouse_invites() TO authenticated;

DROP POLICY IF EXISTS "inhouse_invites_select_invitee" ON public.inhouse_invites;
CREATE POLICY "inhouse_invites_select_invitee" ON public.inhouse_invites FOR SELECT TO authenticated
  USING (
    accepted_at IS NULL
    AND expires_at > now()
    AND email IS NOT NULL
    AND lower(trim(email)) = lower(trim(COALESCE(
      (SELECT pr.email FROM public.profiles pr WHERE pr.user_id = auth.uid()),
      ''
    )))
  );
