-- Package → own portfolio works as sample references
ALTER TABLE anthem.creator_services
  ADD COLUMN IF NOT EXISTS reference_project_ids text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN anthem.creator_services.reference_project_ids IS
  'Published portfolio project ids the creator curated as samples for this package';
