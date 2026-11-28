-- Redesign step 7 (Login + Settings), owner-approved 2026-11-27/28:
--   1. Handle lock is 30 days (mock Settings: "เปลี่ยนแล้วล็อก 30 วัน"); it was 60.
--   2. New sign-ups get an automatic ID "sc" + 6 random a–z/0–9 characters as their handle (mock Login:
--      "ID อัตโนมัติ") instead of the e-mail name, which showed part of the e-mail address in public URLs.
--      Existing handles stay as they are. A username passed in the sign-up metadata is still used.
--   3. The first-login welcome step (name + CATEGORY) does not start the 30-day display-name lock.
-- Rollback: supabase/manual/rollback-20261128140000_redesign_handles_auto_id.sql

-- 1. Handle lock: 30 days. The lock starts only on a change (UPDATE); the automatic ID set at sign-up is free.
CREATE OR REPLACE FUNCTION public.enforce_username_change_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cooldown interval := interval '30 days';
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF OLD.username_changed_at IS NOT NULL
       AND OLD.username_changed_at > (now() - cooldown) THEN
      RAISE EXCEPTION 'USERNAME_COOLDOWN: username can only be changed every 30 days'
        USING ERRCODE = 'P0001';
    END IF;
    NEW.username_changed_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Display name: the welcome step (profile_onboarding_at still empty) neither checks nor starts the lock.
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
    IF OLD.profile_onboarding_at IS NULL THEN
      RETURN NEW;
    END IF;
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

-- 2. Automatic ID for new sign-ups: "sc" + 6 random characters, retried until free.
CREATE OR REPLACE FUNCTION anthem.new_auto_handle()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $function$
DECLARE
  alphabet constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  candidate text;
BEGIN
  FOR attempt IN 1..20 LOOP
    candidate := 'sc';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * 36)::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.username) = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
  RETURN 'sc' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
END;
$function$;

REVOKE ALL ON FUNCTION anthem.new_auto_handle() FROM PUBLIC, anon, authenticated;

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
    coalesce(nullif(btrim(meta->>'username'), ''), anthem.new_auto_handle()),
    coalesce(nullif(meta->>'avatar_url', ''), nullif(meta->>'picture', '')),
    now(), now()
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;
