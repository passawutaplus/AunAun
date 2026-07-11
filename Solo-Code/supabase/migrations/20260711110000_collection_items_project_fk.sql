-- Restore FK so PostgREST can embed projects from collection_items.
-- Without this, selects like projects:project_id(*) fail and collection detail shows empty.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'collection_items'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'projects'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'anthem'
      AND table_name = 'collection_items'
      AND constraint_name = 'collection_items_project_id_fkey'
  ) THEN
    DELETE FROM anthem.collection_items ci
    WHERE ci.project_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM anthem.projects p WHERE p.id = ci.project_id);

    ALTER TABLE anthem.collection_items
      ADD CONSTRAINT collection_items_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES anthem.projects(id) ON DELETE CASCADE;
  END IF;
END $$;
