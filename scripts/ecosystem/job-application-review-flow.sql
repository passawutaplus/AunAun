-- Job applications: company reviews first. Chat opens only after accept.
-- Applicant cannot start chat. Pending expires after 14 days.

ALTER TABLE anthem.job_applications
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS reject_note text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_by uuid;

ALTER TABLE anthem.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_reject_reason_chk;
ALTER TABLE anthem.job_applications
  ADD CONSTRAINT job_applications_reject_reason_chk
  CHECK (
    reject_reason IS NULL
    OR reject_reason IN (
      'filled',
      'not_a_fit',
      'cancelled',
      'experience',
      'rate',
      'expired',
      'other'
    )
  );

CREATE INDEX IF NOT EXISTS job_applications_pending_created_idx
  ON anthem.job_applications (created_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.can_review_job_post(p_job_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM anthem.job_posts j
    WHERE j.id = p_job_id
      AND p_user_id IS NOT NULL
      AND (
        j.posted_by = p_user_id
        OR public.has_role(p_user_id, 'admin'::public.app_role)
        OR (
          j.studio_id IS NOT NULL
          AND public.is_studio_admin(j.studio_id, p_user_id)
        )
        OR (
          j.hiring_org_id IS NOT NULL
          AND public.is_hiring_org_member(j.hiring_org_id, p_user_id)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_review_job_post(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_review_job_post(uuid, uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Applicant or studio admin views applications" ON anthem.job_applications;
CREATE POLICY "Applicant or studio admin views applications"
  ON anthem.job_applications FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid()
    OR public.can_review_job_post(job_id, auth.uid())
  );

DROP POLICY IF EXISTS "Studio admins update application status" ON anthem.job_applications;
CREATE POLICY "Studio admins update application status"
  ON anthem.job_applications FOR UPDATE TO authenticated
  USING (public.can_review_job_post(job_id, auth.uid()))
  WITH CHECK (public.can_review_job_post(job_id, auth.uid()));

DROP POLICY IF EXISTS job_applications_poster_update ON anthem.job_applications;
CREATE POLICY job_applications_poster_update ON anthem.job_applications
  FOR UPDATE TO authenticated
  USING (public.can_review_job_post(job_id, auth.uid()))
  WITH CHECK (public.can_review_job_post(job_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.job_application_reason_copy(p_reason text, p_note text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_reason
    WHEN 'filled' THEN 'ตำแหน่งนี้รับคนแล้ว'
    WHEN 'not_a_fit' THEN 'โปรไฟล์ยังไม่ตรงกับที่ตำแหน่งนี้ต้องการ'
    WHEN 'cancelled' THEN 'ประกาศนี้ถูกยกเลิกแล้ว'
    WHEN 'experience' THEN 'ประสบการณ์ยังไม่ตรงกับงานนี้'
    WHEN 'rate' THEN 'เงื่อนไขเรทยังไม่ตรงกัน'
    WHEN 'expired' THEN 'ไม่ได้รับการตอบกลับภายใน 2 สัปดาห์'
    WHEN 'other' THEN NULLIF(btrim(COALESCE(p_note, '')), '')
    ELSE NULLIF(btrim(COALESCE(p_note, '')), '')
  END;
$$;

CREATE OR REPLACE FUNCTION public.notify_job_application_event(
  p_to_user_id uuid,
  p_title text,
  p_body text,
  p_link text,
  p_application_id uuid,
  p_job_id uuid,
  p_kind text DEFAULT 'hire_application'
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
    COALESCE(NULLIF(p_kind, ''), 'hire_application'),
    COALESCE(p_title, 'ใบสมัครงาน'),
    COALESCE(p_body, ''),
    COALESCE(NULLIF(p_link, ''), '/hiring'),
    jsonb_build_object(
      'application_id', p_application_id,
      'job_id', p_job_id
    ),
    false,
    false
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_job_application_event(uuid, text, text, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_job_application_event(uuid, text, text, text, uuid, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.open_job_application_chat(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  app_applicant uuid;
  app_job uuid;
  app_conv uuid;
  app_status public.job_application_status;
  job_owner uuid;
  job_title text;
  conv_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authed';
  END IF;

  SELECT applicant_id, job_id, conversation_id, status
    INTO app_applicant, app_job, app_conv, app_status
  FROM anthem.job_applications
  WHERE id = p_application_id;

  IF app_applicant IS NULL THEN
    RAISE EXCEPTION 'application not found';
  END IF;

  SELECT posted_by, title INTO job_owner, job_title
  FROM anthem.job_posts
  WHERE id = app_job;

  IF job_owner IS NULL THEN
    RAISE EXCEPTION 'job not found';
  END IF;

  IF NOT public.can_review_job_post(app_job, uid)
     AND uid <> app_applicant
     AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF app_conv IS NOT NULL THEN
    RETURN app_conv;
  END IF;

  IF app_status NOT IN ('accepted', 'contacted', 'hired') THEN
    RAISE EXCEPTION 'chat locked until company accepts';
  END IF;

  IF uid = app_applicant AND NOT public.can_review_job_post(app_job, uid) THEN
    RAISE EXCEPTION 'company starts the chat';
  END IF;

  SELECT c.id INTO conv_id
  FROM shared.conversations c
  WHERE c.kind = 'hire'
    AND c.client_id = job_owner
    AND c.freelancer_id = app_applicant
    AND c.request_id IS NULL
    AND c.project_title = job_title
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO shared.conversations (
      kind, conversation_type, request_id, client_id, freelancer_id, project_title, created_by
    ) VALUES (
      'hire', 'direct', NULL, job_owner, app_applicant, job_title, uid
    )
    RETURNING id INTO conv_id;

    INSERT INTO shared.messages (conversation_id, sender_id, content, message_type)
    VALUES (
      conv_id,
      job_owner,
      'สนใจโปรไฟล์ที่สมัครตำแหน่ง ' || COALESCE(job_title, 'นี้') || ' — คุยรายละเอียดต่อได้ที่นี่',
      'text'
    );
  END IF;

  UPDATE anthem.job_applications
  SET conversation_id = conv_id,
      contacted_at = COALESCE(contacted_at, now())
  WHERE id = p_application_id
    AND conversation_id IS NULL;

  RETURN conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.open_job_application_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_job_application_chat(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decide_job_application(
  p_application_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  app anthem.job_applications%ROWTYPE;
  job_title text;
  job_owner uuid;
  company text;
  conv_id uuid;
  reason_text text;
  note_text text := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authed';
  END IF;

  SELECT * INTO app FROM anthem.job_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'application not found';
  END IF;

  IF NOT public.can_review_job_post(app.job_id, uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT posted_by, title INTO job_owner, job_title
  FROM anthem.job_posts
  WHERE id = app.job_id;

  SELECT COALESCE(o.display_name, p.display_name, 'บริษัท')
    INTO company
  FROM anthem.job_posts j
  LEFT JOIN anthem.hiring_organizations o ON o.id = j.hiring_org_id
  LEFT JOIN public.profiles p ON p.user_id = j.posted_by
  WHERE j.id = app.job_id;

  IF p_decision = 'accept' THEN
    IF app.status = 'rejected' THEN
      RAISE EXCEPTION 'already rejected';
    END IF;

    UPDATE anthem.job_applications
    SET
      status = 'accepted',
      reject_reason = NULL,
      reject_note = NULL,
      decided_at = COALESCE(decided_at, now()),
      decided_by = COALESCE(decided_by, uid)
    WHERE id = app.id
      AND status IS DISTINCT FROM 'accepted';

    conv_id := public.open_job_application_chat(app.id);

    PERFORM public.notify_job_application_event(
      app.applicant_id,
      'บริษัทสนใจโปรไฟล์คุณ',
      COALESCE(company, 'บริษัท') || ' ตอบรับใบสมัคร ' || COALESCE(job_title, 'ตำแหน่งนี้'),
      '/chat/' || conv_id::text,
      app.id,
      app.job_id,
      'hire_application'
    );

    RETURN conv_id;
  END IF;

  IF p_decision = 'reject' THEN
    IF app.status IN ('accepted', 'contacted', 'hired') THEN
      RAISE EXCEPTION 'already accepted';
    END IF;
    IF p_reason IS NULL OR p_reason NOT IN ('filled', 'not_a_fit', 'cancelled', 'experience', 'rate', 'other') THEN
      RAISE EXCEPTION 'reject reason required';
    END IF;
    IF p_reason = 'other' AND note_text IS NULL THEN
      RAISE EXCEPTION 'reject note required';
    END IF;

    reason_text := public.job_application_reason_copy(p_reason, note_text);

    UPDATE anthem.job_applications
    SET
      status = 'rejected',
      reject_reason = p_reason,
      reject_note = note_text,
      decided_at = now(),
      decided_by = uid
    WHERE id = app.id;

    PERFORM public.notify_job_application_event(
      app.applicant_id,
      'ใบสมัครไม่ผ่านการพิจารณา',
      COALESCE(job_title, 'ตำแหน่งนี้') || ' — ' || COALESCE(reason_text, 'บริษัทปฏิเสธใบสมัครแล้ว'),
      '/hiring/' || app.job_id::text,
      app.id,
      app.job_id,
      'hire_application'
    );

    RETURN NULL;
  END IF;

  RAISE EXCEPTION 'invalid decision';
END;
$$;

REVOKE ALL ON FUNCTION public.decide_job_application(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_job_application(uuid, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reject_pending_job_applications_for_job(
  p_job_id uuid,
  p_reason text DEFAULT 'cancelled'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  n int := 0;
  r record;
  job_title text;
  reason_text text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authed';
  END IF;
  IF NOT public.can_review_job_post(p_job_id, uid)
     AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('filled', 'cancelled') THEN
    RAISE EXCEPTION 'invalid reason';
  END IF;

  SELECT title INTO job_title FROM anthem.job_posts WHERE id = p_job_id;
  reason_text := public.job_application_reason_copy(p_reason, NULL);

  FOR r IN
    SELECT id, applicant_id
    FROM anthem.job_applications
    WHERE job_id = p_job_id
      AND status IN ('pending', 'shortlisted')
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE anthem.job_applications
    SET
      status = 'rejected',
      reject_reason = p_reason,
      reject_note = NULL,
      decided_at = now(),
      decided_by = uid
    WHERE id = r.id;

    PERFORM public.notify_job_application_event(
      r.applicant_id,
      'ใบสมัครไม่ผ่านการพิจารณา',
      COALESCE(job_title, 'ตำแหน่งนี้') || ' — ' || COALESCE(reason_text, 'ประกาศนี้ถูกยกเลิกแล้ว'),
      '/hiring/' || p_job_id::text,
      r.id,
      p_job_id,
      'hire_application'
    );
    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_pending_job_applications_for_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_pending_job_applications_for_job(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.expire_pending_job_applications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  n int := 0;
  r record;
  job_title text;
BEGIN
  FOR r IN
    SELECT a.id, a.applicant_id, a.job_id
    FROM anthem.job_applications a
    WHERE a.status = 'pending'
      AND a.created_at < now() - interval '14 days'
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT title INTO job_title FROM anthem.job_posts WHERE id = r.job_id;

    UPDATE anthem.job_applications
    SET
      status = 'rejected',
      reject_reason = 'expired',
      reject_note = NULL,
      decided_at = now()
    WHERE id = r.id
      AND status = 'pending';

    IF FOUND THEN
      PERFORM public.notify_job_application_event(
        r.applicant_id,
        'ใบสมัครหมดเวลาพิจารณา',
        COALESCE(job_title, 'ตำแหน่งนี้') || ' — ไม่ได้รับการตอบกลับภายใน 2 สัปดาห์',
        '/hiring/' || r.job_id::text,
        r.id,
        r.job_id,
        'hire_application'
      );
      n := n + 1;
    END IF;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_job_applications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_pending_job_applications() TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('expire-pending-job-applications');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'expire-pending-job-applications',
      '15 * * * *',
      $cron$SELECT public.expire_pending_job_applications();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
