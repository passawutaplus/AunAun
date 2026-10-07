
-- 1. Extend app_feedback with status/admin fields and optional project link
ALTER TABLE public.app_feedback
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS admin_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_app_feedback_created ON public.app_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_feedback_status ON public.app_feedback(status);
CREATE INDEX IF NOT EXISTS idx_app_feedback_feature ON public.app_feedback(feature);
CREATE INDEX IF NOT EXISTS idx_app_feedback_project ON public.app_feedback(project_id);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS trg_app_feedback_updated ON public.app_feedback;
CREATE TRIGGER trg_app_feedback_updated BEFORE UPDATE ON public.app_feedback
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Allow admin update
DROP POLICY IF EXISTS "Admins update feedback" ON public.app_feedback;
CREATE POLICY "Admins update feedback" ON public.app_feedback
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Extend user_reports with rich evidence files
ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS evidence_files jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Storage bucket for evidence (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-evidence', 'report-evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own evidence" ON storage.objects;
CREATE POLICY "Users upload own evidence" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners or admins read evidence" ON storage.objects;
CREATE POLICY "Owners or admins read evidence" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'report-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Owners or admins delete evidence" ON storage.objects;
CREATE POLICY "Owners or admins delete evidence" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'report-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 4. RPC: create_report with rate limit
CREATE OR REPLACE FUNCTION public.create_report(
  _target_type text,
  _target_id uuid,
  _target_owner_id uuid,
  _reason text,
  _details text,
  _evidence_urls text[],
  _evidence_files jsonb
) RETURNS public.user_reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  recent_count int;
  dup_count int;
  r public.user_reports;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน'; END IF;
  IF _target_owner_id IS NOT NULL AND _target_owner_id = uid THEN
    RAISE EXCEPTION 'INVALID: ไม่สามารถรายงานตัวเองได้';
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.user_reports
  WHERE reporter_id = uid AND created_at > now() - interval '10 minutes';
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งรายงานเร็วเกินไป กรุณารอสักครู่แล้วลองใหม่';
  END IF;

  SELECT COUNT(*) INTO dup_count
  FROM public.user_reports
  WHERE reporter_id = uid
    AND target_type = _target_type
    AND target_id = _target_id
    AND created_at > now() - interval '1 hour';
  IF dup_count >= 1 THEN
    RAISE EXCEPTION 'DUPLICATE: คุณได้รายงานสิ่งนี้ไปแล้ว ทีมงานกำลังตรวจสอบ';
  END IF;

  INSERT INTO public.user_reports(
    reporter_id, target_type, target_id, target_owner_id,
    reason, details, evidence_urls, evidence_files
  ) VALUES (
    uid, _target_type, _target_id, _target_owner_id,
    _reason, COALESCE(_details,''), COALESCE(_evidence_urls,'{}'::text[]),
    COALESCE(_evidence_files,'[]'::jsonb)
  ) RETURNING * INTO r;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.create_report(text,uuid,uuid,text,text,text[],jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_report(text,uuid,uuid,text,text,text[],jsonb) TO authenticated;

-- 5. RPC: submit_feedback with rate limit
CREATE OR REPLACE FUNCTION public.submit_feedback(
  _feature text,
  _route text,
  _rating int,
  _message text,
  _project_id uuid,
  _user_agent text,
  _viewport text
) RETURNS public.app_feedback
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  recent_min int;
  recent_hour int;
  f public.app_feedback;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน'; END IF;
  IF _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'INVALID: คะแนนต้องอยู่ระหว่าง 1-5'; END IF;

  SELECT COUNT(*) INTO recent_min FROM public.app_feedback
  WHERE user_id = uid AND created_at > now() - interval '1 minute';
  IF recent_min >= 1 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งฟีดแบ็กเร็วเกินไป กรุณารอสักครู่';
  END IF;

  SELECT COUNT(*) INTO recent_hour FROM public.app_feedback
  WHERE user_id = uid AND created_at > now() - interval '1 hour';
  IF recent_hour >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งฟีดแบ็กถึงขีดจำกัดต่อชั่วโมงแล้ว';
  END IF;

  INSERT INTO public.app_feedback(
    user_id, feature, route, rating, message, project_id, user_agent, viewport
  ) VALUES (
    uid, COALESCE(_feature,'general'), COALESCE(_route,''), _rating,
    COALESCE(_message,''), _project_id,
    COALESCE(LEFT(_user_agent,500),''), COALESCE(_viewport,'')
  ) RETURNING * INTO f;
  RETURN f;
END $$;

REVOKE ALL ON FUNCTION public.submit_feedback(text,text,int,text,uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_feedback(text,text,int,text,uuid,text,text) TO authenticated;

-- 6. Admin notification triggers
CREATE OR REPLACE FUNCTION public.notify_admins_on_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, shared AS $$
DECLARE v_admin uuid;
BEGIN
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    PERFORM shared.push_notification(
      v_admin, 'anthem', 'new_report',
      'มีรายงานใหม่',
      'เหตุผล: ' || COALESCE(NEW.reason,'') || ' • ' || COALESCE(NEW.target_type,''),
      '/admin/reports',
      jsonb_build_object('report_id', NEW.id, 'target_type', NEW.target_type, 'target_id', NEW.target_id)
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_report ON public.user_reports;
CREATE TRIGGER trg_notify_admins_report AFTER INSERT ON public.user_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_report();

CREATE OR REPLACE FUNCTION public.notify_admins_on_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, shared AS $$
DECLARE v_admin uuid;
BEGIN
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    PERFORM shared.push_notification(
      v_admin, 'anthem', 'new_feedback',
      'มีฟีดแบ็กใหม่ (' || NEW.rating::text || '★)',
      COALESCE(NULLIF(NEW.message,''), NEW.feature),
      '/admin/feedback',
      jsonb_build_object('feedback_id', NEW.id, 'feature', NEW.feature, 'rating', NEW.rating)
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_feedback ON public.app_feedback;
CREATE TRIGGER trg_notify_admins_feedback AFTER INSERT ON public.app_feedback
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_feedback();
