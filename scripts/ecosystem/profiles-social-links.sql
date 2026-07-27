-- Free-form social / external links on profile About (title + url).
-- Applied via Supabase MCP on zkflkpbmbozrchqncpzi (profiles_social_links).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.social_links IS
  'JSON array of {id,title,url} links shown on About Me';

GRANT UPDATE (social_links) ON public.profiles TO authenticated;

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
  p.project_rate_note
FROM public.profiles p
WHERE coalesce(p.account_status, 'active') = 'active';

ALTER VIEW public.profiles_public SET (security_invoker = false);

GRANT SELECT ON public.profiles_public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
