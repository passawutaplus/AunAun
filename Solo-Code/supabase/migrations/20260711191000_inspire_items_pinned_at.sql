ALTER TABLE anthem.inspire_items
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS inspire_items_board_pinned_idx
  ON anthem.inspire_items (board_id, pinned_at DESC NULLS LAST, added_at DESC);

COMMENT ON COLUMN anthem.inspire_items.pinned_at IS
  'When set, item is pinned to top within its board / library.';
