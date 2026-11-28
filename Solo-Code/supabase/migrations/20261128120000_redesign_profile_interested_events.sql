-- Profile page of the new design (step 5): the "Interested" list in a profile's Events tab.
-- Owner decision 2026-11-28: a person chooses whether others see the events they marked as
-- interested (mock MyProfile: "Hosted ทุกคนเห็นเสมอ · Interested เลือกได้ว่าให้คนอื่นเห็นไหม").
-- The switch is the key "interested_events" in public.profiles.public_visibility (jsonb, next to
-- bio/location/skills/socials/joined). Missing = off ("เห็นแค่คุณ", the mock's default).
-- anthem.event_interests itself stays private (people read only their own rows). This function gives
-- out only the ids of PUBLISHED events and when they were marked — no reminder flags, no drafts —
-- and only when the switch is on (the person themself always sees their own list).
CREATE OR REPLACE FUNCTION public.profile_interested_events(_user_id uuid)
RETURNS TABLE (event_id uuid, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT i.event_id, i.created_at
  FROM anthem.event_interests i
  JOIN anthem.events e ON e.id = i.event_id
  JOIN public.profiles p ON p.user_id = i.user_id
  WHERE i.user_id = _user_id
    AND e.status = 'published'
    AND (
      i.user_id = (SELECT auth.uid())
      OR coalesce((p.public_visibility ->> 'interested_events')::boolean, false)
    )
  ORDER BY i.created_at DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.profile_interested_events(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_interested_events(uuid) TO anon, authenticated;
