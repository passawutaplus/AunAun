-- Events: new category "meetup" (creative community meet-ups; the Event tab of the new design has a Meetup chip).
-- Only the allowed list grows; existing rows are untouched.
-- Undo: supabase/manual/rollback-20261127220000_event_category_meetup.sql

ALTER TABLE anthem.events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE anthem.events ADD CONSTRAINT events_category_check
  CHECK (category IN ('exhibition', 'workshop', 'art_fair', 'talk_forum', 'open_call', 'meetup', 'other'));
