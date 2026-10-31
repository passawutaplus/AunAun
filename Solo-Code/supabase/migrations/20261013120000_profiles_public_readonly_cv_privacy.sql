-- profiles_public: read-only again, and the CV it serves no longer carries fields the owner hid.
--
-- 1) Write hole. 20260904064740_profiles_cv_about (applied straight to prod) did DROP VIEW + CREATE VIEW,
--    so Supabase's default privileges handed anon / authenticated INSERT, UPDATE and DELETE on the new view.
--    The view runs as its owner (security_invoker = false, owner postgres bypasses RLS) and is
--    auto-updatable, so anyone holding the public key could PATCH or DELETE any active profile through
--    /rest/v1/profiles_public. 20260711221000 had already revoked these; the recreate silently undid it.
--    No app writes through this view (they all write public.profiles under RLS).
--
-- 2) CV privacy. The `cv` column was served whole. Contact details (e-mail / LINE / phone), birth date,
--    nationality, military status and references were hidden only by the browser. They are now removed
--    here unless the owner switched them on (same defaults as src/lib/profileCv.ts: contact fields follow
--    the legacy `contactPublic` flag, the opt-in personal blocks default to hidden).
--    The owner still reads the full CV from public.profiles (own-row RLS), so editing is unaffected.
--
-- Recreating this view (DROP + CREATE) resets its grants: always re-run the REVOKE / GRANT block below.

CREATE OR REPLACE FUNCTION public.cv_public_projection(_cv jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN _cv IS NULL OR jsonb_typeof(_cv) <> 'object' THEN _cv
    ELSE _cv - ARRAY(
      SELECT f.key
      FROM (VALUES
        ('contactEmail', true),
        ('contactLine', true),
        ('contactPhone', true),
        ('birthDate', false),
        ('nationality', false),
        ('military', false),
        ('references', false)
      ) AS f(key, follows_contact_public)
      WHERE NOT coalesce(
        CASE
          WHEN jsonb_typeof(_cv -> 'visibility' -> f.key) = 'boolean'
            THEN (_cv -> 'visibility' -> f.key) = 'true'::jsonb
        END,
        f.follows_contact_public AND coalesce((_cv -> 'contactPublic') = 'true'::jsonb, false)
      )
    )
  END;
$$;

COMMENT ON FUNCTION public.cv_public_projection(jsonb) IS
  'CV as other people may see it: drops contact / personal fields the owner did not switch on.';

-- Same columns, order and filter as the live view; only `cv` is projected.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  p.user_id,
  p.id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.bio,
  p.role,
  p.skills,
  p.experience,
  p.website,
  p.instagram,
  p.facebook,
  p.line_id,
  p.social_links,
  p.cover_url,
  p.is_verified,
  p.location,
  p.profile_address,
  p.opportunity_status,
  p.opportunity_types,
  p.opportunity_note,
  p.open_for_work,
  p.open_for_work_badge,
  p.preferred_categories,
  p.created_at,
  p.updated_at,
  p.availability_status,
  p.hourly_rate_min,
  p.daily_rate_min,
  p.project_rate_note,
  p.last_active_at,
  p.cv_photo_url,
  public.cv_public_projection(p.cv) AS cv
FROM public.profiles p
WHERE coalesce(p.account_status, 'active') = 'active';

COMMENT ON VIEW public.profiles_public IS
  'Public profile directory. READ-ONLY: runs as owner (bypasses RLS), so never grant write privileges. '
  'DROP + CREATE resets grants — re-run the REVOKE / GRANT block from 20261013120000.';

REVOKE ALL ON public.profiles_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
GRANT ALL ON public.profiles_public TO service_role;

NOTIFY pgrst, 'reload schema';
