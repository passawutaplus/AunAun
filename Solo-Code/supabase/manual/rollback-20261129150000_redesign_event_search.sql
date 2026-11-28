-- Rollback of 20261129150000_redesign_event_search.sql: the search function goes (the Event tab then searches
-- in the browser over titles and places only).
DROP FUNCTION IF EXISTS public.event_search(text[], text[], text[], text[], boolean, date, date, integer);
NOTIFY pgrst, 'reload schema';
