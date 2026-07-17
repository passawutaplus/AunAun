-- Frontend production gap fix (Aplus1 UX test 2026-07)
-- Run after chat-phase2.sql and jobs-2.sql on the unified Supabase project.
-- Adds objects the Anthem client expects but were missing from production.

-- ========== avatar_pool ==========
CREATE TABLE IF NOT EXISTS public.avatar_pool (
  id serial PRIMARY KEY,
  url text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS avatar_pool_active_idx ON public.avatar_pool (active) WHERE active = true;

GRANT SELECT ON public.avatar_pool TO anon, authenticated;
GRANT ALL ON public.avatar_pool TO service_role;

ALTER TABLE public.avatar_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avatar_pool public read" ON public.avatar_pool;
CREATE POLICY "avatar_pool public read"
  ON public.avatar_pool FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "avatar_pool service manage" ON public.avatar_pool;
CREATE POLICY "avatar_pool service manage"
  ON public.avatar_pool FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.pick_avatar_pool_url_by_seed(_seed text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT url
  FROM public.avatar_pool
  WHERE active = true
  ORDER BY abs(hashtext(coalesce(_seed, '')) + id) % greatest((SELECT count(*)::int FROM public.avatar_pool WHERE active = true), 1)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.pick_avatar_pool_url_by_seed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pick_avatar_pool_url_by_seed(text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.assign_my_default_avatar();
CREATE OR REPLACE FUNCTION public.assign_my_default_avatar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _url text;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND coalesce(trim(avatar_url), '') <> '') THEN
    RETURN;
  END IF;
  SELECT public.pick_avatar_pool_url_by_seed(_uid::text) INTO _url;
  IF _url IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET avatar_url = _url, updated_at = now() WHERE user_id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_my_default_avatar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_my_default_avatar() TO authenticated, service_role;

-- ========== analytics RPCs ==========
DROP FUNCTION IF EXISTS public.increment_project_view(uuid);
CREATE OR REPLACE FUNCTION public.increment_project_view(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  UPDATE anthem.projects
  SET views = coalesce(views, 0) + 1
  WHERE id = _project_id
    AND status = 'Published';
END;
$$;

REVOKE ALL ON FUNCTION public.increment_project_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_project_view(uuid) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.public_feed_stats();
CREATE OR REPLACE FUNCTION public.public_feed_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  WITH counts AS (
    SELECT
      (SELECT count(*)::int FROM public.profiles) AS designers,
      (SELECT count(*)::int FROM anthem.projects WHERE status = 'Published') AS projects,
      (SELECT count(*)::int FROM anthem.hiring_requests) AS hires,
      (
        SELECT count(*)::int
        FROM anthem.projects
        WHERE status = 'Published'
          AND cardinality(collab_user_ids) > 0
      ) AS successful_collabs
  )
  SELECT jsonb_build_object(
    'designers', designers,
    'projects', projects,
    'hires', hires,
    'successful_collabs', successful_collabs,
    'collabs', successful_collabs
  )
  FROM counts;
$$;

REVOKE ALL ON FUNCTION public.public_feed_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_feed_stats() TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.mark_onboarding_visit(text);
CREATE OR REPLACE FUNCTION public.mark_onboarding_visit(_visit_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _visits jsonb;
BEGIN
  IF _uid IS NULL OR _visit_id IS NULL OR length(trim(_visit_id)) = 0 THEN RETURN; END IF;
  SELECT coalesce(onboarding_visits, '{}'::jsonb) INTO _visits FROM public.profiles WHERE user_id = _uid;
  IF _visits IS NULL THEN RETURN; END IF;
  _visits := _visits || jsonb_build_object(_visit_id, true);
  UPDATE public.profiles SET onboarding_visits = _visits, updated_at = now() WHERE user_id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_onboarding_visit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_onboarding_visit(text) TO authenticated, service_role;

-- ========== collab_requests ==========
DO $$ BEGIN
  CREATE TYPE public.collab_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS anthem.collab_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text,
  collab_types text[] NOT NULL DEFAULT '{}',
  message text NOT NULL,
  attached_project_ids text[] NOT NULL DEFAULT '{}',
  external_drive_url text,
  website_url text,
  other_type_note text,
  status public.collab_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collab_requests_recipient_idx ON anthem.collab_requests (recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS collab_requests_sender_idx ON anthem.collab_requests (sender_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON anthem.collab_requests TO authenticated;
GRANT ALL ON anthem.collab_requests TO service_role;
ALTER TABLE anthem.collab_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collab participants read" ON anthem.collab_requests;
CREATE POLICY "collab participants read"
  ON anthem.collab_requests FOR SELECT TO authenticated
  USING (auth.uid() IN (sender_id, recipient_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "collab sender insert" ON anthem.collab_requests;
CREATE POLICY "collab sender insert"
  ON anthem.collab_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

DROP POLICY IF EXISTS "collab recipient update" ON anthem.collab_requests;
DROP POLICY IF EXISTS "collab participants update" ON anthem.collab_requests;
CREATE POLICY "collab participants update"
  ON anthem.collab_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = recipient_id
    OR auth.uid() = sender_id
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = recipient_id
    OR auth.uid() = sender_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- ========== ecosystem_notifications view ==========
DO $$ BEGIN
  CREATE TYPE public.app_notification_app AS ENUM ('anthem', 'so1o', 'shared');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS shared.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app text NOT NULL DEFAULT 'anthem',
  kind text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON shared.notifications (user_id, is_dismissed, created_at DESC);

GRANT SELECT, UPDATE ON shared.notifications TO authenticated;
GRANT ALL ON shared.notifications TO service_role;
ALTER TABLE shared.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications own read" ON shared.notifications;
CREATE POLICY "notifications own read"
  ON shared.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications own update" ON shared.notifications;
CREATE POLICY "notifications own update"
  ON shared.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.ecosystem_notifications AS
  SELECT * FROM shared.notifications;

GRANT SELECT, UPDATE ON public.ecosystem_notifications TO authenticated;

-- ========== portfolio owner guard (defense in depth) ==========
DROP POLICY IF EXISTS "projects owner update" ON anthem.projects;
CREATE POLICY "projects owner update"
  ON anthem.projects FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "projects owner delete" ON anthem.projects;
CREATE POLICY "projects owner delete"
  ON anthem.projects FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ========== atomic group chat creation ==========
CREATE OR REPLACE FUNCTION public.create_group_conversation(p_title text, p_member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _conv_id uuid;
  _member uuid;
  _all_members uuid[];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_title IS NULL OR length(trim(p_title)) < 1 OR length(trim(p_title)) > 100 THEN
    RAISE EXCEPTION 'INVALID_TITLE';
  END IF;

  _all_members := array(SELECT DISTINCT unnest(coalesce(p_member_ids, '{}'::uuid[])));
  _all_members := array_remove(_all_members, _uid);

  IF coalesce(array_length(_all_members, 1), 0) < 1 THEN
    RAISE EXCEPTION 'NEED_OTHER_MEMBERS';
  END IF;
  IF coalesce(array_length(_all_members, 1), 0) > 49 THEN
    RAISE EXCEPTION 'TOO_MANY_MEMBERS';
  END IF;

  INSERT INTO shared.conversations (
    kind, conversation_type, title, created_by,
    client_id, freelancer_id, last_message_at
  )
  VALUES (
    'group', 'group', trim(p_title), _uid,
    _uid, _uid, now()
  )
  RETURNING id INTO _conv_id;

  INSERT INTO shared.conversation_members (conversation_id, user_id, joined_at)
  VALUES (_conv_id, _uid, now())
  ON CONFLICT DO NOTHING;

  FOREACH _member IN ARRAY _all_members LOOP
    INSERT INTO shared.conversation_members (conversation_id, user_id, joined_at)
    VALUES (_conv_id, _member, now())
    ON CONFLICT DO NOTHING;
  END LOOP;

  IF NOT shared.user_in_conversation(_conv_id, _uid) THEN
    RAISE EXCEPTION 'CREATOR_NOT_MEMBER';
  END IF;

  RETURN _conv_id;
EXCEPTION
  WHEN OTHERS THEN
    IF _conv_id IS NOT NULL THEN
      DELETE FROM shared.conversation_members WHERE conversation_id = _conv_id;
      DELETE FROM shared.conversations WHERE id = _conv_id;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated, service_role;
