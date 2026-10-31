-- Packages Saved becomes a small decision tracker: a private status, note and folder label per saved package.
-- Rows stay private to their owner (existing policy creator_service_bookmarks_own covers UPDATE).

ALTER TABLE anthem.creator_service_bookmarks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'interested',
  ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS folder text NOT NULL DEFAULT '';

ALTER TABLE anthem.creator_service_bookmarks
  DROP CONSTRAINT IF EXISTS creator_service_bookmarks_status_check,
  ADD CONSTRAINT creator_service_bookmarks_status_check
    CHECK (status IN ('interested', 'contacted', 'waiting_quote', 'hired')),
  DROP CONSTRAINT IF EXISTS creator_service_bookmarks_note_len,
  ADD CONSTRAINT creator_service_bookmarks_note_len CHECK (char_length(note) <= 500),
  DROP CONSTRAINT IF EXISTS creator_service_bookmarks_folder_len,
  ADD CONSTRAINT creator_service_bookmarks_folder_len CHECK (char_length(folder) <= 40);
