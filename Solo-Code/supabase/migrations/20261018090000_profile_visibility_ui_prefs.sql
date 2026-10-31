-- Settings revamp:
-- 1) public_visibility — "ใครเห็นอะไรบนโปรไฟล์" switches. The app already wrote this column, but it never
--    existed, so hidden fields stayed visible to everyone else. Public read (visitors need it to hide fields).
-- 2) ui_prefs — per-account copy of settings that used to live only in one browser
--    (bell kinds, language, timezone, rating prompt opt-out). Owner-only read via get_my_ui_prefs().

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_visibility jsonb,
  ADD COLUMN IF NOT EXISTS ui_prefs jsonb;

-- profiles uses column-level grants
GRANT SELECT (public_visibility) ON public.profiles TO anon, authenticated;
GRANT UPDATE (public_visibility, ui_prefs) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_ui_prefs()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ui_prefs FROM public.profiles WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_ui_prefs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_ui_prefs() TO authenticated;

-- Visitors read public profiles through profiles_public; append the column (existing columns unchanged).
CREATE OR REPLACE VIEW public.profiles_public WITH (security_barrier = true, security_invoker = false) AS
 SELECT user_id, id, display_name, username, avatar_url, bio, role, skills, experience, website, instagram,
    facebook, line_id, social_links, cover_url, is_verified, location, profile_address, opportunity_status,
    opportunity_types, opportunity_note, open_for_work, open_for_work_badge, preferred_categories, created_at,
    updated_at, availability_status, hourly_rate_min, daily_rate_min, project_rate_note, last_active_at,
    cv_photo_url, cv_public_projection(cv) AS cv, public_visibility
   FROM profiles p
  WHERE COALESCE(account_status, 'active'::text) = 'active'::text;
