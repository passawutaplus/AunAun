-- Replace the SECURITY DEFINER-style view (flagged by the linter) with a
-- SECURITY DEFINER function that pins search_path and explicitly gates on admin role.

DROP VIEW IF EXISTS public.admin_profiles_safe;

CREATE OR REPLACE FUNCTION public.admin_list_profiles_safe()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  brand_name text,
  avatar_url text,
  tagline text,
  created_at timestamptz,
  updated_at timestamptz,
  last_active_at timestamptz,
  is_active boolean,
  deactivated_at timestamptz,
  deactivated_by uuid,
  purge_after timestamptz,
  purged_at timestamptz,
  tester_approved boolean,
  tester_applied_at timestamptz,
  onboarding_completed boolean,
  onboarding_data jsonb,
  persona text,
  freelance_field text,
  archetype text,
  archetype_secondary text,
  subscription_tier text,
  subscription_seats integer,
  currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.user_id, p.email, p.display_name, p.brand_name, p.avatar_url, p.tagline,
    p.created_at, p.updated_at, p.last_active_at,
    p.is_active, p.deactivated_at, p.deactivated_by, p.purge_after, p.purged_at,
    p.tester_approved, p.tester_applied_at,
    p.onboarding_completed, p.onboarding_data, p.persona,
    p.freelance_field, p.archetype, p.archetype_secondary,
    p.subscription_tier, p.subscription_seats, p.currency
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::app_role);
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles_safe() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles_safe() TO authenticated;

COMMENT ON FUNCTION public.admin_list_profiles_safe() IS
  'Admin-only listing of profiles excluding sensitive fields (bank, tax_id, phone, address, payment QR, terms). Returns empty for non-admins.';