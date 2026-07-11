-- Deduplicate any existing same-image rows, then enforce uniqueness per board.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY board_id, image_url
      ORDER BY added_at ASC, id ASC
    ) AS rn
  FROM anthem.inspire_items
)
DELETE FROM anthem.inspire_items i
USING ranked r
WHERE i.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS inspire_items_board_image_uidx
  ON anthem.inspire_items (board_id, image_url);
