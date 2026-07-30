-- Package view attribution: which portfolio project led the visitor to this package
-- Apply on shared Anthem DB (zkflkpbmbozrchqncpzi).

ALTER TABLE anthem.creator_service_views
  ADD COLUMN IF NOT EXISTS referrer_project_id uuid;

CREATE INDEX IF NOT EXISTS idx_creator_service_views_referrer_project
  ON anthem.creator_service_views (service_id, referrer_project_id)
  WHERE referrer_project_id IS NOT NULL;

COMMENT ON COLUMN anthem.creator_service_views.referrer_project_id IS
  'Portfolio project the visitor came from when first opening this package (first-touch attribution)';
