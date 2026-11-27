-- Undo of 20261127200000_redesign_profiles_public_sc_columns: a view cannot lose columns with
-- CREATE OR REPLACE, so it is dropped and recreated as it was (20261018090000), with its grants.
-- Nothing else depends on the view (checked 2026-11-27).
BEGIN;
DROP VIEW public.profiles_public;
CREATE VIEW public.profiles_public WITH (security_barrier = true, security_invoker = false) AS
 SELECT user_id, id, display_name, username, avatar_url, bio, role, skills, experience, website, instagram,
    facebook, line_id, social_links, cover_url, is_verified, location, profile_address, opportunity_status,
    opportunity_types, opportunity_note, open_for_work, open_for_work_badge, preferred_categories, created_at,
    updated_at, availability_status, hourly_rate_min, daily_rate_min, project_rate_note, last_active_at,
    cv_photo_url, cv_public_projection(cv) AS cv, public_visibility
   FROM profiles p
  WHERE COALESCE(account_status, 'active'::text) = 'active'::text;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
COMMIT;
