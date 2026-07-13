-- Add public "open for work" fields to the curated profiles_public view so the
-- designer/jobs directory can read them without touching the base profiles table.
-- DROP + CREATE required: CREATE OR REPLACE cannot remove/reorder view columns.
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
  SELECT
    user_id, id, display_name, username, avatar_url, bio, role, skills,
    experience, website, instagram, facebook, line_id, cover_url, is_verified,
    location, opportunity_status, opportunity_types, opportunity_note,
    open_for_work, open_for_work_badge, preferred_categories,
    created_at, updated_at,
    availability_status, hourly_rate_min, daily_rate_min, project_rate_note
  FROM public.profiles p
  WHERE coalesce(account_status, 'active') = 'active';
