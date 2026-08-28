-- Ticket-shaped Aplus1 in-app feedback (applied remotely as aplus1_feedback_snip_tickets).
-- Mirrors production: kind, ticket_number, screenshot_path, extended submit_feedback, private bucket.

ALTER TABLE anthem.app_feedback
  ALTER COLUMN rating DROP NOT NULL;

ALTER TABLE anthem.app_feedback
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS screenshot_path text NOT NULL DEFAULT '';

ALTER TABLE anthem.app_feedback
  DROP CONSTRAINT IF EXISTS app_feedback_kind_check;
ALTER TABLE anthem.app_feedback
  ADD CONSTRAINT app_feedback_kind_check
  CHECK (kind IS NULL OR kind IN ('bug', 'idea', 'error'));

CREATE SEQUENCE IF NOT EXISTS anthem.app_feedback_ticket_seq START WITH 1001;

UPDATE anthem.app_feedback
SET ticket_number = 'AP-' || nextval('anthem.app_feedback_ticket_seq')::text
WHERE ticket_number IS NULL OR btrim(ticket_number) = '';

ALTER TABLE anthem.app_feedback
  ALTER COLUMN ticket_number SET DEFAULT ('AP-' || nextval('anthem.app_feedback_ticket_seq')::text);

CREATE UNIQUE INDEX IF NOT EXISTS app_feedback_ticket_number_uidx
  ON anthem.app_feedback (ticket_number);

CREATE INDEX IF NOT EXISTS app_feedback_kind_idx
  ON anthem.app_feedback (kind);
