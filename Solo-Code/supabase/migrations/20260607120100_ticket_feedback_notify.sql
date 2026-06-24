-- Feedback-aware ticket status notifications

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

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_ticket_status_change() FROM PUBLIC, anon, authenticated;
