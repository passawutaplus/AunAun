-- "Adopted" feedback notifications linked to /changelog, which the new design removed (404).
-- They now open /me/feedback like every other feedback status, and the default text no longer
-- points to the update page. Existing notification rows get the same link and text.
-- Same body as 20261019090000_feedback_notify.sql except those two lines.

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
      WHEN 'adopted' THEN 'ขอบคุณที่ช่วยกันสร้าง SAMECOR นะ'
      WHEN 'resolved' THEN 'ลองใช้อีกครั้งได้เลย ถ้ายังเจอปัญหาบอกเราได้ทุกเมื่อ'
      ELSE 'ขอบคุณที่ส่งความคิดเห็นมา'
    END
  );

  INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
  VALUES (
    NEW.user_id, 'anthem', 'feedback_status', v_title, left(v_body, 300),
    '/me/feedback',
    jsonb_build_object('feedback_id', NEW.id, 'status', NEW.status)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION anthem.notify_feedback_status_change() FROM PUBLIC, anon, authenticated;

-- Rows already sent: same link, and the old default text without "the update page".
UPDATE shared.notifications
SET link = '/me/feedback'
WHERE app = 'anthem'
  AND kind = 'feedback_status'
  AND link = '/changelog';

UPDATE shared.notifications
SET body = 'ขอบคุณที่ช่วยกันสร้าง SAMECOR นะ'
WHERE app = 'anthem'
  AND kind = 'feedback_status'
  AND body = 'ขอบคุณที่ช่วยกันสร้าง SAMECOR — ดูได้ในหน้าอัปเดตล่าสุด';
