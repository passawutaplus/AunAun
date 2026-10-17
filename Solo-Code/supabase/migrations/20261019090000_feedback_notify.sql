-- Phase D: feedback notifications (in-app, shared.notifications).
-- 1) Admins get `admin_feedback` on every new feedback (useAdminAlertWatcher toasts `admin_*`).
-- 2) The sender gets `feedback_status` when an admin moves it to reviewing / adopted / resolved / dismissed.
-- The old anthem.notify_admins_on_feedback / public._trg_admin_alert_feedback were never attached
-- (and called a missing shared.push_notification) — replaced here.

DROP FUNCTION IF EXISTS public._trg_admin_alert_feedback();

CREATE OR REPLACE FUNCTION anthem.feedback_kind_label(_kind text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _kind
    WHEN 'praise' THEN 'ชอบ'
    WHEN 'idea' THEN 'ไอเดีย'
    WHEN 'bug' THEN 'เจอบั๊ก'
    WHEN 'error' THEN 'พังทั้งหน้า'
    WHEN 'ux' THEN 'ใช้ยาก'
    ELSE 'คะแนน'
  END;
$$;

CREATE OR REPLACE FUNCTION anthem.notify_admins_on_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'shared', 'public'
AS $$
DECLARE
  v_admin uuid;
  v_title text;
BEGIN
  v_title := 'ฟีดแบ็กใหม่: ' || anthem.feedback_kind_label(NEW.kind)
    || CASE WHEN NEW.rating IS NOT NULL THEN ' (' || NEW.rating::text || '★)' ELSE '' END
    || CASE WHEN COALESCE(NEW.ticket_number, '') <> '' THEN ' · ' || NEW.ticket_number ELSE '' END;
  FOR v_admin IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'admin'::app_role AND user_id <> NEW.user_id
  LOOP
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    VALUES (
      v_admin, 'anthem', 'admin_feedback', v_title,
      left(COALESCE(NULLIF(btrim(NEW.message), ''), NEW.route, NEW.feature, ''), 200),
      '/admin/feedback',
      jsonb_build_object('feedback_id', NEW.id, 'kind', NEW.kind, 'rating', NEW.rating, 'route', NEW.route)
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block a submission over a notification
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION anthem.notify_feedback_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'shared', 'public'
AS $$
DECLARE
  v_title text;
  v_body text;
  v_ref text := CASE WHEN COALESCE(NEW.ticket_number, '') <> '' THEN ' ' || NEW.ticket_number ELSE '' END;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_title := CASE NEW.status
    WHEN 'reviewing' THEN 'ทีมงานกำลังดูฟีดแบ็ก' || v_ref
    WHEN 'adopted' THEN 'ไอเดียของคุณถูกนำไปใช้แล้ว 🎉'
    WHEN 'resolved' THEN 'แก้ตามฟีดแบ็ก' || v_ref || ' แล้ว'
    WHEN 'dismissed' THEN 'ปิดฟีดแบ็ก' || v_ref || ' แล้ว'
    ELSE NULL
  END;
  IF v_title IS NULL THEN
    RETURN NEW;
  END IF;

  v_body := COALESCE(
    NULLIF(btrim(NEW.admin_note), ''),
    CASE NEW.status
      WHEN 'reviewing' THEN 'ขอบคุณที่บอกเรา — จะแจ้งอีกครั้งเมื่อมีความคืบหน้า'
      WHEN 'adopted' THEN 'ขอบคุณที่ช่วยกันสร้าง SAMECOR — ดูได้ในหน้าอัปเดตล่าสุด'
      WHEN 'resolved' THEN 'ลองใช้อีกครั้งได้เลย ถ้ายังเจอปัญหาบอกเราได้ทุกเมื่อ'
      ELSE 'ขอบคุณที่ส่งความคิดเห็นมา'
    END
  );

  INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
  VALUES (
    NEW.user_id, 'anthem', 'feedback_status', v_title, left(v_body, 300),
    CASE WHEN NEW.status = 'adopted' THEN '/changelog' ELSE '/me/feedback' END,
    jsonb_build_object('feedback_id', NEW.id, 'status', NEW.status)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION anthem.notify_admins_on_feedback() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION anthem.notify_feedback_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_feedback_notify_admins ON anthem.app_feedback;
CREATE TRIGGER trg_feedback_notify_admins
  AFTER INSERT ON anthem.app_feedback
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_admins_on_feedback();

DROP TRIGGER IF EXISTS trg_feedback_status_notify ON anthem.app_feedback;
CREATE TRIGGER trg_feedback_status_notify
  AFTER UPDATE OF status ON anthem.app_feedback
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_feedback_status_change();
