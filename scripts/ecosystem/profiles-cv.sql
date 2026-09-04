-- About tab as a live CV: portrait + structured cv jsonb.
-- Applied via Supabase MCP on zkflkpbmbozrchqncpzi (profiles_cv_about).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_photo_url text,
  ADD COLUMN IF NOT EXISTS cv jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.cv_photo_url IS
  'Optional square portrait for the About CV. Falls back to avatar_url when null.';
COMMENT ON COLUMN public.profiles.cv IS
  'About CV extras: {education, tools, workArrangement, languages}';

GRANT UPDATE (cv_photo_url, cv) ON public.profiles TO authenticated;

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_barrier = true)
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
  p.cv
FROM public.profiles p
WHERE coalesce(p.account_status, 'active') = 'active';

ALTER VIEW public.profiles_public SET (security_invoker = false);

GRANT SELECT ON public.profiles_public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
