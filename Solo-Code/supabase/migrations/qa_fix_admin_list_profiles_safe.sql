-- QA fix: admin-safe profile listing for Mission Control
CREATE OR REPLACE FUNCTION public.admin_list_profiles_safe()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  brand_name text,
  created_at timestamptz,
  last_active_at timestamptz,
  is_active boolean,
  deactivated_at timestamptz,
  purge_after timestamptz,
  tester_approved boolean,
  tester_applied_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.user_id,
    p.email,
    p.display_name,
    p.brand_name,
    p.created_at,
    p.last_active_at,
    p.is_active,
    p.deactivated_at,
    p.purge_after,
    p.tester_approved,
    p.tester_applied_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles_safe() TO service_role;

NOTIFY pgrst, 'reload schema';
