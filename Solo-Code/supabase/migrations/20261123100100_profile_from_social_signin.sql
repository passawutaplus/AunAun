-- New accounts from Google / LINE / Facebook / Apple start with the name and profile picture of that sign-in,
-- like most apps do. Before this the trigger only read user_metadata.display_name and the e-mail prefix, so a
-- LINE account (LINE gives no e-mail) started without a name, username or picture.
--
-- Supabase puts the provider's profile in raw_user_meta_data: full_name / name, and avatar_url / picture
-- (LINE: name + picture on profile.line-scdn.net; Facebook: picture on platform-lookaside.fbsbx.com, a signed URL
-- that expires after some weeks, after which the site shows the initials until the person uploads a picture).
-- The person can change both later; nothing is overwritten after the account exists.

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
    NEW.id,
    NEW.id,
    left(coalesce(
      nullif(btrim(meta->>'display_name'), ''),
      nullif(btrim(meta->>'full_name'), ''),
      nullif(btrim(meta->>'name'), ''),
      email_name,
      'SAMECOR creator'
    ), 80),
    NEW.email,
    coalesce(
      nullif(btrim(meta->>'username'), ''),
      email_name || '_' || substr(NEW.id::text, 1, 6),
      'user_' || substr(replace(NEW.id::text, '-', ''), 1, 10)
    ),
    coalesce(
      nullif(meta->>'avatar_url', ''),
      nullif(meta->>'picture', '')
    ),
    now(),
    now()
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Accounts that already signed up with LINE or Facebook and have no picture yet get the one from that sign-in.
-- Google accounts are left as they are: their owners never saw their Google photo on SAMECOR before.
UPDATE public.profiles p
SET avatar_url = coalesce(nullif(u.raw_user_meta_data->>'avatar_url', ''), nullif(u.raw_user_meta_data->>'picture', '')),
    updated_at = now()
FROM auth.users u
WHERE u.id = p.user_id
  AND u.raw_app_meta_data->>'provider' IN ('custom:line', 'facebook')
  AND coalesce(p.avatar_url, '') = ''
  AND coalesce(nullif(u.raw_user_meta_data->>'avatar_url', ''), nullif(u.raw_user_meta_data->>'picture', '')) IS NOT NULL;
