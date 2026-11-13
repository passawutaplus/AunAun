-- Founding Projects: waitlist for a campaign (first one: Picker, The First 30).
-- Signed-out visitors can join with an email. No money, no order: just "tell me when it opens".
-- Each new sign-up alerts the admin LINE group (same outbox, same 40-a-day cap as the Support alerts).
-- Run AFTER 20261113120000_support_orders_donations_line.sql. The owner applies this by hand.

DO $guard$
BEGIN
  IF to_regclass('anthem.shop_orders') IS NULL THEN
    RAISE EXCEPTION 'Run 20261113120000_support_orders_donations_line.sql first';
  END IF;
END
$guard$;

CREATE TABLE IF NOT EXISTS anthem.founding_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign text NOT NULL CHECK (campaign IN ('picker')),
  email text NOT NULL,
  -- Set when the visitor happened to be signed in.
  user_id uuid,
  is_test boolean NOT NULL DEFAULT false,
  -- The visitor ticked "email me news about this campaign" at this moment.
  consent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign, email)
);
CREATE INDEX IF NOT EXISTS founding_waitlist_created_idx ON anthem.founding_waitlist (created_at DESC);

ALTER TABLE anthem.founding_waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.founding_waitlist FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON anthem.founding_waitlist TO authenticated;
GRANT ALL ON anthem.founding_waitlist TO service_role;

DROP POLICY IF EXISTS founding_waitlist_admin_read ON anthem.founding_waitlist;
CREATE POLICY founding_waitlist_admin_read ON anthem.founding_waitlist
  FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'));
-- Admins remove an address when someone asks to leave the list.
DROP POLICY IF EXISTS founding_waitlist_admin_delete ON anthem.founding_waitlist;
CREATE POLICY founding_waitlist_admin_delete ON anthem.founding_waitlist
  FOR DELETE TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'));

-- Returns nothing, and behaves the same for a new and an already-listed email,
-- so the form cannot be used to find out who is on the list.
CREATE OR REPLACE FUNCTION anthem.join_founding_waitlist(
  _campaign text,
  _email text,
  _is_test boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $function$
DECLARE
  v_email text := lower(btrim(COALESCE(_email, '')));
BEGIN
  IF COALESCE(_campaign, '') NOT IN ('picker') THEN
    RAISE EXCEPTION 'INVALID: campaign';
  END IF;
  IF length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' THEN
    RAISE EXCEPTION 'INVALID: email';
  END IF;
  -- No login here: one limit for the whole form.
  IF (SELECT count(*) FROM anthem.founding_waitlist WHERE created_at > now() - interval '1 day') >= 300 THEN
    RAISE EXCEPTION 'RATE_LIMIT: too many sign-ups right now';
  END IF;

  INSERT INTO anthem.founding_waitlist (campaign, email, user_id, is_test)
  VALUES (_campaign, v_email, auth.uid(), COALESCE(_is_test, false))
  ON CONFLICT (campaign, email) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION anthem.join_founding_waitlist(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.join_founding_waitlist(text, text, boolean) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- LINE admin group alert
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_line_outbox DROP CONSTRAINT IF EXISTS admin_line_outbox_kind_check;
ALTER TABLE public.admin_line_outbox ADD CONSTRAINT admin_line_outbox_kind_check
  CHECK (kind = ANY (ARRAY['member', 'feedback', 'report', 'digest', 'event', 'trend', 'creator_invite',
                           'sponsor', 'shop_order', 'donation', 'waitlist']));

CREATE OR REPLACE FUNCTION public.admin_line_waitlist_info(_id uuid)
RETURNS TABLE (campaign text, email text, is_test boolean, created_at timestamptz, total integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  SELECT w.campaign, w.email, w.is_test, w.created_at,
         (SELECT count(*)::integer FROM anthem.founding_waitlist x
           WHERE x.campaign = w.campaign AND NOT x.is_test)
    FROM anthem.founding_waitlist w
   WHERE w.id = _id;
$$;
REVOKE ALL ON FUNCTION public.admin_line_waitlist_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_waitlist_info(uuid) TO service_role;

-- Same trigger function as the Support alerts, now counting waitlist alerts in the daily cap too.
CREATE OR REPLACE FUNCTION anthem.admin_line_on_support_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.admin_line_outbox
       WHERE kind IN ('sponsor', 'shop_order', 'donation', 'waitlist')
         AND created_at > now() - interval '1 day') < 40 THEN
    PERFORM public.admin_line_enqueue(TG_ARGV[0], NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never block the visitor's submit
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_line_founding_waitlist ON anthem.founding_waitlist;
CREATE TRIGGER trg_admin_line_founding_waitlist
  AFTER INSERT ON anthem.founding_waitlist
  FOR EACH ROW EXECUTE FUNCTION anthem.admin_line_on_support_insert('waitlist');
