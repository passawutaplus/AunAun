-- Rollback of 20261128190000_redesign_catalog_many.sql: one catalog per work again.
-- A work that is in several catalogs keeps only the one it was added to first; the others lose it.

DELETE FROM anthem.project_series_items i
USING anthem.project_series_items keep
WHERE keep.project_id = i.project_id
  AND (keep.added_at, keep.series_id) < (i.added_at, i.series_id);

CREATE UNIQUE INDEX IF NOT EXISTS project_series_items_project_unique ON anthem.project_series_items USING btree (project_id);
