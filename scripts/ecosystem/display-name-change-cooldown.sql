-- Display name change cooldown (30 days) + admin activity event.
-- Keep in sync with Anthem-Code/src/lib/displayNamePolicy.ts

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name_changed_at timestamptz;

COMMENT ON COLUMN public.profiles.display_name_changed_at IS
  'Last time the user changed display_name; enforces a 30-day cooldown.';

CREATE OR REPLACE FUNCTION public.enforce_display_name_change_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cooldown interval := interval '30 days';
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    IF OLD.display_name_changed_at IS NOT NULL
       AND OLD.display_name_changed_at > (now() - cooldown) THEN
      RAISE EXCEPTION 'DISPLAY_NAME_COOLDOWN: display name can only be changed every 30 days'
        USING ERRCODE = 'P0001';
    END IF;
    NEW.display_name_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_display_name_change_cooldown ON public.profiles;
CREATE TRIGGER trg_display_name_change_cooldown
  BEFORE UPDATE OF display_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_display_name_change_cooldown();

CREATE OR REPLACE FUNCTION public.log_display_name_change_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    BEGIN
      INSERT INTO public.platform_events (event_type, actor_id, target_type, target_id, metadata)
      VALUES (
        'user.display_name_change',
        NEW.user_id,
        'user',
        NEW.user_id,
        jsonb_build_object(
          'from', OLD.display_name,
          'to', NEW.display_name,
          'title', format('%s → %s', COALESCE(OLD.display_name, '—'), COALESCE(NEW.display_name, '—'))
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_display_name_change_event ON public.profiles;
CREATE TRIGGER trg_log_display_name_change_event
  AFTER UPDATE OF display_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_display_name_change_event();
