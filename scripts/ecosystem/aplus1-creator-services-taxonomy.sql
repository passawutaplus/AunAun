-- Package taxonomy (same shape as projects: category + tags, catsub: for subcategory)
ALTER TABLE anthem.creator_services
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';

ALTER TABLE anthem.creator_services
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN anthem.creator_services.category IS
  'Primary category leaf (same vocabulary as projects.category)';

COMMENT ON COLUMN anthem.creator_services.tags IS
  'Free tags + optional catsub:<id> for subcategory round-trip';

CREATE INDEX IF NOT EXISTS idx_creator_services_published_category
  ON anthem.creator_services (category)
  WHERE status = 'Published' AND category <> '';

CREATE INDEX IF NOT EXISTS idx_creator_services_published_tags
  ON anthem.creator_services USING gin (tags)
  WHERE status = 'Published';
