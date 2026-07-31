-- Log username changes into platform_events for admin activity ("คำขอเปลี่ยนชื่อผู้ใช้").
-- Applied remotely via Supabase MCP; keep this file as the repo source of truth.

CREATE OR REPLACE FUNCTION public.log_username_change_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    BEGIN
      INSERT INTO public.platform_events (event_type, actor_id, target_type, target_id, metadata)
      VALUES (
        'user.username_change',
        NEW.user_id,
        'user',
        NEW.user_id,
        jsonb_build_object(
          'from', OLD.username,
          'to', NEW.username,
          'title', format('@%s → @%s', COALESCE(OLD.username, '—'), COALESCE(NEW.username, '—'))
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_username_change_event ON public.profiles;
CREATE TRIGGER trg_log_username_change_event
  AFTER UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_username_change_event();

COMMENT ON FUNCTION public.log_username_change_event() IS
  'Writes platform_events user.username_change for admin activity when a username is changed.';
