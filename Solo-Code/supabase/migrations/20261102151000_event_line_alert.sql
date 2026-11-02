-- LINE admin group: a message every time an exhibition event enters the review queue
-- (first submission or resubmission). Uses the existing outbox → line-admin-notify path.
-- 'event' is not in admin_line_outbox_ref_uniq, so a resubmitted event alerts again on purpose.

-- The outbox only accepts known kinds (admin_line_enqueue swallows the error, so a missing kind fails silently).
ALTER TABLE public.admin_line_outbox DROP CONSTRAINT IF EXISTS admin_line_outbox_kind_check;
ALTER TABLE public.admin_line_outbox ADD CONSTRAINT admin_line_outbox_kind_check
  CHECK (kind = ANY (ARRAY['member', 'feedback', 'report', 'digest', 'event']));

CREATE OR REPLACE FUNCTION public.admin_line_event_info(_id uuid)
RETURNS TABLE (title text, category text, starts_on date, ends_on date, location_name text,
               organizer_name text, owner text, submitted_at timestamptz, resubmitted boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  SELECT e.title, e.category, e.starts_on, e.ends_on, e.location_name, e.organizer_name,
         p.username::text, e.submitted_at, e.reviewed_at IS NOT NULL
    FROM anthem.events e
    LEFT JOIN public.profiles p ON p.user_id = e.owner_id
   WHERE e.id = _id;
$$;

REVOKE ALL ON FUNCTION public.admin_line_event_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_event_info(uuid) TO service_role;

CREATE OR REPLACE FUNCTION anthem.admin_line_on_event_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
    PERFORM public.admin_line_enqueue('event', NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never block the owner's submit
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_line_event ON anthem.events;
CREATE TRIGGER trg_admin_line_event
  AFTER UPDATE OF status ON anthem.events
  FOR EACH ROW EXECUTE FUNCTION anthem.admin_line_on_event_pending();
