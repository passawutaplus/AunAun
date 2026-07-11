-- Central Inspire library: one system default board per owner.
ALTER TABLE anthem.inspire_boards
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS inspire_boards_one_default_per_owner
  ON anthem.inspire_boards (owner_id)
  WHERE is_default = true;

COMMENT ON COLUMN anthem.inspire_boards.is_default IS
  'System library board (central Inspire home). At most one per owner.';
