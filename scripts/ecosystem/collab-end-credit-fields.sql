-- Collab end: credit / portfolio / style claims on early termination.
-- Safe to re-run.

ALTER TABLE shared.collab_end_requests
  ADD COLUMN IF NOT EXISTS credit_mode text NOT NULL DEFAULT 'no_credit'
    CHECK (credit_mode IN ('no_credit', 'credit_requested'));

ALTER TABLE shared.collab_end_requests
  ADD COLUMN IF NOT EXISTS credit_request_text text;

ALTER TABLE shared.collab_end_requests
  ADD COLUMN IF NOT EXISTS portfolio_requested boolean NOT NULL DEFAULT false;

ALTER TABLE shared.collab_end_requests
  ADD COLUMN IF NOT EXISTS style_requested boolean NOT NULL DEFAULT false;

ALTER TABLE shared.collab_end_requests
  ADD COLUMN IF NOT EXISTS plan_rights_snapshot text;

ALTER TABLE shared.collab_end_requests
  ADD COLUMN IF NOT EXISTS progress_count_initiator integer;

ALTER TABLE shared.collab_end_requests
  ADD COLUMN IF NOT EXISTS response_credit_outcome text
    CHECK (
      response_credit_outcome IS NULL
      OR response_credit_outcome IN ('grant_full', 'grant_partial', 'deny_credit', 'per_plan')
    );

ALTER TABLE shared.collab_end_requests
  ADD COLUMN IF NOT EXISTS response_credit_note text;

-- Replace finalize to record default credit denial on auto-approve when credit was requested
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
  v_credit_outcome text;
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
    v_credit_outcome := CASE
      WHEN coalesce(r.credit_mode, 'no_credit') = 'credit_requested' THEN 'deny_credit'
      ELSE NULL
    END;

    UPDATE shared.collab_end_requests
    SET
      status = 'auto_approved',
      responded_at = now(),
      response_credit_outcome = v_credit_outcome,
      response_credit_note = CASE
        WHEN v_credit_outcome = 'deny_credit'
          THEN 'ไม่ตอบภายในกำหนด — ไม่ให้เครดิตตามที่ขอ (ยุติอัตโนมัติ)'
        ELSE NULL
      END,
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
      jsonb_build_object(
        'status', 'auto_approved',
        'handoff_terms', r.handoff_terms,
        'credit_mode', coalesce(r.credit_mode, 'no_credit'),
        'response_credit_outcome', v_credit_outcome
      ),
      'ยุติคอลแลปอัตโนมัติ — ไม่ตอบภายใน 48 ชม.'
    );

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_expired_collab_end_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_expired_collab_end_requests() TO authenticated, service_role;
