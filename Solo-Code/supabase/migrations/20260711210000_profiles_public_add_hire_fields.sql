-- Add public "open for work" fields to the curated profiles_public view so the
-- designer/jobs directory can read them without touching the base profiles table.
create or replace view public.profiles_public as
  select
    user_id, id, display_name, username, avatar_url, bio, role, skills,
    experience, website, instagram, facebook, line_id, cover_url, is_verified,
    location, opportunity_status, opportunity_types, opportunity_note,
    open_for_work, open_for_work_badge, created_at, updated_at,
    availability_status, hourly_rate_min, daily_rate_min, project_rate_note
  from public.profiles p
  where coalesce(account_status, 'active') = 'active';
