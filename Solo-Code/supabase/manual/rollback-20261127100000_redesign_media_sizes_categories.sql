-- Rollback for migrations/20261127100000_redesign_media_sizes_categories.sql
-- Removes only what that migration added. Legacy columns (category, preferred_categories,
-- cover_url, gallery_urls, email ...) were never touched, so no user data is lost except what
-- was typed into the new columns after the redesign shipped (sc_category, sc_categories,
-- contact_email): export those first if the redesign has been live.

BEGIN;

DROP INDEX IF EXISTS anthem.projects_sc_category_idx;

ALTER TABLE anthem.projects
  DROP CONSTRAINT IF EXISTS projects_sc_category_check,
  DROP CONSTRAINT IF EXISTS projects_cover_size_check,
  DROP CONSTRAINT IF EXISTS projects_media_sizes_check,
  DROP COLUMN IF EXISTS sc_category,
  DROP COLUMN IF EXISTS cover_width,
  DROP COLUMN IF EXISTS cover_height,
  DROP COLUMN IF EXISTS media_sizes;

ALTER TABLE anthem.events
  DROP CONSTRAINT IF EXISTS events_cover_size_check,
  DROP CONSTRAINT IF EXISTS events_media_sizes_check,
  DROP COLUMN IF EXISTS cover_width,
  DROP COLUMN IF EXISTS cover_height,
  DROP COLUMN IF EXISTS media_sizes;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_sc_categories_check,
  DROP CONSTRAINT IF EXISTS profiles_contact_email_check,
  DROP COLUMN IF EXISTS sc_categories,
  DROP COLUMN IF EXISTS contact_email;

DROP FUNCTION IF EXISTS anthem.sc_categories_from_legacy(text);

COMMIT;
