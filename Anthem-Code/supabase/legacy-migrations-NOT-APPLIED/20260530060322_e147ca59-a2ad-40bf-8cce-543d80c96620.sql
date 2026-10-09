-- Phase 3b: Wire existing Anthem events into shared.notifications

-- 1) New hire request → notify the freelancer
CREATE OR REPLACE FUNCTION public.notify_on_hire_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  PERFORM shared.push_notification(
    NEW.freelancer_id,
    'anthem',
    'hire_request',
    'มีคำขอจ้างงานใหม่',
    COALESCE(NEW.client_name, '') || ' ส่งคำขอจ้างงาน: ' || COALESCE(NEW.project_title,''),
    '/hire-requests',
    jsonb_build_object('request_id', NEW.id, 'project_title', NEW.project_title)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_hire_request ON public.hiring_requests;
CREATE TRIGGER trg_notify_hire_request
  AFTER INSERT ON public.hiring_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_hire_request();

-- 2) New collab request → notify the recipient
CREATE OR REPLACE FUNCTION public.notify_on_collab_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  v_sender_name text;
BEGIN
  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  PERFORM shared.push_notification(
    NEW.recipient_id,
    'anthem',
    'collab_request',
    'มีคำขอร่วมงานใหม่',
    COALESCE(v_sender_name,'มีคน') || ' ส่งคำขอร่วมงานถึงคุณ',
    '/collab-requests',
    jsonb_build_object('request_id', NEW.id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_collab_request ON public.collab_requests;
CREATE TRIGGER trg_notify_collab_request
  AFTER INSERT ON public.collab_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_collab_request();

-- 3) New job application → notify all studio admins (or the job poster)
CREATE OR REPLACE FUNCTION public.notify_on_job_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  v_job record;
  v_admin uuid;
  v_applicant_name text;
BEGIN
  SELECT id, title, studio_id, posted_by INTO v_job FROM public.job_posts WHERE id = NEW.job_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT display_name INTO v_applicant_name FROM public.profiles WHERE id = NEW.applicant_id;

  IF v_job.studio_id IS NOT NULL THEN
    FOR v_admin IN
      SELECT user_id FROM public.studio_members
      WHERE studio_id = v_job.studio_id AND role IN ('owner','admin')
    LOOP
      PERFORM shared.push_notification(
        v_admin,
        'anthem',
        'job_application',
        'มีผู้สมัครงานใหม่',
        COALESCE(v_applicant_name,'มีคน') || ' สมัคร: ' || COALESCE(v_job.title,''),
        '/jobs/' || v_job.id::text,
        jsonb_build_object('application_id', NEW.id, 'job_id', v_job.id)
      );
    END LOOP;
  ELSE
    PERFORM shared.push_notification(
      v_job.posted_by,
      'anthem',
      'job_application',
      'มีผู้สมัครงานใหม่',
      COALESCE(v_applicant_name,'มีคน') || ' สมัคร: ' || COALESCE(v_job.title,''),
      '/jobs/' || v_job.id::text,
      jsonb_build_object('application_id', NEW.id, 'job_id', v_job.id)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_job_application ON public.job_applications;
CREATE TRIGGER trg_notify_job_application
  AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_job_application();

-- 4) New chat message → notify the other participant
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  v_conv record;
  v_recipient uuid;
  v_sender_name text;
  v_preview text;
BEGIN
  SELECT client_id, freelancer_id, project_title INTO v_conv
    FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_recipient := CASE WHEN NEW.sender_id = v_conv.client_id THEN v_conv.freelancer_id ELSE v_conv.client_id END;
  IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN RETURN NEW; END IF;

  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  v_preview := CASE WHEN length(COALESCE(NEW.content,'')) > 80 THEN substring(NEW.content from 1 for 80) || '…' ELSE COALESCE(NEW.content,'(ไฟล์แนบ)') END;

  PERFORM shared.push_notification(
    v_recipient,
    'anthem',
    'new_message',
    COALESCE(v_sender_name,'มีข้อความใหม่'),
    v_preview,
    '/chat/' || NEW.conversation_id::text,
    jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();