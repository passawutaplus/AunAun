-- LINE push notifications for Pro / Inhouse users (Messaging API queue + Hero portal events)

-- ---------------------------------------------------------------------------
-- 1) Profile columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'th',
  ADD COLUMN IF NOT EXISTS line_messaging_user_id text,
  ADD COLUMN IF NOT EXISTS line_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS line_notify_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS line_notify_prefs jsonb NOT NULL DEFAULT '{
    "portal_slip": true,
    "portal_tracker_comment": true,
    "portal_brief": true,
    "portal_planner": true,
    "portal_quotation": true,
    "support_ticket": false,
    "billing": false
  }'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_locale_chk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_locale_chk CHECK (locale IN ('th', 'en'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_line_messaging_user_id_uidx
  ON public.profiles (line_messaging_user_id)
  WHERE line_messaging_user_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.line_messaging_user_id IS 'LINE Messaging API userId (U…) after OA link; distinct from line_id display handle';
COMMENT ON COLUMN public.profiles.line_notify_prefs IS 'Per-kind LINE notification toggles; keys portal_* = customer Hero portals';

-- ---------------------------------------------------------------------------
-- 2) Link tokens (LIFF / manual link — Phase 2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.line_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS line_link_tokens_user_idx ON public.line_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS line_link_tokens_expires_idx ON public.line_link_tokens(expires_at);

ALTER TABLE public.line_link_tokens ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.line_link_tokens TO authenticated;
GRANT ALL ON public.line_link_tokens TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Send log + state + pgmq queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.line_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  user_id uuid NOT NULL,
  line_user_id text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'dlq')),
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS line_send_log_created_idx ON public.line_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS line_send_log_user_idx ON public.line_send_log(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS line_send_log_message_id_uidx
  ON public.line_send_log(message_id);

GRANT ALL ON public.line_send_log TO service_role;

ALTER TABLE public.line_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages line send log"
    ON public.line_send_log FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.line_send_state (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until timestamptz,
  batch_size int NOT NULL DEFAULT 10,
  send_delay_ms int NOT NULL DEFAULT 200,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.line_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT ALL ON public.line_send_state TO service_role;

ALTER TABLE public.line_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages line send state"
    ON public.line_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN PERFORM pgmq.create('line_messages'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('line_messages_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4) Tier + message rendering + enqueue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_pro_tier(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT subscription_tier IN ('pro', 'inhouse') FROM public.profiles WHERE user_id = _user_id),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_pro_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_pro_tier(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.render_line_message(
  _kind text,
  _locale text,
  _params jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  loc text := CASE WHEN _locale = 'en' THEN 'en' ELSE 'th' END;
  t text;
BEGIN
  CASE _kind
    WHEN 'portal_slip' THEN
      IF loc = 'en' THEN
        t := 'Customer uploaded a payment slip for "' || COALESCE(_params->>'job_title', 'job') || '". Please review.';
      ELSE
        t := 'ลูกค้าอัปโหลดสลิปงาน "' || COALESCE(_params->>'job_title', '') || '" — กรุณาตรวจสอบ';
      END IF;
    WHEN 'portal_tracker_comment' THEN
      IF loc = 'en' THEN
        t := 'New comment on "' || COALESCE(_params->>'job_title', 'job') || '" (step ' || COALESCE(_params->>'step_index', '?') || ').';
      ELSE
        t := 'ลูกค้าคอมเมนต์ในงาน "' || COALESCE(_params->>'job_title', '') || '" (ขั้นตอน ' || COALESCE(_params->>'step_index', '?') || ')';
      END IF;
    WHEN 'portal_brief' THEN
      IF loc = 'en' THEN
        t := COALESCE(_params->>'client_name', 'Client') || ' confirmed brief "' || COALESCE(_params->>'brief_title', '') || '".';
      ELSE
        t := COALESCE(_params->>'client_name', 'ลูกค้า') || ' ยืนยันบรีฟ "' || COALESCE(_params->>'brief_title', '') || '" แล้ว ✓';
      END IF;
    WHEN 'portal_planner' THEN
      IF COALESCE(_params->>'status', '') = 'approved' THEN
        IF loc = 'en' THEN
          t := 'Client approved content: "' || COALESCE(_params->>'post_title', '') || '".';
        ELSE
          t := 'ลูกค้าอนุมัติคอนเทนต์ "' || COALESCE(_params->>'post_title', '') || '" แล้ว ✓';
        END IF;
      ELSE
        IF loc = 'en' THEN
          t := 'Client requested changes on "' || COALESCE(_params->>'post_title', '') || '".';
        ELSE
          t := 'ลูกค้าขอแก้ไขคอนเทนต์ "' || COALESCE(_params->>'post_title', '') || '"';
        END IF;
      END IF;
    WHEN 'portal_quotation' THEN
      IF loc = 'en' THEN
        t := 'Client updated quotation "' || COALESCE(_params->>'quotation_title', '') || '".';
      ELSE
        t := 'ลูกค้าอัปเดตใบเสนอราคา "' || COALESCE(_params->>'quotation_title', '') || '"';
      END IF;
    WHEN 'support_ticket' THEN
      IF loc = 'en' THEN
        t := COALESCE(_params->>'message', 'Support ticket updated.');
      ELSE
        t := COALESCE(_params->>'message', 'ตั๋วซัพพอร์ตมีอัปเดต');
      END IF;
    WHEN 'billing' THEN
      IF loc = 'en' THEN
        t := COALESCE(_params->>'message', 'Billing update on your So1o account.');
      ELSE
        t := COALESCE(_params->>'message', 'อัปเดตการชำระเงินบัญชี So1o ของคุณ');
      END IF;
    ELSE
      IF loc = 'en' THEN
        t := COALESCE(_params->>'message', 'New notification from So1o.');
      ELSE
        t := COALESCE(_params->>'message', 'แจ้งเตือนใหม่จาก So1o');
      END IF;
  END CASE;

  RETURN left(t, 4800);
END;
$$;

REVOKE ALL ON FUNCTION public.render_line_message(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.render_line_message(text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_line_notification(
  _user_id uuid,
  _kind text,
  _params jsonb DEFAULT '{}'::jsonb,
  _link text DEFAULT '',
  _idempotency_key text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof record;
  msg_id text;
  body text;
  full_text text;
  payload jsonb;
  q_id bigint;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  IF NOT public.is_pro_tier(_user_id) THEN RETURN NULL; END IF;

  SELECT
    line_messaging_user_id,
    line_notify_enabled,
    line_notify_prefs,
    locale
  INTO prof
  FROM public.profiles
  WHERE user_id = _user_id;

  IF prof.line_messaging_user_id IS NULL OR prof.line_notify_enabled IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  IF COALESCE((prof.line_notify_prefs->>_kind)::boolean, false) IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  msg_id := COALESCE(
    NULLIF(btrim(_idempotency_key), ''),
    'line-' || gen_random_uuid()::text
  );

  IF EXISTS (
    SELECT 1 FROM public.line_send_log WHERE message_id = msg_id
  ) THEN
    RETURN NULL;
  END IF;

  body := public.render_line_message(_kind, COALESCE(prof.locale, 'th'), COALESCE(_params, '{}'::jsonb));
  full_text := body;
  IF _link IS NOT NULL AND btrim(_link) <> '' THEN
    full_text := body || E'\n\n' || 'https://solofreelancer.com' || _link;
  END IF;

  payload := jsonb_build_object(
    'message_id', msg_id,
    'user_id', _user_id,
    'line_user_id', prof.line_messaging_user_id,
    'kind', _kind,
    'text', full_text,
    'idempotency_key', msg_id
  );

  INSERT INTO public.line_send_log (
    message_id, user_id, line_user_id, kind, status, metadata
  ) VALUES (
    msg_id, _user_id, prof.line_messaging_user_id, _kind, 'pending',
    jsonb_build_object('link', _link, 'params', COALESCE(_params, '{}'::jsonb))
  )
  ON CONFLICT (message_id) DO NOTHING;

  SELECT public.enqueue_email('line_messages', payload) INTO q_id;
  RETURN q_id;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create('line_messages');
  SELECT public.enqueue_email('line_messages', payload) INTO q_id;
  RETURN q_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_line_notification(uuid, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_line_notification(uuid, text, jsonb, text, text) TO service_role;

-- Disable LINE master switch when subscription drops to free
CREATE OR REPLACE FUNCTION public.sync_user_tier(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tier text := 'free';
  new_seats integer := 1;
  sub record;
BEGIN
  SELECT price_id, status, current_period_end, environment
    INTO sub
    FROM public.subscriptions
   WHERE user_id = _user_id
     AND environment = 'live'
     AND (
       (status IN ('active', 'trialing', 'past_due')
         AND (current_period_end IS NULL OR current_period_end > now()))
       OR (status = 'canceled' AND current_period_end > now())
     )
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    SELECT price_id, status, current_period_end, environment
      INTO sub
      FROM public.subscriptions
     WHERE user_id = _user_id
       AND environment = 'sandbox'
       AND (
         (status IN ('active', 'trialing', 'past_due')
           AND (current_period_end IS NULL OR current_period_end > now()))
         OR (status = 'canceled' AND current_period_end > now())
       )
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  IF FOUND THEN
    IF sub.price_id IN ('inhouse_monthly', 'inhouse_yearly') THEN
      new_tier := 'inhouse';
    ELSE
      new_tier := 'pro';
    END IF;
  END IF;

  UPDATE public.profiles
     SET subscription_tier = new_tier,
         subscription_seats = new_seats,
         line_notify_enabled = CASE
           WHEN new_tier IN ('pro', 'inhouse') THEN line_notify_enabled
           ELSE false
         END
   WHERE user_id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_user_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_tier(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Hero portal event hooks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_slip_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  job_title text;
BEGIN
  SELECT user_id, title INTO owner_id, job_title
  FROM public.job_trackers WHERE id = NEW.job_id;

  IF owner_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, type, message, url)
  VALUES
    (owner_id, NULL, 'ลูกค้า', 'slip_uploaded',
     'ลูกค้าอัปโหลดสลิปงาน "' || COALESCE(job_title, '') || '" — กรุณาตรวจสอบ',
     '/dashboard?tab=finance&jobtracker=' || NEW.job_id::text);

  PERFORM public.enqueue_line_notification(
    owner_id,
    'portal_slip',
    jsonb_build_object('job_title', COALESCE(job_title, '')),
    '/dashboard?tab=finance&jobtracker=' || NEW.job_id::text,
    'line-slip-' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_slip_upload() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_client_step_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  job_title text;
  job_id uuid;
BEGIN
  IF NEW.author_role IS DISTINCT FROM 'client' THEN
    RETURN NEW;
  END IF;

  SELECT j.user_id, j.title, j.id
    INTO owner_id, job_title, job_id
    FROM public.job_trackers j
   WHERE j.id = NEW.job_id;

  IF owner_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications
    (user_id, actor_name, type, message, url)
  VALUES
    (owner_id, 'ลูกค้า', 'tracker_comment',
     'ลูกค้าคอมเมนต์ในงาน "' || COALESCE(job_title, '') || '"',
     '/dashboard?tab=finance&jobtracker=' || job_id::text);

  PERFORM public.enqueue_line_notification(
    owner_id,
    'portal_tracker_comment',
    jsonb_build_object(
      'job_title', COALESCE(job_title, ''),
      'step_index', (NEW.step_index + 1)::text
    ),
    '/dashboard?tab=finance&jobtracker=' || job_id::text,
    'line-tracker-comment-' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_client_step_comment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_on_client_step_comment ON public.job_tracker_step_comments;
CREATE TRIGGER trg_notify_on_client_step_comment
  AFTER INSERT ON public.job_tracker_step_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_client_step_comment();

CREATE OR REPLACE FUNCTION public.confirm_brief_by_token(
  _token UUID,
  _name TEXT,
  _signature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  brief_owner UUID;
  brief_title TEXT;
  brief_id UUID;
BEGIN
  IF _name IS NULL OR length(btrim(_name)) < 1 THEN RETURN FALSE; END IF;

  UPDATE public.design_briefs
  SET status = 'confirmed',
      confirmed_at = now(),
      confirmed_by_name = btrim(_name),
      confirmed_signature = _signature,
      updated_at = now()
  WHERE share_token = _token AND status <> 'confirmed'
  RETURNING user_id, title, id INTO brief_owner, brief_title, brief_id;

  IF brief_owner IS NULL THEN RETURN FALSE; END IF;

  INSERT INTO public.notifications
    (user_id, actor_name, type, message, url)
  VALUES
    (brief_owner, btrim(_name), 'brief_confirmed',
     btrim(_name) || ' ยืนยันบรีฟ "' || COALESCE(brief_title, '') || '" แล้ว ✓',
     '/dashboard?tab=planner&brief=' || brief_id::text);

  PERFORM public.enqueue_line_notification(
    brief_owner,
    'portal_brief',
    jsonb_build_object(
      'client_name', btrim(_name),
      'brief_title', COALESCE(brief_title, '')
    ),
    '/dashboard?tab=planner&brief=' || brief_id::text,
    'line-brief-' || brief_id::text
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_post_approval(
  _share_token uuid,
  _post_id uuid,
  _status text,
  _feedback text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link record;
  post record;
  msg text;
BEGIN
  IF _status NOT IN ('approved', 'changes_requested') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT * INTO link FROM public.planner_share_links WHERE share_token = _share_token;
  IF link IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF link.expires_at IS NOT NULL AND link.expires_at < now() THEN
    RAISE EXCEPTION 'token expired';
  END IF;

  SELECT * INTO post FROM public.planner_posts WHERE id = _post_id;
  IF post IS NULL THEN RAISE EXCEPTION 'post not found'; END IF;
  IF post.user_id <> link.user_id THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF link.client_id IS NOT NULL AND post.client_id <> link.client_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF to_char(post.post_date, 'YYYY-MM') <> link.month THEN
    RAISE EXCEPTION 'out of scope';
  END IF;

  UPDATE public.planner_posts
  SET approval_status = _status,
      client_feedback = COALESCE(_feedback, ''),
      status = CASE WHEN _status = 'approved' THEN 'approved' ELSE status END,
      updated_at = now()
  WHERE id = _post_id;

  IF _status = 'approved' THEN
    msg := 'ลูกค้าอนุมัติคอนเทนต์ "' || COALESCE(post.title, '') || '" แล้ว ✓';
  ELSE
    msg := 'ลูกค้าขอแก้ไขคอนเทนต์ "' || COALESCE(post.title, '') || '"';
  END IF;

  INSERT INTO public.notifications (user_id, type, message, url)
  VALUES (
    link.user_id,
    'planner_approval',
    msg,
    '/dashboard?tab=planner'
  );

  PERFORM public.enqueue_line_notification(
    link.user_id,
    'portal_planner',
    jsonb_build_object(
      'post_title', COALESCE(post.title, ''),
      'status', _status
    ),
    '/dashboard?tab=planner',
    'line-planner-' || _post_id::text || '-' || _status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _msg TEXT;
  _url TEXT := '/dashboard';
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.source = 'feedback_button' THEN
    IF NEW.status = 'in_progress' THEN
      _msg := 'เราได้รับฟีดแบ็กของคุณแล้ว กำลังดำเนินการแก้ไข';
    ELSIF NEW.status = 'resolved' THEN
      _msg := 'เราได้แก้ไขตามฟีดแบ็กของคุณแล้ว ขอบคุณที่ช่วยพัฒนา So1o';
      IF NEW.resolution_note IS NOT NULL AND btrim(NEW.resolution_note) <> '' THEN
        _msg := _msg || ' — ' || NEW.resolution_note;
      END IF;
    ELSIF NEW.status = 'closed' THEN
      _msg := 'ตั๋วฟีดแบ็กปิดงานแล้ว ขอบคุณที่ส่งความคิดเห็นมา';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    IF NEW.status = 'in_progress' THEN
      _msg := 'ตั๋ว ' || NEW.ticket_number || ' กำลังได้รับการแก้ไข';
    ELSIF NEW.status = 'resolved' THEN
      _msg := 'ตั๋ว ' || NEW.ticket_number || ' แก้ไขแล้ว — กำลังปล่อยอัปเดต';
      IF NEW.resolution_note IS NOT NULL AND btrim(NEW.resolution_note) <> '' THEN
        _msg := _msg || ' — ' || NEW.resolution_note;
      END IF;
    ELSIF NEW.status = 'closed' THEN
      _msg := 'ตั๋ว ' || NEW.ticket_number || ' ปิดงานเรียบร้อยแล้ว';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, url)
  VALUES (NEW.user_id, 'ticket', _msg, _url);

  PERFORM public.enqueue_line_notification(
    NEW.user_id,
    'support_ticket',
    jsonb_build_object('message', _msg),
    _url,
    'line-ticket-' || NEW.id::text || '-' || NEW.status
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_ticket_status_change() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- POST-MIGRATION: store LINE_CHANNEL_ACCESS_TOKEN in Supabase
-- secrets; schedule pg_cron job 'process-line-queue' (every 60s)
-- calling edge function line-queue-process with service_role key
-- (mirror email queue setup).
-- ============================================================
