-- Short public status note for creator opportunity status.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS opportunity_note text;

COMMENT ON COLUMN public.profiles.opportunity_note IS
  'Short public status note for what the creator is looking for right now.';

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
  p.cover_url,
  p.is_verified,
  p.location,
  p.opportunity_status,
  p.opportunity_types,
  p.opportunity_note,
  p.open_for_work,
  p.open_for_work_badge,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE coalesce(p.account_status, 'active') = 'active';

GRANT SELECT ON public.profiles_public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';