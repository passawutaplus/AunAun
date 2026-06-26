-- Auto-create public.profiles when auth.users row is inserted (Google OAuth, email signup).
-- Fixes "บันทึกไม่สำเร็จ" on feed interest survey when profile row was missing.

CREATE OR REPLACE FUNCTION anthem.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'anthem', 'shared', 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, user_id, display_name, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)),
    now(),
    now()
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION anthem.handle_new_user();

-- One-time backfill (safe to re-run):
INSERT INTO public.profiles (id, user_id, display_name, email, username, created_at, updated_at)
SELECT
  u.id,
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  u.email,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1) || '_' || substr(u.id::text, 1, 6)),
  now(),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;
