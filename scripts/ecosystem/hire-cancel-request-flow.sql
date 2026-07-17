-- Hire cancel requests (หลังข้อเสนอยืนยัน): ขอ → พิจารณา → อนุมัติ/ปฏิเสธ/เงื่อนไขเงิน
-- 24h แรกแก้/ถอนได้ (ไม่รีเซ็ต 48h) · 48h จากส่งครั้งแรก → auto ตามเงื่อนไขล่าสุด
-- Safe to re-run.

ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS offer_accepted_at timestamptz;

COMMENT ON COLUMN anthem.hiring_requests.offer_accepted_at IS
  'Set when client accepts an in-chat quotation/offer; gates formal cancel-request flow';

CREATE TABLE IF NOT EXISTS anthem.hire_cancel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_request_id uuid NOT NULL REFERENCES anthem.hiring_requests(id) ON DELETE CASCADE,
  conversation_id uuid,
  initiated_by text NOT NULL CHECK (initiated_by IN ('client', 'freelancer')),
  initiator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'withdrawn',
      'approved',
      'rejected',
      'auto_approved',
      'countered'
    )),
  -- Money terms proposed by initiator (or latest edit):
  -- full_refund | half_refund | no_refund | none (client cancel with no money ask yet)
  -- compensation_50 = freelancer asking to keep 50% when responding to client cancel
  money_terms text NOT NULL DEFAULT 'none'
    CHECK (money_terms IN (
      'none',
      'full_refund',
      'half_refund',
      'no_refund',
      'compensation_50'
    )),
  reason_id text,
  reason_note text,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  -- Counter / respond fields
  response_money_terms text
    CHECK (
      response_money_terms IS NULL
      OR response_money_terms IN (
        'none',
        'full_refund',
        'half_refund',
        'no_refund',
        'compensation_50'
      )
    ),
  response_reason_id text,
  response_note text,
  responder_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  first_submitted_at timestamptz NOT NULL DEFAULT now(),
  last_edited_at timestamptz,
  respond_deadline_at timestamptz NOT NULL,
  edit_until_at timestamptz NOT NULL,
  reminder_24h_sent_at timestamptz,
  reminder_near_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hire_cancel_requests_one_pending_idx
  ON anthem.hire_cancel_requests (hiring_request_id)
  WHERE status IN ('pending', 'countered');

CREATE INDEX IF NOT EXISTS hire_cancel_requests_deadline_idx
  ON anthem.hire_cancel_requests (status, respond_deadline_at)
  WHERE status IN ('pending', 'countered');

CREATE INDEX IF NOT EXISTS hire_cancel_requests_hire_idx
  ON anthem.hire_cancel_requests (hiring_request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS anthem.hire_cancel_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancel_request_id uuid NOT NULL REFERENCES anthem.hire_cancel_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'submitted',
    'edited',
    'withdrawn',
    'accepted',
    'rejected',
    'countered',
    'auto_approved',
    'compensation_requested'
  )),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  diff_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hire_cancel_request_events_req_idx
  ON anthem.hire_cancel_request_events (cancel_request_id, created_at ASC);

GRANT SELECT, INSERT, UPDATE ON anthem.hire_cancel_requests TO authenticated;
GRANT SELECT, INSERT ON anthem.hire_cancel_request_events TO authenticated;
GRANT ALL ON anthem.hire_cancel_requests TO service_role;
GRANT ALL ON anthem.hire_cancel_request_events TO service_role;

ALTER TABLE anthem.hire_cancel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.hire_cancel_request_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION anthem.hire_cancel_is_participant(p_hire_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO anthem, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM anthem.hiring_requests h
    WHERE h.id = p_hire_id
      AND (
        auth.uid() = h.client_id
        OR auth.uid() = h.freelancer_id
        OR public.has_role(auth.uid(), 'admin')
      )
  );
$$;

