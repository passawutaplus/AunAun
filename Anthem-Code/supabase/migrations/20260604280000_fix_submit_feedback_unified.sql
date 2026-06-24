-- Fix submit_feedback: unified project stores feedback in anthem.app_feedback
-- PostgREST calls public.submit_feedback (apply via sanitizeBundleSql on remote).

DROP TRIGGER IF EXISTS trg_platform_event_app_feedback ON public.app_feedback;
DROP TRIGGER IF EXISTS trg_notify_admins_feedback ON public.app_feedback;

CREATE OR REPLACE FUNCTION public.submit_feedback(
  _feature text,
  _route text,
  _rating int,
  _message text,
  _project_id uuid,
  _user_agent text,
  _viewport text
)
RETURNS public.app_feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  uid uuid := auth.uid();
  recent_min int;
  recent_hour int;
  f public.app_feedback;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน';
  END IF;
  IF _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'INVALID: คะแนนต้องอยู่ระหว่าง 1-5';
  END IF;

  SELECT COUNT(*) INTO recent_min
  FROM public.app_feedback
  WHERE user_id = uid AND created_at > now() - interval '1 minute';
  IF recent_min >= 1 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งฟีดแบ็กเร็วเกินไป กรุณารอสักครู่';
  END IF;

  SELECT COUNT(*) INTO recent_hour
  FROM public.app_feedback
  WHERE user_id = uid AND created_at > now() - interval '1 hour';
  IF recent_hour >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งฟีดแบ็กถึงขีดจำกัดต่อชั่วโมงแล้ว';
  END IF;

  INSERT INTO public.app_feedback(
    user_id, feature, route, rating, message, project_id, user_agent, viewport
  ) VALUES (
    uid,
    COALESCE(_feature, 'general'),
    COALESCE(_route, ''),
    _rating,
    COALESCE(_message, ''),
    _project_id,
    COALESCE(LEFT(_user_agent, 500), ''),
    COALESCE(_viewport, '')
  )
  RETURNING * INTO f;

  RETURN f;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback(text, text, int, text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_feedback(text, text, int, text, uuid, text, text) TO authenticated;

-- Admin alert on new feedback (self-contained; no dependency on _notify_all_admins)
CREATE OR REPLACE FUNCTION public._trg_admin_alert_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  admin_uid uuid;
BEGIN
  FOR admin_uid IN
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'::app_role
  LOOP
    INSERT INTO shared.notifications(user_id, app, kind, title, body, link, metadata)
    VALUES (
      admin_uid,
      'anthem',
      'admin_feedback',
      format('ฟีดแบ็กใหม่ (%s★)', NEW.rating),
      COALESCE(NULLIF(NEW.message, ''), NEW.feature),
      '/admin/feedback',
      jsonb_build_object('feedback_id', NEW.id, 'feature', NEW.feature, 'rating', NEW.rating)
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_alert_feedback ON public.app_feedback;
CREATE TRIGGER trg_admin_alert_feedback
  AFTER INSERT ON public.app_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_admin_alert_feedback();

-- Platform event log (only if _log_platform_event already deployed)
DO $fb_evt$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = '_log_platform_event'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_platform_event_app_feedback ON public.app_feedback';
    EXECUTE $trg$
      CREATE TRIGGER trg_platform_event_app_feedback
        AFTER INSERT ON public.app_feedback
        FOR EACH ROW
        EXECUTE FUNCTION public._log_platform_event('feedback.created', '')
    $trg$;
  END IF;
END;
$fb_evt$;
