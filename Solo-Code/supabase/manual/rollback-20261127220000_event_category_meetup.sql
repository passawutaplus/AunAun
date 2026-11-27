-- Undo of 20261127220000_event_category_meetup. Meetup events become "other" first, or the old rule would reject them.
BEGIN;
UPDATE anthem.events SET category = 'other' WHERE category = 'meetup';
ALTER TABLE anthem.events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE anthem.events ADD CONSTRAINT events_category_check
  CHECK (category IN ('exhibition', 'workshop', 'art_fair', 'talk_forum', 'open_call', 'other'));
COMMIT;
