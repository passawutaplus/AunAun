-- Owner-controlled order for works inside a collection.
-- NULL position = saved after the last manual reorder; the app shows those first (newest save on top).

ALTER TABLE anthem.collection_items
  ADD COLUMN IF NOT EXISTS position integer;

-- Backfill: keep today's order (newest saved first).
WITH ranked AS (
  SELECT collection_id, project_id,
         (row_number() OVER (PARTITION BY collection_id ORDER BY added_at DESC) - 1)::int AS rn
  FROM anthem.collection_items
  WHERE project_id IS NOT NULL
)
UPDATE anthem.collection_items ci
SET position = ranked.rn
FROM ranked
WHERE ci.collection_id = ranked.collection_id
  AND ci.project_id = ranked.project_id
  AND ci.position IS NULL;

CREATE INDEX IF NOT EXISTS collection_items_collection_position_idx
  ON anthem.collection_items (collection_id, position);

-- Reordering (and moving a work between the owner's own collections) needs UPDATE.
DROP POLICY IF EXISTS "Owners can reorder items in their collection" ON anthem.collection_items;
CREATE POLICY "Owners can reorder items in their collection"
  ON anthem.collection_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM anthem.collections c
      WHERE c.id = collection_items.collection_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM anthem.collections c
      WHERE c.id = collection_items.collection_id AND c.owner_id = auth.uid()
    )
  );
