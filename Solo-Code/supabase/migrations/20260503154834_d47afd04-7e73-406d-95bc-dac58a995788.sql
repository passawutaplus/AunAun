CREATE OR REPLACE FUNCTION public.log_slip_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.job_events (job_id, kind, title, note, image_url)
    VALUES (NEW.job_id, 'slip_uploaded', 'ลูกค้าอัปโหลดสลิป — รอตรวจสอบ', COALESCE(NEW.note, ''), NEW.slip_url);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.verified = true AND OLD.verified = false THEN
      INSERT INTO public.job_events (job_id, kind, title, note, image_url)
      VALUES (NEW.job_id, 'slip_verified', 'ยืนยันรับเงินจากสลิปแล้ว ✓', '', NEW.slip_url);
    ELSIF NEW.rejected = true AND OLD.rejected = false THEN
      INSERT INTO public.job_events (job_id, kind, title, note, image_url)
      VALUES (NEW.job_id, 'slip_rejected', 'สลิปถูกปฏิเสธ', COALESCE(NEW.rejection_reason, ''), NEW.slip_url);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_slip_insert ON public.job_slips;
CREATE TRIGGER trg_log_slip_insert
AFTER INSERT ON public.job_slips
FOR EACH ROW EXECUTE FUNCTION public.log_slip_event();

DROP TRIGGER IF EXISTS trg_log_slip_update ON public.job_slips;
CREATE TRIGGER trg_log_slip_update
AFTER UPDATE ON public.job_slips
FOR EACH ROW EXECUTE FUNCTION public.log_slip_event();