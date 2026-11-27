-- Redesign 2026: other people's profiles are read through public.profiles_public.
-- Append the two public columns of the new design (added by 20261127100000): the 22-CATEGORY list and the
-- public contact e-mail. Existing columns and their order are unchanged, so CREATE OR REPLACE keeps the
-- view's grants (anon, authenticated: SELECT) and options.
-- Undo: supabase/manual/rollback-20261127200000_redesign_profiles_public_sc_columns.sql

CREATE OR REPLACE VIEW public.profiles_public WITH (security_barrier = true, security_invoker = false) AS
 SELECT user_id, id, display_name, username, avatar_url, bio, role, skills, experience, website, instagram,
    facebook, line_id, social_links, cover_url, is_verified, location, profile_address, opportunity_status,
    opportunity_types, opportunity_note, open_for_work, open_for_work_badge, preferred_categories, created_at,
    updated_at, availability_status, hourly_rate_min, daily_rate_min, project_rate_note, last_active_at,
    cv_photo_url, cv_public_projection(cv) AS cv, public_visibility,
    sc_categories, contact_email
   FROM profiles p
  WHERE COALESCE(account_status, 'active'::text) = 'active'::text;
