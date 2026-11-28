-- Rollback of 20261128140000_redesign_handles_auto_id.sql: 60-day handle lock, e-mail-name handles for new
-- sign-ups, and the display-name lock counting the welcome step again. Handles already given stay as they are.

CREATE OR REPLACE FUNCTION public.enforce_username_change_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cooldown interval := interval '60 days';
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF OLD.username_changed_at IS NOT NULL
       AND OLD.username_changed_at > (now() - cooldown) THEN
      RAISE EXCEPTION 'USERNAME_COOLDOWN: username can only be changed every 60 days'
        USING ERRCODE = 'P0001';
    END IF;
    NEW.username_changed_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_display_name_change_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION anthem.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'shared', 'public'
AS $function$
DECLARE
  meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  email_name text := nullif(split_part(coalesce(NEW.email, ''), '@', 1), '');
BEGIN
  INSERT INTO public.profiles (id, user_id, display_name, email, username, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id, NEW.id,
    left(coalesce(nullif(btrim(meta->>'display_name'), ''), nullif(btrim(meta->>'full_name'), ''),
                  nullif(btrim(meta->>'name'), ''), email_name, 'SAMECOR creator'), 80),
    NEW.email,
    coalesce(nullif(btrim(meta->>'username'), ''), email_name || '_' || substr(NEW.id::text, 1, 6),
             'user_' || substr(replace(NEW.id::text, '-', ''), 1, 10)),
    coalesce(nullif(meta->>'avatar_url', ''), nullif(meta->>'picture', '')),
    now(), now()
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS anthem.new_auto_handle();
