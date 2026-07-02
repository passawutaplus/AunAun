-- Portfolio video URLs on anthem.projects (Aplus1 editor + detail page)
-- Idempotent — safe to re-run

ALTER TABLE anthem.projects
  ADD COLUMN IF NOT EXISTS video_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN anthem.projects.video_urls IS 'Optional portfolio video URLs (separate from gallery_urls images)';