REVOKE ALL ON FUNCTION anthem.hire_cancel_is_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.hire_cancel_is_participant(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "hire cancel participants read" ON anthem.hire_cancel_requests;
CREATE POLICY "hire cancel participants read"
  ON anthem.hire_cancel_requests FOR SELECT TO authenticated
  USING (anthem.hire_cancel_is_participant(hiring_request_id));

DROP POLICY IF EXISTS "hire cancel participants insert" ON anthem.hire_cancel_requests;
CREATE POLICY "hire cancel participants insert"
  ON anthem.hire_cancel_requests FOR INSERT TO authenticated
  WITH CHECK (
    anthem.hire_cancel_is_participant(hiring_request_id)
    AND auth.uid() = initiator_id
  );

DROP POLICY IF EXISTS "hire cancel participants update" ON anthem.hire_cancel_requests;
CREATE POLICY "hire cancel participants update"
  ON anthem.hire_cancel_requests FOR UPDATE TO authenticated
  USING (anthem.hire_cancel_is_participant(hiring_request_id))
  WITH CHECK (anthem.hire_cancel_is_participant(hiring_request_id));

DROP POLICY IF EXISTS "hire cancel events participants read" ON anthem.hire_cancel_request_events;
CREATE POLICY "hire cancel events participants read"
  ON anthem.hire_cancel_request_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM anthem.hire_cancel_requests r
      WHERE r.id = cancel_request_id
        AND anthem.hire_cancel_is_participant(r.hiring_request_id)
    )
  );

DROP POLICY IF EXISTS "hire cancel events participants insert" ON anthem.hire_cancel_request_events;
CREATE POLICY "hire cancel events participants insert"
  ON anthem.hire_cancel_request_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM anthem.hire_cancel_requests r
      WHERE r.id = cancel_request_id
        AND anthem.hire_cancel_is_participant(r.hiring_request_id)
    )
  );

-- Client uses anthem schema via supabase .from(); no public view required.

