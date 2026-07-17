-- Collab decline metadata (peer-friendly; no hire-style forward).
-- Safe to re-run.

ALTER TABLE anthem.collab_requests
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS reject_note text,
  ADD COLUMN IF NOT EXISTS keep_chat boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN anthem.collab_requests.reject_reason IS
  'busy_now | style_mismatch | not_ready | solo_focus | busy_but_chat | other';
COMMENT ON COLUMN anthem.collab_requests.reject_note IS
  'Optional note shown to requester when declined';
COMMENT ON COLUMN anthem.collab_requests.keep_chat IS
  'When true, declined but conversation remains open for light ideation';
