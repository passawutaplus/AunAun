-- CRITICAL PII fix: public.profiles had policy "profiles_select_public_active"
-- granting anon (unauthenticated / anyone on the internet) SELECT on EVERY active
-- profile row with ALL columns — including email, phone, address, tax_id,
-- bank_account_number, payment_qr_url, stripe_connect_account_id, etc.
-- The app is designed to expose only curated columns via the public.profiles_public
-- view, so lock anon down to column-level SELECT on those same safe columns and
-- strip all write privileges. RLS still limits rows to active profiles.
--
-- NOTE: authenticated users can still read other users'' full rows via this policy;
-- that is a separate follow-up requiring call sites to move to profiles_public
-- before the base-table policy can be dropped. This migration closes the
-- internet-facing (anon) exposure immediately.

revoke all on public.profiles from anon;

grant select (
  user_id, id, display_name, username, avatar_url, bio, role, skills, experience,
  website, instagram, facebook, line_id, cover_url, is_verified, location,
  opportunity_status, opportunity_types, opportunity_note, open_for_work,
  open_for_work_badge, created_at, updated_at
) on public.profiles to anon;