-- Notify helper
CREATE OR REPLACE FUNCTION public.notify_hire_cancel_event(
  p_to_user_id uuid,
  p_title text,
  p_body text,
  p_link text,
  p_cancel_id uuid,
  p_hire_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO shared, anthem, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_to_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO shared.notifications (
    user_id, app, kind, title, body, link, metadata, is_read, is_dismissed
  ) VALUES (
    p_to_user_id,
    'anthem',
    'hire_cancel',
    coalesce(p_title, 'คำขอยกเลิกงาน'),
    coalesce(p_body, ''),
    coalesce(nullif(p_link, ''), '/chat'),
    jsonb_build_object(
      'cancel_request_id', p_cancel_id,
      'hiring_request_id', p_hire_id
    ),
    false,
    false
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_hire_cancel_event(uuid, text, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_hire_cancel_event(uuid, text, text, text, uuid, uuid) TO authenticated, service_role;

-- Auto-approve expired pending/countered cancel requests; send reminders
CREATE OR REPLACE FUNCTION public.finalize_expired_hire_cancel_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO shared, anthem, public
AS $$
DECLARE
  r record;
  n int := 0;
  other_id uuid;
  hire anthem.hiring_requests%ROWTYPE;
  near_cutoff timestamptz := now() + interval '4 hours';
BEGIN
  -- Near-end reminders (~4h left), once
  FOR r IN
    SELECT *
    FROM anthem.hire_cancel_requests
    WHERE status IN ('pending', 'countered')
      AND reminder_near_sent_at IS NULL
      AND respond_deadline_at <= near_cutoff
      AND respond_deadline_at > now()
  LOOP
    SELECT * INTO hire FROM anthem.hiring_requests WHERE id = r.hiring_request_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    other_id := CASE
      WHEN r.initiated_by = 'client' THEN hire.freelancer_id
      ELSE hire.client_id
    END;
    PERFORM public.notify_hire_cancel_event(
      other_id,
      'ใกล้หมดเวลาพิจารณายกเลิกงาน',
      'เหลือไม่ถึง 4 ชั่วโมงในการตอบคำขอยกเลิกงาน',
      CASE WHEN r.conversation_id IS NOT NULL THEN '/chat/' || r.conversation_id::text ELSE '/chat' END,
      r.id,
      r.hiring_request_id
    );
    UPDATE anthem.hire_cancel_requests
    SET reminder_near_sent_at = now(), updated_at = now()
    WHERE id = r.id;
  END LOOP;

  -- 24h-from-submit reminder to responder (halfway-ish toward 48h), once
  FOR r IN
    SELECT *
    FROM anthem.hire_cancel_requests
    WHERE status IN ('pending', 'countered')
      AND reminder_24h_sent_at IS NULL
      AND first_submitted_at <= now() - interval '24 hours'
      AND respond_deadline_at > now()
  LOOP
    SELECT * INTO hire FROM anthem.hiring_requests WHERE id = r.hiring_request_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    other_id := CASE
      WHEN r.initiated_by = 'client' THEN hire.freelancer_id
      ELSE hire.client_id
    END;
    PERFORM public.notify_hire_cancel_event(
      other_id,
      'ยังไม่ได้ตอบคำขอยกเลิกงาน',
      'ผ่านมา 24 ชั่วโมงแล้ว — อีกฝ่ายรอการตอบ (หมดเวลาที่ 48 ชั่วโมง)',
      CASE WHEN r.conversation_id IS NOT NULL THEN '/chat/' || r.conversation_id::text ELSE '/chat' END,
      r.id,
      r.hiring_request_id
    );
    UPDATE anthem.hire_cancel_requests
    SET reminder_24h_sent_at = now(), updated_at = now()
    WHERE id = r.id;
  END LOOP;

  -- Auto approve
  FOR r IN
    SELECT *
    FROM anthem.hire_cancel_requests
    WHERE status IN ('pending', 'countered')
      AND respond_deadline_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO hire FROM anthem.hiring_requests WHERE id = r.hiring_request_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    UPDATE anthem.hire_cancel_requests
    SET
      status = 'auto_approved',
      responded_at = now(),
      updated_at = now()
    WHERE id = r.id;

    INSERT INTO anthem.hire_cancel_request_events (
      cancel_request_id, actor_id, event_type, snapshot, diff_summary
    ) VALUES (
      r.id,
      NULL,
      'auto_approved',
      jsonb_build_object(
        'money_terms', r.money_terms,
        'response_money_terms', r.response_money_terms,
        'status', 'auto_approved'
      ),
      'ครบ 48 ชั่วโมงโดยไม่มีการตอบ — ระบบอนุมัติการยกเลิกตามเงื่อนไขล่าสุด'
    );

    UPDATE anthem.hiring_requests
    SET
      status = 'ยกเลิก',
      cancel_reason = coalesce(r.reason_id, 'auto_cancel'),
      cancel_note = coalesce(r.reason_note, 'อนุมัติอัตโนมัติหลังครบ 48 ชั่วโมง'),
      updated_at = now()
    WHERE id = r.hiring_request_id
      AND status IS DISTINCT FROM 'ยกเลิก'
      AND status IS DISTINCT FROM 'ปิดแล้ว';

    PERFORM public.notify_hire_cancel_event(
      hire.client_id,
      'ยกเลิกงานอัตโนมัติ',
      'ครบ 48 ชั่วโมงโดยไม่มีการตอบ — ระบบอนุมัติการยกเลิกแล้ว',
      CASE WHEN r.conversation_id IS NOT NULL THEN '/chat/' || r.conversation_id::text ELSE '/chat' END,
      r.id,
      r.hiring_request_id
    );
    PERFORM public.notify_hire_cancel_event(
      hire.freelancer_id,
      'ยกเลิกงานอัตโนมัติ',
      'ครบ 48 ชั่วโมงโดยไม่มีการตอบ — ระบบอนุมัติการยกเลิกแล้ว',
      CASE WHEN r.conversation_id IS NOT NULL THEN '/chat/' || r.conversation_id::text ELSE '/chat' END,
      r.id,
      r.hiring_request_id
    );

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_expired_hire_cancel_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_expired_hire_cancel_requests() TO authenticated, service_role;

-- Optional pg_cron (ignore if extension missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('finalize-hire-cancel-requests');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'finalize-hire-cancel-requests',
      '*/15 * * * *',
      $cron$SELECT public.finalize_expired_hire_cancel_requests();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
