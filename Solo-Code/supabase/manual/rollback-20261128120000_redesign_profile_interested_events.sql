-- Undo of 20261128120000_redesign_profile_interested_events.
-- Interested events become private again (profiles then show Hosted events only). The
-- "interested_events" key in public_visibility is harmless without the function and is left as it is.
DROP FUNCTION IF EXISTS public.profile_interested_events(uuid);
