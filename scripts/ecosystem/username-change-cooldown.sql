-- Username change cooldown (14 days between handle changes).
-- First change after signup is always allowed (username_changed_at IS NULL).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

COMMENT ON COLUMN public.profiles.username_changed_at IS
  'Last time the user changed username; enforces a 14-day cooldown.';

CREATE OR REPLACE FUNCTION public.enforce_username_change_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cooldown interval := interval '14 days';
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF OLD.username_changed_at IS NOT NULL
       AND OLD.username_changed_at > (now() - cooldown) THEN
      RAISE EXCEPTION 'USERNAME_COOLDOWN: username can only be changed every 14 days'
        USING ERRCODE = 'P0001';
    END IF;
    NEW.username_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_username_change_cooldown ON public.profiles;
CREATE TRIGGER trg_username_change_cooldown
  BEFORE UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_username_change_cooldown();