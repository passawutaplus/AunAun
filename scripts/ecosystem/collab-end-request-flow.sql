-- Collab end requests (หลังตอบรับ): ขอยุติคอลแลป → อีกฝ่ายยืนยัน → status cancelled (ไม่ใช่ completed)
-- 24h แก้/ถอน · 48h ไม่ตอบ → auto_approved
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS shared.collab_end_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_request_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  initiator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'withdrawn',
      'approved',
      'rejected',
      'auto_approved'
    )),
  tier text NOT NULL DEFAULT 'early'
    CHECK (tier IN ('early', 'active')),
  handoff_terms text NOT NULL DEFAULT 'joint_archive'
    CHECK (handoff_terms IN (
      'return_all',
      'keep_own',
      'split_publish',
      'joint_archive',
      'discuss'
    )),
  reason_id text,
  reason_note text,
  plan_step text,
  response_reason_id text,
  response_note text,
  responder_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  first_submitted_at timestamptz NOT NULL DEFAULT now(),
  last_edited_at timestamptz,
  respond_deadline_at timestamptz NOT NULL,
  edit_until_at timestamptz NOT NULL,
  reminder_near_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS collab_end_requests_one_pending_idx
  ON shared.collab_end_requests (collab_request_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS collab_end_requests_deadline_idx
  ON shared.collab_end_requests (status, respond_deadline_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS collab_end_requests_collab_idx
  ON shared.collab_end_requests (collab_request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shared.collab_end_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  end_request_id uuid NOT NULL REFERENCES shared.collab_end_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'submitted',
    'edited',
    'withdrawn',
    'accepted',
    'rejected',
    'auto_approved'
  )),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  diff_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collab_end_request_events_req_idx
  ON shared.collab_end_request_events (end_request_id, created_at ASC);

GRANT SELECT, INSERT, UPDATE ON shared.collab_end_requests TO authenticated;
GRANT SELECT, INSERT ON shared.collab_end_request_events TO authenticated;
GRANT ALL ON shared.collab_end_requests TO service_role;
GRANT ALL ON shared.collab_end_request_events TO service_role;

ALTER TABLE shared.collab_end_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.collab_end_request_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION shared.collab_end_is_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO shared, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM shared.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM shared.conversations c
    WHERE c.id = p_conversation_id
      AND (c.client_id = auth.uid() OR c.freelancer_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION shared.collab_end_is_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION shared.collab_end_is_participant(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "collab end participants read" ON shared.collab_end_requests;
CREATE POLICY "collab end participants read"
  ON shared.collab_end_requests FOR SELECT TO authenticated
  USING (shared.collab_end_is_participant(conversation_id));

DROP POLICY IF EXISTS "collab end participants insert" ON shared.collab_end_requests;
CREATE POLICY "collab end participants insert"
  ON shared.collab_end_requests FOR INSERT TO authenticated
  WITH CHECK (
    shared.collab_end_is_participant(conversation_id)
    AND auth.uid() = initiator_id
  );

DROP POLICY IF EXISTS "collab end participants update" ON shared.collab_end_requests;
CREATE POLICY "collab end participants update"
  ON shared.collab_end_requests FOR UPDATE TO authenticated
  USING (shared.collab_end_is_participant(conversation_id))
  WITH CHECK (shared.collab_end_is_participant(conversation_id));

DROP POLICY IF EXISTS "collab end events participants read" ON shared.collab_end_request_events;
CREATE POLICY "collab end events participants read"
  ON shared.collab_end_request_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared.collab_end_requests r
      WHERE r.id = end_request_id
        AND shared.collab_end_is_participant(r.conversation_id)
    )
  );

DROP POLICY IF EXISTS "collab end events participants insert" ON shared.collab_end_request_events;
CREATE POLICY "collab end events participants insert"
  ON shared.collab_end_request_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared.collab_end_requests r
      WHERE r.id = end_request_id
        AND shared.collab_end_is_participant(r.conversation_id)
    )
  );

CREATE OR REPLACE FUNCTION public.notify_collab_end_event(
  p_to_user_id uuid,
  p_title text,
  p_body text,
  p_link text,
  p_end_id uuid,
  p_collab_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO shared, public
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
    'collab_end',
    coalesce(p_title, 'ขอยุติคอลแลป'),
    coalesce(p_body, ''),
    coalesce(nullif(p_link, ''), '/chat'),
    jsonb_build_object(
      'end_request_id', p_end_id,
      'collab_request_id', p_collab_id
    ),
    false,
    false
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_collab_end_event(uuid, text, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_collab_end_event(uuid, text, text, text, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.finalize_expired_collab_end_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO shared, public, anthem
AS $$
DECLARE
  r record;
  n int := 0;
  other_id uuid;
  near_cutoff timestamptz := now() + interval '4 hours';
BEGIN
  FOR r IN
    SELECT *
    FROM shared.collab_end_requests
    WHERE status = 'pending'
      AND reminder_near_sent_at IS NULL
      AND respond_deadline_at <= near_cutoff
      AND respond_deadline_at > now()
  LOOP
    SELECT CASE
      WHEN c.client_id = r.initiator_id THEN c.freelancer_id
      ELSE c.client_id
    END INTO other_id
    FROM shared.conversations c
    WHERE c.id = r.conversation_id;

    IF other_id IS NOT NULL THEN
      PERFORM public.notify_collab_end_event(
        other_id,
        'ใกล้หมดเวลาพิจารณายุติคอลแลป',
        'เหลือไม่ถึง 4 ชั่วโมงในการตอบคำขอยุติคอลแลป',
        '/chat/' || r.conversation_id::text,
        r.id,
        r.collab_request_id
      );
    END IF;

    UPDATE shared.collab_end_requests
    SET reminder_near_sent_at = now(), updated_at = now()
    WHERE id = r.id;
  END LOOP;

  FOR r IN
    SELECT *
    FROM shared.collab_end_requests
    WHERE status = 'pending'
      AND respond_deadline_at <= now()
  LOOP
    UPDATE shared.collab_end_requests
    SET
      status = 'auto_approved',
      responded_at = now(),
      updated_at = now()
    WHERE id = r.id;

    UPDATE public.collab_requests
    SET
      status = 'cancelled',
      cancel_reason = r.reason_id,
      cancel_note = coalesce(r.reason_note, 'ยุติคอลแลปอัตโนมัติ — ไม่ตอบภายใน 48 ชม.'),
      updated_at = now()
    WHERE id = r.collab_request_id
      AND status NOT IN ('cancelled', 'completed', 'archived', 'declined', 'passed');

    INSERT INTO shared.collab_end_request_events (
      end_request_id, actor_id, event_type, snapshot, diff_summary
    ) VALUES (
      r.id,
      NULL,
      'auto_approved',
      jsonb_build_object('status', 'auto_approved', 'handoff_terms', r.handoff_terms),
      'ยุติคอลแลปอัตโนมัติ — ไม่ตอบภายใน 48 ชม.'
    );

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_expired_collab_end_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_expired_collab_end_requests() TO authenticated, service_role;
