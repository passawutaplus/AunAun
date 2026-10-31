-- Tell people who saved a package when it gets cheaper or opens again.
-- Writes to the shared inbox (shared.notifications); never blocks the package update itself.

CREATE OR REPLACE FUNCTION anthem.notify_saved_package_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  old_start numeric;
  new_start numeric;
  v_title text;
  v_body text;
BEGIN
  old_start := CASE WHEN COALESCE(OLD.price_min_thb, 0) > 0 THEN OLD.price_min_thb ELSE COALESCE(OLD.price_thb, 0) END;
  new_start := CASE WHEN COALESCE(NEW.price_min_thb, 0) > 0 THEN NEW.price_min_thb ELSE COALESCE(NEW.price_thb, 0) END;

  IF NEW.status = 'Published' AND OLD.status IS DISTINCT FROM 'Published' THEN
    v_title := 'แพ็กเกจที่คุณบันทึกกลับมาเปิดแล้ว';
    v_body := NEW.title;
  ELSIF NEW.status = 'Published' AND old_start > 0 AND new_start > 0 AND new_start < old_start THEN
    v_title := 'แพ็กเกจที่คุณบันทึกลดราคา';
    v_body := NEW.title || ' — เริ่มต้น ฿' || trim(to_char(new_start, 'FM999,999,999')) ||
              ' (จาก ฿' || trim(to_char(old_start, 'FM999,999,999')) || ')';
  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    SELECT b.user_id, 'anthem', 'package_update', v_title, v_body, '/service/' || NEW.id::text,
           jsonb_build_object('service_id', NEW.id)
    FROM anthem.creator_service_bookmarks b
    WHERE b.service_id = NEW.id
      AND b.user_id <> NEW.owner_id;
  EXCEPTION WHEN OTHERS THEN
    -- A notification problem must never stop the owner from editing their package.
    RAISE WARNING 'notify_saved_package_changes failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION anthem.notify_saved_package_changes() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_notify_saved_package_changes ON anthem.creator_services;
CREATE TRIGGER trg_notify_saved_package_changes
  AFTER UPDATE OF status, price_thb, price_min_thb ON anthem.creator_services
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_saved_package_changes();
