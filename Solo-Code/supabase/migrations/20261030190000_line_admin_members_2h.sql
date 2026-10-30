-- New members are no longer alerted one by one: they are held and released in one batch every 2 hours
-- (08:00, 10:00 ... 22:00, 00:00 Bangkok). Nothing is sent for an empty window, so no message credit is
-- spent. Sign-ups between 00:00 and 08:00 are released with the 08:00 batch.

ALTER TABLE public.admin_line_outbox DROP CONSTRAINT IF EXISTS admin_line_outbox_status_check;
ALTER TABLE public.admin_line_outbox
  ADD CONSTRAINT admin_line_outbox_status_check
  CHECK (status IN ('held', 'pending', 'sending', 'sent', 'failed', 'skipped'));

-- Member trigger: park the row as 'held' (no wake-up of the sender).
CREATE OR REPLACE FUNCTION public.admin_line_on_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
    INSERT INTO public.admin_line_outbox (kind, ref_id, status) VALUES ('member', NEW.id, 'held') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_on_member() FROM PUBLIC, anon, authenticated;

-- Release everything held so far; the sender turns it into a single message.
CREATE OR REPLACE FUNCTION public.admin_line_release_members()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released integer;
BEGIN
  UPDATE public.admin_line_outbox SET status = 'pending' WHERE kind = 'member' AND status = 'held';
  GET DIAGNOSTICS released = ROW_COUNT;
  IF released > 0 THEN
    PERFORM public.admin_line_wake();
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_release_members() FROM PUBLIC, anon, authenticated;

-- 01,03,...,17 UTC = 08:00,10:00,...,00:00 Bangkok
SELECT cron.schedule('line-admin-members', '0 1,3,5,7,9,11,13,15,17 * * *', $$select public.admin_line_release_members()$$);
