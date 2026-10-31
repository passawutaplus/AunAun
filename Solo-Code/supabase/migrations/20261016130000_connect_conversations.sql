-- "Just connect": a plain chat between two people, started from a profile without a hire or collab
-- request first (Chat-first MVP). Same table and policies as other direct chats; only the kind is new.
ALTER TABLE shared.conversations DROP CONSTRAINT IF EXISTS conversations_kind_check;
ALTER TABLE shared.conversations
  ADD CONSTRAINT conversations_kind_check
  CHECK (kind = ANY (ARRAY['hire'::text, 'collab'::text, 'group'::text, 'studio'::text, 'object'::text, 'connect'::text]));
