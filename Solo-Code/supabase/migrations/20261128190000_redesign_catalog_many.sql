-- Redesign step 10 (My Studio → Catalogs): a work may be in several catalogs (owner 2026-11-28).
-- Until now a unique index on project_series_items(project_id) kept each work in one catalog only.
-- The primary key (series_id, project_id) still stops the same work twice in one catalog.
-- Rollback: supabase/manual/rollback-20261128190000_redesign_catalog_many.sql

DROP INDEX IF EXISTS anthem.project_series_items_project_unique;
