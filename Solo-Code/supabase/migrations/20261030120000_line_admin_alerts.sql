-- LINE admin-group alerts (bot @samecor): new members, feedback, user reports, daily digest.
--
-- Flow: trigger -> public.admin_line_outbox row -> pg_net wakes edge function `line-admin-notify`
-- -> the function reads pending rows, formats them and pushes them to the admin LINE group.
-- A trigger never blocks the signup / feedback / report it hangs off: everything is wrapped in
-- EXCEPTION blocks. Until the edge function secrets are set the function skips; rows older than
-- 3 days are expired so an unconfigured bot never replays a backlog.
--
-- Nothing here is exposed to clients: RLS on, no policies, execute revoked from anon/authenticated.

-- ---------------------------------------------------------------------------
-- Outbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_line_outbox (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind        text        NOT NULL CHECK (kind IN ('member', 'feedback', 'report', 'digest')),
  ref_id      uuid,
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts    integer     NOT NULL DEFAULT 0,
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  claimed_at  timestamptz,
  sent_at     timestamptz
);

-- One alert per member / feedback / report, even if a trigger fires twice.
CREATE UNIQUE INDEX IF NOT EXISTS admin_line_outbox_ref_uniq
  ON public.admin_line_outbox (kind, ref_id) WHERE kind IN ('member', 'feedback', 'report');
CREATE INDEX IF NOT EXISTS admin_line_outbox_open_idx
  ON public.admin_line_outbox (status, id) WHERE status IN ('pending', 'sending');

ALTER TABLE public.admin_line_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_line_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_line_outbox TO service_role;

-- ---------------------------------------------------------------------------
-- Wake the sender (async HTTP, never raises)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_line_wake()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/line-admin-notify',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_wake() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enqueue helpers + triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_line_enqueue(_kind text, _ref uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_line_outbox (kind, ref_id) VALUES (_kind, _ref) ON CONFLICT DO NOTHING;
  PERFORM public.admin_line_wake();
EXCEPTION WHEN OTHERS THEN
  NULL; -- never block the originating write
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_enqueue(text, uuid) FROM PUBLIC, anon, authenticated;

