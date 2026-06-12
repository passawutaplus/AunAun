-- Paste into Supabase SQL Editor (an1hem project) → Run
-- Adds optional cover image for job board cards.

ALTER TABLE anthem.job_posts
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN anthem.job_posts.cover_image_url IS 'Optional hero/cover image shown on job board cards and detail page.';
