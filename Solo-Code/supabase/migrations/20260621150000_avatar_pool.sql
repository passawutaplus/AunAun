-- AI avatar pool: pre-generated illustrations assigned on signup when no OAuth photo.

CREATE TABLE IF NOT EXISTS public.avatar_pool (
  id serial PRIMARY KEY,
  url text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS avatar_pool_active_idx ON public.avatar_pool (active) WHERE active = true;

ALTER TABLE public.avatar_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active avatar pool" ON public.avatar_pool;
CREATE POLICY "Anyone can read active avatar pool"
  ON public.avatar_pool FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Service role manages avatar pool" ON public.avatar_pool;
CREATE POLICY "Service role manages avatar pool"
  ON public.avatar_pool FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.pick_random_avatar_url()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT url
    FROM public.avatar_pool
   WHERE active = true
   ORDER BY random()
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.pick_random_avatar_url() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_random_avatar_url() TO service_role;

CREATE OR REPLACE FUNCTION public.assign_my_default_avatar()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  picked text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT avatar_url INTO picked
    FROM public.profiles
   WHERE user_id = auth.uid();

  IF picked IS NOT NULL AND picked <> '' THEN
    RETURN picked;
  END IF;

  picked := public.pick_random_avatar_url();
  IF picked IS NULL OR picked = '' THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
     SET avatar_url = picked
   WHERE user_id = auth.uid()
     AND (avatar_url IS NULL OR avatar_url = '');

  RETURN picked;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_my_default_avatar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_my_default_avatar() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _display_name text;
  _avatar_url text;
  _username text;
BEGIN
  _display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  _avatar_url := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );

  IF _avatar_url IS NULL OR _avatar_url = '' THEN
    _avatar_url := COALESCE(public.pick_random_avatar_url(), '');
  END IF;

  _username := NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), '');
  IF _username IS NULL AND NEW.email IS NOT NULL THEN
    _username := split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6);
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, avatar_url, username)
  VALUES (NEW.id, NEW.email, _display_name, COALESCE(_avatar_url, ''), _username)
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.profiles.display_name),
    avatar_url = CASE
      WHEN public.profiles.avatar_url IS NULL OR public.profiles.avatar_url = ''
        THEN EXCLUDED.avatar_url
      ELSE public.profiles.avatar_url
    END,
    username = COALESCE(public.profiles.username, EXCLUDED.username);

  IF NEW.email = 'passawut.a.plus@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.pick_avatar_pool_url_by_seed(_seed text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n int;
  _off int;
  _url text;
BEGIN
  SELECT GREATEST(count(*)::int, 1) INTO _n FROM public.avatar_pool WHERE active = true;
  _off := abs(hashtext(COALESCE(_seed, ''))) % _n;
  SELECT url INTO _url
    FROM public.avatar_pool
   WHERE active = true
   ORDER BY id
   OFFSET _off
   LIMIT 1;
  RETURN _url;
END;
$$;

REVOKE ALL ON FUNCTION public.pick_avatar_pool_url_by_seed(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_avatar_pool_url_by_seed(text) TO service_role;

-- Backfill empty or DiceBear avatars when pool is populated
UPDATE public.profiles
   SET avatar_url = public.pick_avatar_pool_url_by_seed(COALESCE(username, user_id::text))
 WHERE (avatar_url IS NULL OR avatar_url = '' OR avatar_url LIKE '%dicebear.com%')
   AND EXISTS (SELECT 1 FROM public.avatar_pool WHERE active = true LIMIT 1);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'studios'
  ) THEN
    UPDATE public.studios
       SET avatar_url = public.pick_avatar_pool_url_by_seed('studio-' || slug)
     WHERE (avatar_url IS NULL OR avatar_url = '' OR avatar_url LIKE '%dicebear.com%')
       AND EXISTS (SELECT 1 FROM public.avatar_pool WHERE active = true LIMIT 1);
  END IF;
END $$;