-- A member counts once the email is confirmed (Google sign-ups are confirmed on insert).
CREATE OR REPLACE FUNCTION public.admin_line_on_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
    PERFORM public.admin_line_enqueue('member', NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_on_member() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_admin_line_member_insert ON auth.users;
CREATE TRIGGER trg_admin_line_member_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.admin_line_on_member();

DROP TRIGGER IF EXISTS trg_admin_line_member_confirm ON auth.users;
CREATE TRIGGER trg_admin_line_member_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.admin_line_on_member();

CREATE OR REPLACE FUNCTION public.admin_line_on_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_line_enqueue('feedback', NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_on_feedback() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_admin_line_feedback ON anthem.app_feedback;
CREATE TRIGGER trg_admin_line_feedback
  AFTER INSERT ON anthem.app_feedback
  FOR EACH ROW EXECUTE FUNCTION public.admin_line_on_feedback();

CREATE OR REPLACE FUNCTION public.admin_line_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_line_enqueue('report', NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_on_report() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_admin_line_report ON anthem.user_reports;
CREATE TRIGGER trg_admin_line_report
  AFTER INSERT ON anthem.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.admin_line_on_report();

-- ---------------------------------------------------------------------------
-- Claim a batch for the sender (skip-locked; stale work is released / expired)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_line_claim(_limit integer DEFAULT 20)
RETURNS SETOF public.admin_line_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_line_outbox
     SET status = 'skipped', last_error = 'expired (older than 3 days)'
   WHERE status = 'pending' AND created_at < now() - interval '3 days';

  UPDATE public.admin_line_outbox
     SET status = 'pending'
   WHERE status = 'sending' AND claimed_at < now() - interval '5 minutes';

  RETURN QUERY
  UPDATE public.admin_line_outbox o
     SET status = 'sending', attempts = o.attempts + 1, claimed_at = now()
   WHERE o.id IN (
     SELECT id FROM public.admin_line_outbox
      WHERE status = 'pending' AND attempts < 5
      ORDER BY id
      LIMIT GREATEST(1, LEAST(_limit, 50))
      FOR UPDATE SKIP LOCKED
   )
  RETURNING o.*;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_claim(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_claim(integer) TO service_role;

-- ---------------------------------------------------------------------------
-- Detail lookups (read at send time, so a profile created a moment after the auth row is included)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_line_member_info(_ids uuid[])
RETURNS TABLE (
  id uuid, email text, provider text, joined_at timestamptz,
  username text, display_name text, works integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id,
         u.email::text,
         COALESCE(u.raw_app_meta_data ->> 'provider', 'email'),
         u.created_at,
         pr.username::text,
         pr.display_name::text,
         (SELECT count(*)::integer FROM anthem.projects p WHERE p.owner_id = u.id)
    FROM auth.users u
    LEFT JOIN public.profiles pr ON pr.id = u.id
   WHERE u.id = ANY (_ids);
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_member_info(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_member_info(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_line_feedback_info(_id uuid)
RETURNS TABLE (
  ticket_number text, kind text, rating integer, message text, route text,
  created_at timestamptz, username text, from_app boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.ticket_number::text,
         f.kind::text,
         f.rating::integer,
         left(COALESCE(f.message, ''), 400),
         f.route::text,
         f.created_at,
         pr.username::text,
         COALESCE(f.user_agent, '') ILIKE '%SamecorApp%'
    FROM anthem.app_feedback f
    LEFT JOIN public.profiles pr ON pr.id = f.user_id
   WHERE f.id = _id;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_feedback_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_feedback_info(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_line_report_info(_id uuid)
RETURNS TABLE (
  target_type text, target_id uuid, reason text, details text,
  created_at timestamptz, reporter text, target_owner text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.target_type::text,
         r.target_id,
         r.reason::text,
         left(COALESCE(r.details, ''), 400),
         r.created_at,
         rp.username::text,
         op.username::text
    FROM anthem.user_reports r
    LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
    LEFT JOIN public.profiles op ON op.id = r.target_owner_id
   WHERE r.id = _id;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_report_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_report_info(uuid) TO service_role;

-- Daily digest numbers (last 24 h; test accounts excluded from member / work counts)
CREATE OR REPLACE FUNCTION public.admin_line_digest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - interval '24 hours';
  test_ids uuid[];
  out jsonb;
BEGIN
  SELECT COALESCE(array_agg(id), '{}') INTO test_ids
    FROM auth.users
   WHERE email ~* '@example\.(com|test)$' OR lower(email) = 'tester@samecor.com';

  SELECT jsonb_build_object(
    'total_members',   (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL AND NOT (id = ANY (test_ids))),
    'new_members',     (SELECT count(*) FROM auth.users WHERE email_confirmed_at >= since AND NOT (id = ANY (test_ids))),
    'new_works',       (SELECT count(*) FROM anthem.projects WHERE created_at >= since AND status = 'Published' AND NOT (owner_id = ANY (test_ids))),
    'new_works_list',  COALESCE((
                         SELECT jsonb_agg(jsonb_build_object('title', left(t.title, 40), 'owner', t.owner))
                           FROM (SELECT p.title, pr.username AS owner
                                   FROM anthem.projects p LEFT JOIN public.profiles pr ON pr.id = p.owner_id
                                  WHERE p.created_at >= since AND p.status = 'Published' AND NOT (p.owner_id = ANY (test_ids))
                                  ORDER BY p.created_at DESC LIMIT 8) t), '[]'::jsonb),
    'feedback_24h',    (SELECT count(*) FROM anthem.app_feedback WHERE created_at >= since),
    'feedback_open',   (SELECT count(*) FROM anthem.app_feedback WHERE status = 'new'),
    'reports_open',    (SELECT count(*) FROM anthem.user_reports WHERE status IN ('open', 'reviewing')),
    'sessions_24h',    (SELECT count(DISTINCT session_id) FROM public.product_events WHERE created_at >= since),
    'android_sessions_24h', (SELECT count(DISTINCT session_id) FROM public.product_events WHERE created_at >= since AND props ->> 'shell' = 'android')
  ) INTO out;
  RETURN out;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_digest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_digest() TO service_role;

-- ---------------------------------------------------------------------------
-- Schedules (pg_cron runs in UTC): 02:00 UTC = 09:00 Bangkok digest; 10-minute retry sweep
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_line_enqueue_digest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_line_outbox (kind) VALUES ('digest');
  PERFORM public.admin_line_wake();
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_enqueue_digest() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('line-admin-digest', '0 2 * * *', $$select public.admin_line_enqueue_digest()$$);
SELECT cron.schedule('line-admin-sweep', '*/10 * * * *', $$select public.admin_line_wake()$$);
