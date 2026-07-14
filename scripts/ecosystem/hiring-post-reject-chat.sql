-- After hard reject: gate chat until client / freelancer decide continue vs close
ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS post_reject_chat text;

ALTER TABLE anthem.hiring_requests
  DROP CONSTRAINT IF EXISTS hiring_requests_post_reject_chat_chk;
ALTER TABLE anthem.hiring_requests
  ADD CONSTRAINT hiring_requests_post_reject_chat_chk
  CHECK (
    post_reject_chat IS NULL
    OR post_reject_chat IN (
      'awaiting_client',
      'awaiting_freelancer',
      'open',
      'locked'
    )
  );

COMMENT ON COLUMN anthem.hiring_requests.post_reject_chat IS
  'After hard reject: awaiting_client | awaiting_freelancer | open (soft continue) | locked';
